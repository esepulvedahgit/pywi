# Package Deletion Feature Design
**Date:** 2026-05-30  
**Feature:** Allow users to select and uninstall Python packages from the virtual environment

---

## Overview

Users can now select one or more installed packages from the Package Manager and delete them. When deleted:
1. Package is uninstalled from the virtual environment via `pip uninstall`
2. Package is removed from `db.json` → `user.packages[]`
3. Package is removed from the in-memory `installedPackagesList`
4. On next login, the package is NOT restored (user must reinstall to get it back)

---

## User Flow

1. Open Package Manager Modal
2. Click checkboxes next to package names (e.g., scipy, pandas)
3. Click "Eliminar seleccionados" button (disabled if no packages selected)
4. Confirmation modal appears: "¿Desinstalar scipy, pandas? Se eliminarán de tu entorno y db.json"
5. User confirms → modal shows progress: "Desinstalando scipy..." with spinner
6. Each package uninstalls sequentially; if one fails, continue with the rest
7. Modal closes, package list refreshes, checkboxes clear
8. Display summary: X packages removed, Y failed (if any)

---

## Technical Implementation

### Frontend: PackageManagerModal.tsx

**New State:**
- `selectedPackages: Set<string>` — tracks checkbox selections by package name

**UI Changes:**
1. In the installed packages list section:
   - Add checkbox before each `<package name>` line
   - Checkbox toggles package name in/out of `selectedPackages`

2. Below the install input section:
   - Add button "Eliminar seleccionados"
   - Button disabled if `selectedPackages.size === 0`
   - Styled consistently with install button (secondary style, red tint)

3. Confirmation Modal (inline conditional render):
   - Overlay blocking the rest of the modal
   - Title: "Confirmar eliminación"
   - Body: "¿Desinstalar {count} librería(s)? Se eliminarán de tu entorno y no se restaurarán en próximos logins.\n\n{packageList}"
   - Buttons: "Cancelar" (closes modal, clears selection), "Eliminar" (calls uninstall handler)

4. Uninstall Progress Modal:
   - Similar to install progress: shows "Desinstalando {packageName}..." with spinner
   - Blocks interaction until complete
   - Displays log output (optional, can be minimal: just package names + checkmarks)

**Handler: `handleUninstallPackages()`**
- Gets selected package names from `selectedPackages`
- Shows confirmation modal
- On confirm:
  - Shows progress modal
  - Calls `POST /api/pip/uninstall` with `{ packageNames: [...] }`
  - On success: clears checkboxes, refreshes package list, shows completion message
  - On partial failure: shows which packages failed, allows retry

---

### Backend: server.ts

**New Endpoint: `POST /api/pip/uninstall`**

```
Requires: Authentication (requireAuth middleware)
Request body: { packageNames: string[] }
Response: { success: boolean, removed: string[], failed: string[] }
```

Logic:
1. Validate `packageNames` array (non-empty, max 20 items)
2. For each package sequentially:
   - Execute `pip uninstall -y <packageName>`
   - If successful:
     - Call `removePackageForUser(userId, packageName)` to remove from db.json
     - Remove from `installedPackagesList` in memory
     - Add to `removed[]` array
   - If failed:
     - Log error, add to `failed[]` array, continue to next

3. Return `{ success: removed.length > 0, removed, failed }`

**Helper Function: `removePackageForUser(userId, packageName)`**

```typescript
const removePackageForUser = (userId: string, packageName: string) => {
  const db = readDB();
  const user = db.users.find(u => u.id === userId);
  if (user && Array.isArray(user.packages)) {
    user.packages = user.packages.filter(
      p => p.toLowerCase() !== packageName.toLowerCase()
    );
    writeDB(db);
  }
};
```

**Update `installedPackagesList` (in-memory):**
- After successful uninstall, filter out the package: 
  ```typescript
  installedPackagesList = installedPackagesList.filter(
    p => p.name.toLowerCase() !== packageName.toLowerCase()
  );
  ```

---

## Error Handling

**Pip Uninstall Failures:**
- If `pip uninstall` fails (e.g., package not found, permission error):
  - Log the error to console
  - Add package name to `failed[]` in response
  - Continue with next package (do not stop)
  - Frontend displays: "Fallo al desinstalar {failedName}: {error}"

**Database Write Failures:**
- If `removePackageForUser()` fails to write db.json:
  - Log error, but still report package as removed (venv is removed)
  - On next login, user may see package in restored list, but pip uninstall will fail (idempotent)

**UI Errors:**
- Network error during uninstall: show error message, allow retry
- Empty selection: button disabled (prevented at source)

---

## Data Flow Summary

```
User checks scipy + pandas → {selectedPackages: {"scipy", "pandas"}}
  ↓
User clicks "Eliminar seleccionados" → show confirmation modal
  ↓
User confirms → POST /api/pip/uninstall {packageNames: ["scipy", "pandas"]}
  ↓
Backend:
  - pip uninstall -y scipy → success → removePackageForUser(...) → update installedPackagesList
  - pip uninstall -y pandas → success → removePackageForUser(...) → update installedPackagesList
  - respond {success: true, removed: ["scipy", "pandas"], failed: []}
  ↓
Frontend receives response → clear checkboxes → refresh package list → show success
  ↓
On next login: restoreUserPackages() reads db.json, scipy + pandas NOT in user.packages, so they don't restore
```

---

## Files to Modify

- **`src/components/PackageManagerModal.tsx`**
  - Add `selectedPackages` state
  - Add checkboxes to package list
  - Add "Eliminar seleccionados" button
  - Add confirmation modal component
  - Add progress/uninstall modal component
  - Add `handleUninstallPackages()` handler
  - Add `POST /api/pip/uninstall` fetch call

- **`server.ts`**
  - Add `removePackageForUser()` helper function
  - Add `POST /api/pip/uninstall` endpoint with sequential uninstall logic
  - Update `installedPackagesList` in-memory after each successful uninstall

---

## Testing Strategy

**Manual Testing (in browser):**
1. Open Package Manager
2. Install 2–3 test packages (scipy, sympy, plotly)
3. Check checkboxes for 2 of them
4. Click "Eliminar seleccionados"
5. Verify confirmation modal appears
6. Click confirm
7. Verify progress modal shows uninstalling progress
8. Verify packages disappear from list
9. Verify packages removed from db.json (check data/db.json file)
10. Logout → restart container → login
11. Verify uninstalled packages do NOT reappear in list
12. Verify reinstalled package persists correctly on next cycle

**Edge Cases:**
- Select 0 packages → button disabled
- Uninstall 1 of 2 → refresh shows only 1 removed
- If pip uninstall fails for one package → show which one failed, others removed

---

## Known Constraints

- Sequential uninstall only (to avoid venv saturation, matches install behavior)
- Max 20 packages per uninstall request (arbitrary but reasonable limit)
- No rollback if second uninstall fails (first one already removed from db.json)
