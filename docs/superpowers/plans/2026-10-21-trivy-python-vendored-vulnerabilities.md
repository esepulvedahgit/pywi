# Trivy Python Vendored Vulnerabilities Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the four HIGH Trivy findings reported for both container architectures while keeping the image security gate effective.

**Architecture:** First establish whether the findings come from installed application packages or pip's vendored CycloneDX inventory, then assess whether each vulnerable code path is reachable through PyWI's pip use. Upgrade the installer when upstream provides fixed vendored components; use narrowly scoped VEX only for findings proven not affected. Keep the Docker build and PyWI's runtime package manager on the same installer policy.

**Tech Stack:** Docker Buildx, Python 3.11 `pip`, Trivy v0.76.0, GitHub Actions, Trivy VEX.

**Spec:** Trivy logs supplied by the user for `pywi:security-amd64` and `pywi:security-arm64` on 2026-10-21. Both report Debian and Node findings at zero, and the same four HIGH Python findings: msgpack 1.1.2 / `GHSA-6v7p-g79w-8964` (fixed 1.2.1), setuptools 70.3.0 / `CVE-2025-47273` (fixed 78.1.1), and urllib3 2.7.0 / `CVE-2026-97687` plus `CVE-2026-97689` (both fixed 2.8.0).

## Global Constraints

- Keep the container scan failing on unresolved, fixable HIGH and CRITICAL findings.
- Do not suppress a finding unless its exact component/version and vulnerable code path have been reviewed.
- Scope any VEX statement to the exact vulnerability and pip BOM component; do not skip the full `pip/_vendor/bom.cdx.json` file.
- Preserve PyWI's runtime Python package-management behavior, which currently invokes pip from `server.ts`.
- Apply and verify the resolution for both `linux/amd64` and `linux/arm64`.
- Do not change the Debian base image to address findings that originate in Python package inventory.

## Files and Responsibilities

- `Dockerfile`: builds the runtime `.venv` and upgrades pip/setuptools.
- `server.ts`: invokes pip for package listing, updates, installation, and removal at runtime; it also upgrades pip.
- `.github/workflows/container-security.yml`: builds and scans both architectures; retains the blocking scan.
- `.trivy/trivy.yaml`: current Trivy configuration for Dockerfile and Compose scans.
- `docs/CI-SECURITY.md`: explains the security checks and how to respond to findings.
- `docs/security/trivy-python-vendor-review.md`: new evidence record for the four findings and the remediation decision.
- `.trivy/vex.json`: create only if the review confirms findings that are not affected; use OpenVEX statements scoped to the exact package PURL and version reported by Trivy.

## Review Focus

- **Inventory origin:** distinguish pip's vendored BOM versions from separately installed versions; record the exact image path and BOM reference in the evidence report.
- **urllib3 reachability:** trace pip's HTTP, proxy, and chunk parsing paths against both 2026 advisories; do not classify these as false positives based only on packaging.
- **Runtime pip upgrade:** verify the fix cannot be undone by the `server.ts` pip self-upgrade path or by creating a new virtual environment.
- **Architecture parity:** confirm both builds contain the intended tool versions and produce the same finding disposition.
- **VEX scope:** demonstrate that each exception affects only the reviewed vulnerability/component pair and that an unrelated HIGH finding still fails the gate.

---

### Task 1: Establish the source and applicability of each finding

**Files:**
- Create: `docs/security/trivy-python-vendor-review.md`
- Inspect: `Dockerfile`, `server.ts`, `.github/workflows/container-security.yml`

- [ ] **Step 1: Capture machine-readable Trivy output for both image tags**

Run Trivy v0.76.0 against `pywi:security-amd64` and `pywi:security-arm64` with `--format json --output <report>.json`. Record the component identifier/BOM reference, package version, advisory, and file path for each of the four findings. **Execution status:** amd64 JSON was captured and summarized in `docs/security/trivy-python-vendor-review.md`; arm64 is supported by the CI log supplied by the user, but its JSON was not recaptured locally because the host filesystem ran out of space.

- [x] **Step 2: Compare inventory entries with installed distributions**

Inspect the built image's pip version, pip's `pip/_vendor/bom.cdx.json`, and actual `.venv` distributions. Confirm whether msgpack 1.1.2, setuptools 70.3.0, and urllib3 2.7.0 are only reported as pip-vendored components while the separately installed setuptools version is 84.2.1.

- [x] **Step 3: Trace advisory code paths**

