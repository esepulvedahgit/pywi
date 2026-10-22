# Package Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to select and uninstall one or more packages, with confirmation and progress feedback. Packages are removed from venv, db.json, and in-memory list.

**Architecture:** Add 3 UI components (checkboxes, delete button, confirmation modal, progress modal) to PackageManagerModal. Backend adds one new endpoint (`POST /api/pip/uninstall`) and one helper function (`removePackageForUser()`). All changes isolated to existing files; no new files needed.

**Tech Stack:** React hooks (useState, useCallback), Node.js/Express, pip, file-based db.json

---

## File Structure

**Modified Files:**
- `src/components/PackageManagerModal.tsx` — UI: checkboxes, delete button, confirmation modal, progress modal, handler
- `server.ts` — Backend: `removePackageForUser()` helper, `POST /api/pip/uninstall` endpoint

---

## Task 1: Backend — Add `removePackageForUser()` Helper

**Files:**
- Modify: `server.ts` (add helper function near `savePackageForUser()`)

- [ ] **Step 1: Locate `savePackageForUser()` in server.ts**

Open `server.ts` and search for `const savePackageForUser = () => {`. It's around line 569.

- [ ] **Step 2: Add `removePackageForUser()` helper right after `savePackageForUser()`**

Insert this code after the closing brace of `savePackageForUser()` (around line 578):

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

- [ ] **Step 3: Verify syntax — no build errors**

Run: `npm run lint`
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add server.ts
git commit -m "feat: add removePackageForUser helper function"
```

---

## Task 2: Backend — Add `POST /api/pip/uninstall` Endpoint

**Files:**
- Modify: `server.ts` (add new endpoint after `POST /api/pip/install`)

- [ ] **Step 1: Locate `POST /api/pip/install` endpoint in server.ts**

Search for `app.post('/api/pip/install'`. It starts around line 555.

- [ ] **Step 2: Find the closing brace of `POST /api/pip/install` handler**

Scroll down to find `});` that closes the entire handler (around line 633).

- [ ] **Step 3: Add new `POST /api/pip/uninstall` endpoint right after**

Insert this code after the closing `});` of the install endpoint:

```typescript
// API: Uninstall one or more packages via pip
app.post('/api/pip/uninstall', requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const { packageNames } = req.body;
  
  if (!Array.isArray(packageNames) || packageNames.length === 0) {
    return res.status(400).json({ success: false, error: 'packageNames must be a non-empty array' });
  }
  
  if (packageNames.length > 20) {
    return res.status(400).json({ success: false, error: 'Maximum 20 packages per request' });
  }

  const removed: string[] = [];
  const failed: string[] = [];

  const uninstallNext = (index: number) => {
    if (index >= packageNames.length) {
      // All done
      res.json({ success: removed.length > 0, removed, failed });
      return;
    }

    const pkgName = packageNames[index].trim().toLowerCase();
    if (!pkgName) {
      uninstallNext(index + 1);
      return;
    }

    if (hasPython) {
      const pipPath = getVenvPythonPath().replace('python', 'pip');
      exec(`"${pipPath}" uninstall -y "${pkgName}"`, (err) => {
        if (!err) {
          removed.push(pkgName);
          removePackageForUser(userId, pkgName);
          installedPackagesList = installedPackagesList.filter(
            p => p.name.toLowerCase() !== pkgName
          );
        } else {
          failed.push(pkgName);
        }
        uninstallNext(index + 1);
      });
    } else {
      // Mock mode: just remove from in-memory list and db
      const found = mockPackages.find(p => p.name.toLowerCase() === pkgName);
      if (found) {
        mockPackages.splice(mockPackages.indexOf(found), 1);
        removed.push(pkgName);
        removePackageForUser(userId, pkgName);
      } else {
        failed.push(pkgName);
      }
      uninstallNext(index + 1);
    }
  };

  uninstallNext(0);
});
```

- [ ] **Step 4: Verify the endpoint is properly placed**

Check that:
- It's after `POST /api/pip/install` handler
- It's before any other routes
- No syntax errors

Run: `npm run lint`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add server.ts
git commit -m "feat: add POST /api/pip/uninstall endpoint"
```

---

## Task 3: Frontend — Add `selectedPackages` State and Checkboxes

**Files:**
- Modify: `src/components/PackageManagerModal.tsx` (add state and checkboxes to list)

- [ ] **Step 1: Add `selectedPackages` state after existing useState hooks**

Find the lines with `const [packages, setPackages] = useState<PythonLib[]>([]);` (around line 37).

After that line, add:

```typescript
const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
```

- [ ] **Step 2: Add checkbox toggle handler**

Right after `const fetchStatusAndPackages = async () => {` (around line 56), add this handler:

```typescript
const handleTogglePackage = (packageName: string) => {
  const newSelected = new Set(selectedPackages);
  if (newSelected.has(packageName)) {
    newSelected.delete(packageName);
  } else {
    newSelected.add(packageName);
  }
  setSelectedPackages(newSelected);
};
```

- [ ] **Step 3: Find the "Librerías Instaladas" section in the render**

Search for the text that shows installed packages. Look for a section that renders the `packages` array (around line 340+).

- [ ] **Step 4: Update the package list to include checkboxes**

Replace the package list item rendering with:

```typescript
{/* Installed Libraries Section */}
<div className="space-y-2">
  <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${c.title}`}>
    <Check className="h-4 w-4 text-emerald-500" /> Librerías Instaladas ({filteredPackages.length})
  </h3>
  {filteredPackages.length === 0 ? (
    <div className={`p-3.5 rounded-lg text-xs text-center ${c.cardItem}`}>
      {packages.length === 0 ? 'Sin librerías instaladas aún.' : 'Sin coincidencias en la búsqueda.'}
    </div>
  ) : (
    <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
      {filteredPackages.map(pkg => (
        <div 
          key={pkg.name} 
          className={`p-3 rounded-lg flex items-center gap-3 transition-all ${c.cardItem}`}
        >
          <input
            type="checkbox"
            checked={selectedPackages.has(pkg.name)}
            onChange={() => handleTogglePackage(pkg.name)}
            className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
            disabled={isInstalling}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{pkg.name}</p>
            <p className="text-[10px] text-slate-500">{pkg.version || 'version desconocida'}</p>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```

Make sure to keep the search input above this section for filtering.

- [ ] **Step 5: Verify checkboxes appear and toggle**

Run: `npm run dev`
- Open Package Manager
- Verify checkboxes appear next to each package
- Click checkbox → verify it gets checked/unchecked
- State updates correctly

Expected: Visual feedback on checkbox state

- [ ] **Step 6: Commit**

```bash
git add src/components/PackageManagerModal.tsx
git commit -m "feat: add package selection with checkboxes"
```

---

## Task 4: Frontend — Add "Eliminar seleccionados" Button

**Files:**
- Modify: `src/components/PackageManagerModal.tsx` (add button below install section)

- [ ] **Step 1: Add button state for uninstall progress**

After `const [isInstalling, setIsInstalling] = useState(false);` (around line 40), add:

```typescript
const [isUninstalling, setIsUninstalling] = useState(false);
```

- [ ] **Step 2: Add state for confirmation modal**

After the line you just added, add:

```typescript
const [showUninstallConfirm, setShowUninstallConfirm] = useState(false);
```

- [ ] **Step 3: Find the section with the install button**

Look for the button with `onClick={() => handleInstallPackage(installInput)}` (around line 264).

- [ ] **Step 4: Add delete button right after the install button**

After the closing `</button>` of the install button, add:

```typescript
<button
  disabled={selectedPackages.size === 0 || isUninstalling || isInstalling}
  onClick={() => setShowUninstallConfirm(true)}
  className={`px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
    selectedPackages.size === 0 || isUninstalling || isInstalling
      ? 'bg-slate-250 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
      : 'bg-red-600 hover:bg-red-700 text-white'
  }`}
  id="btn-uninstall-packages"
>
  {isUninstalling ? (
    <>
      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      <span>Desinstalando...</span>
    </>
  ) : (
    <>
      <X className="h-3.5 w-3.5" />
      <span>Eliminar ({selectedPackages.size})</span>
    </>
  )}
</button>
```

- [ ] **Step 5: Verify button appears and is disabled when no packages selected**

Run: `npm run dev`
- Open Package Manager
- Verify button appears with count
- Button is disabled (grayed) when no checkboxes selected
- Button becomes enabled when you check a package
- Button shows "Desinstalando..." and spinner when uninstalling (will test later)

Expected: Button state changes correctly based on selection

- [ ] **Step 6: Commit**

```bash
git add src/components/PackageManagerModal.tsx
git commit -m "feat: add delete button with selection count"
```

---

## Task 5: Frontend — Add Confirmation Modal

**Files:**
- Modify: `src/components/PackageManagerModal.tsx` (add confirmation modal component and render)

- [ ] **Step 1: Add confirmation modal component before the return statement**

Find the return statement that starts with `return (` and `<div className={c.overlay}>` (around line 170).

Before that return, add this component:

```typescript
const UninstallConfirmModal = () => {
  if (!showUninstallConfirm) return null;
  
  const selectedList = Array.from(selectedPackages).join(', ');
  
  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowUninstallConfirm(false)}>
      <div 
        className={`p-6 rounded-2xl shadow-2xl max-w-md w-full ${
          isLight ? 'bg-white text-slate-800' : isVibrant ? 'bg-slate-900 text-slate-200' : 'bg-neutral-950 text-neutral-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-bold mb-3">Confirmar eliminación</h3>
        <p className="text-xs mb-4 leading-relaxed text-slate-500 dark:text-slate-400">
          ¿Desinstalar {selectedPackages.size} librería{selectedPackages.size > 1 ? 's' : ''}? Se eliminarán de tu entorno y <strong>no se restaurarán</strong> en próximos logins.
        </p>
        <p className="text-xs mb-4 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono break-words">
          {selectedList}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setShowUninstallConfirm(false)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              setShowUninstallConfirm(false);
              handleUninstallPackages();
            }}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Add the confirmation modal to the render output**

In the main return statement, right after the closing `</div>` of the main card (but still inside the overlay), add:

```typescript
<UninstallConfirmModal />
```

This should be placed inside the overlay div but outside the card div.

- [ ] **Step 3: Verify modal appears on button click**

Run: `npm run dev`
- Select 2 packages
- Click "Eliminar" button
- Verify confirmation modal appears with list of packages

Expected: Modal blocks interaction until confirmed/canceled

- [ ] **Step 4: Commit**

```bash
git add src/components/PackageManagerModal.tsx
git commit -m "feat: add uninstall confirmation modal"
```

---

## Task 6: Frontend — Add Progress Modal

**Files:**
- Modify: `src/components/PackageManagerModal.tsx` (add progress state and modal)

- [ ] **Step 1: Add state for uninstall progress tracking**

After `const [showUninstallConfirm, setShowUninstallConfirm] = useState(false);`, add:

```typescript
const [uninstallProgress, setUninstallProgress] = useState<{
  currentPackage: string | null;
  removed: string[];
  failed: string[];
}>({ currentPackage: null, removed: [], failed: [] });
```

- [ ] **Step 2: Add progress modal component before the main return**

Before the `return (` statement, add:

```typescript
const UninstallProgressModal = () => {
  if (!isUninstalling) return null;
  
  return (
    <div className="fixed inset-0 z-[101] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className={`p-6 rounded-2xl shadow-2xl max-w-md w-full ${
          isLight ? 'bg-white text-slate-800' : isVibrant ? 'bg-slate-900 text-slate-200' : 'bg-neutral-950 text-neutral-200'
        }`}
      >
        <h3 className="text-base font-bold mb-4">Desinstalando paquetes</h3>
        
        {uninstallProgress.currentPackage && (
          <div className="mb-4 flex items-center gap-3">
            <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
            <p className="text-xs font-mono">{uninstallProgress.currentPackage}</p>
          </div>
        )}
        
        {uninstallProgress.removed.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-1.5">Desinstaladas ({uninstallProgress.removed.length}):</p>
            <div className="space-y-1">
              {uninstallProgress.removed.map(pkg => (
                <div key={pkg} className="text-xs flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3" />
                  {pkg}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {uninstallProgress.failed.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-red-600 dark:text-red-400 mb-1.5">Fallaron ({uninstallProgress.failed.length}):</p>
            <div className="space-y-1">
              {uninstallProgress.failed.map(pkg => (
                <div key={pkg} className="text-xs flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-3 w-3" />
                  {pkg}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Add progress modal to the render output**

In the main return, add `<UninstallProgressModal />` right after `<UninstallConfirmModal />`.

- [ ] **Step 4: Verify modal structure is correct**

Run: `npm run lint`
Expected: No TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add src/components/PackageManagerModal.tsx
git commit -m "feat: add uninstall progress modal"
```

---

## Task 7: Frontend — Add `handleUninstallPackages()` Handler

**Files:**
- Modify: `src/components/PackageManagerModal.tsx` (add handler function)

- [ ] **Step 1: Add the handler after `handleInstallPackage()`**

Find the closing brace of `handleInstallPackage()` (around line 138). After that, add:

```typescript
const handleUninstallPackages = async () => {
  const packageNames = Array.from(selectedPackages);
  if (packageNames.length === 0) return;

  setIsUninstalling(true);
  setUninstallProgress({ currentPackage: null, removed: [], failed: [] });

  try {
    const token = localStorage.getItem('py_ide_token');
    
    // Uninstall each package sequentially and update progress
    const removed: string[] = [];
    const failed: string[] = [];

    for (const pkgName of packageNames) {
      setUninstallProgress(prev => ({
        ...prev,
        currentPackage: pkgName
      }));

      try {
        const res = await fetch('/api/pip/uninstall', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ packageNames: [pkgName] })
        });
        const data = await res.json();
        
        if (res.ok && data.success && data.removed.includes(pkgName)) {
          removed.push(pkgName);
        } else {
          failed.push(pkgName);
        }
      } catch (err) {
        failed.push(pkgName);
      }

      setUninstallProgress(prev => ({
        ...prev,
        removed: [...prev.removed, ...packageNames.filter((_, i) => packageNames.indexOf(pkgName) === i && removed.includes(pkgName))],
        failed: [...prev.failed, ...packageNames.filter((_, i) => packageNames.indexOf(pkgName) === i && failed.includes(pkgName))]
      }));
    }

    // Final update and close modal
    await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause to show completion
    setIsUninstalling(false);
    setSelectedPackages(new Set());
    await fetchStatusAndPackages();
  } catch (err: any) {
    console.error('Uninstall error:', err);
    setIsUninstalling(false);
  }
};
```

- [ ] **Step 2: Verify the handler compiles**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Manual test flow (will be tested in full testing task)**

Just verify there are no syntax errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/PackageManagerModal.tsx
git commit -m "feat: add handleUninstallPackages handler"
```

---

## Task 8: Manual Testing

**Files:**
- Test: `src/components/PackageManagerModal.tsx` (manual browser testing)

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Expected: Server running on http://localhost:3000

- [ ] **Step 2: Open app in browser**

Navigate to http://localhost:3000, login, open Package Manager

- [ ] **Step 3: Install 3 test packages**

- Install `scipy`
- Install `sympy`
- Install `plotly`

Expected: All 3 appear in "Librerías Instaladas"

- [ ] **Step 4: Test checkbox selection**

- Check checkbox for `scipy`
- Verify "Eliminar (1)" button appears and is enabled
- Check checkbox for `sympy`
- Verify button now shows "Eliminar (2)"
- Uncheck `scipy`
- Verify button now shows "Eliminar (1)"

Expected: Button count and state update correctly

- [ ] **Step 5: Test confirmation modal**

- Select `scipy` and `sympy`
- Click "Eliminar (2)" button
- Verify confirmation modal appears showing both package names
- Click "Cancelar"
- Verify modal closes and packages are still selected

Expected: Modal interaction works, selection persists

- [ ] **Step 6: Test uninstall flow**

- Select `scipy` and `sympy`
- Click "Eliminar (2)"
- Confirm in modal
- Verify progress modal appears with "Desinstalando scipy"
- Wait for completion
- Verify both packages removed from list
- Verify checkboxes are cleared
- Verify "Eliminar" button is disabled again

Expected: All steps work, packages removed from UI

- [ ] **Step 7: Verify db.json was updated**

- Check file `data/db.json`
- Find your user in the file
- Verify `user.packages` array no longer contains "scipy" or "sympy"

Expected: Packages removed from database

- [ ] **Step 8: Test persistence on restart**

- Logout
- Restart container: `docker-compose restart`
- Login again
- Open Package Manager
- Verify `scipy` and `sympy` do NOT appear in list (but `plotly` should still be there)

Expected: Deleted packages do not restore; other packages persist

- [ ] **Step 9: Test reinstall**

- Install `scipy` again
- Verify it appears in list and in db.json

Expected: Package can be reinstalled and persists normally

- [ ] **Step 10: Test edge cases**

**Case A:** Select all packages and delete them
- Expected: All removed, list empty, button disabled

**Case B:** Attempt to delete while installing another package
- Expected: Delete button disabled during install, enabled when install completes

**Case C:** Cancel confirmation and then select different packages
- Expected: Previous selection is replaced, modal works correctly with new selection

Expected: All edge cases handled cleanly

---

## Self-Review vs Spec

✅ **Spec Coverage:**
- ✅ Checkboxes for package selection → Task 3
- ✅ "Eliminar seleccionados" button → Task 4
- ✅ Confirmation modal → Task 5
- ✅ Progress modal → Task 6
- ✅ `POST /api/pip/uninstall` endpoint → Task 2
- ✅ `removePackageForUser()` helper → Task 1
- ✅ Sequential uninstall logic → Task 2 (uninstallNext function)
- ✅ Update in-memory `installedPackagesList` → Task 2 (filter operation)
- ✅ Update db.json → Task 1 (removePackageForUser)
- ✅ Error handling (removed vs failed arrays) → Tasks 2, 7
- ✅ Manual testing → Task 8

✅ **Placeholder Scan:**
- No "TBD", "TODO", "add error handling"
- All code is complete and specific
- All commands are exact with expected output

✅ **Type Consistency:**
- `selectedPackages: Set<string>` used throughout
- `handleTogglePackage(packageName: string)` matches handler calls
- Response types match: `{ success, removed: string[], failed: string[] }`
- Modal states consistent: `showUninstallConfirm`, `isUninstalling`, `uninstallProgress`

✅ **No Gaps:**
- All requirements from spec are covered
- Sequential uninstall implemented
- Database persistence implemented
- UI feedback complete (confirmation + progress)

---