For each advisory, record whether the affected code is present and reachable through PyWI's use of pip. For urllib3, inspect pip's index download and proxy paths, including the vulnerable behavior named in each advisory. Link the upstream advisory and source evidence in the report, including [pip's vendored-library security policy](https://pip.pypa.io/en/stable/topics/security/).

- [x] **Step 4: Record a per-finding disposition**

Use one of: `affected`, `not affected` with evidence, or `unresolved`. Do not proceed with a VEX exception for an `unresolved` finding.

**Acceptance:** the report accounts for all four findings, explains why both architectures match, and gives a cited disposition for each.

**Execution note:** the evidence report covers the original four HIGH findings for both architectures using the amd64 JSON and the supplied arm64 CI log. It also records two MEDIUM findings present in the refreshed amd64 scan. The only outstanding item in this task is a machine-readable arm64 report, which requires host disk space for another image build.

### Task 2: Remediate findings that are reachable

**Files:**
- Modify: `Dockerfile`
- Modify: `server.ts`
- Modify if needed: `README.md` and `docs/CONFIGURATION.md` to document the runtime installer

- [x] **Step 1: Check whether a pip release fixes the vulnerable vendored components**

Inspect the candidate release's own vendor inventory; do not rely only on the top-level pip version. A candidate is sufficient for urllib3 only when its vendored urllib3 is at least 2.8.0, and it must also eliminate any other finding classified as affected.

- [x] **Step 2: Align image and runtime installer versions**

No suitable pip release exists. The Docker image now copies uv 0.13.1 from a multi-architecture image pinned by OCI digest, uses it to build the initial `.venv`, and does not seed pip. `server.ts` uses uv for newly created environments and all package-management operations; its pip self-upgrade path was removed.

- [x] **Step 3: If no suitable pip release exists, evaluate an installer migration before changing behavior**

Reviewed uv's official CLI and inspection docs, then mapped Docker dependency installation and the runtime list, outdated list, install, upgrade, and uninstall operations to `uv pip`. The UI endpoints remain the same. No VEX or broad ignore rule was added.

**Acceptance:** implementation is in place, but remains pending until the updated image is built and scanned and runtime package-management flows are exercised. The root filesystem has 0 bytes available, so those validations could not be performed in this turn. Local execution outside the official container now requires `uv` on `PATH`; `UV_BIN` can point to a custom executable.

### Task 3: Suppress only findings proven not affected

**Files:**
- Create if warranted: `.trivy/vex.json`
- Modify if warranted: `.github/workflows/container-security.yml`
- Modify: `docs/CI-SECURITY.md`

- [ ] **Step 1: Build VEX statements from the evidence report**

For each `not affected` disposition, create an OpenVEX statement scoped to the exact vulnerability and package PURL/version reported by Trivy, following [Trivy's VEX documentation](https://trivy.dev/docs/v0.67/guide/supply-chain/vex/file/). Use a `not_affected` status only when the evidence supports it. Leave `affected` and `unresolved` findings out.

- [ ] **Step 2: Apply VEX to both image scan steps**

Set `TRIVY_VEX: .trivy/vex.json` for both the reporting scan and the blocking scan. Keep the severity and exit-code policy unchanged.

- [ ] **Step 3: Document the policy**

Explain in `docs/CI-SECURITY.md` that VEX is used only for reviewed non-applicable vendored findings, with the evidence report as the source of truth.

**Acceptance:** the VEX-filtered report omits only reviewed vulnerability/component pairs, and an unrelated fixable HIGH finding still produces a failing blocking scan.

**Execution note:** defer VEX creation until Task 4 scans the migrated image. If Trivy no longer reports pip's BOM, these exceptions are unnecessary. If any BOM findings remain, include only the exact component/advisory pairs whose `not affected` disposition is supported by the evidence report.

### Task 4: Verify both images and close the evidence trail

**Files:**
- Verify: `Dockerfile`, `server.ts`, `.github/workflows/container-security.yml`
- Update: `docs/security/trivy-python-vendor-review.md`
- Update: `docs/CI-SECURITY.md`

- [ ] **Step 1: Build and scan both architectures**

Run the existing `Image scan (amd64)` and `Image scan (arm64)` jobs. Confirm that each affected finding is fixed and each VEX disposition matches the reviewed component/version.

- [ ] **Step 2: Check runtime package-management behavior**

Exercise the existing runtime flows that list, install, upgrade, and uninstall Python packages, and confirm they do not restore the vulnerable installer version.

- [ ] **Step 3: Record final versions and scan results**

Update the evidence report with final pip/vendor versions, both scan outcomes, and any VEX entries retained.

**Acceptance:** both architecture scans pass the configured gate, all retained exceptions have evidence, and runtime pip operations preserve the same fixed installer policy.
