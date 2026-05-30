# Graph Report - .  (2026-05-29)

## Corpus Check
- 17 files · ~12,761 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 92 nodes · 104 edges · 10 communities (7 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 112,575 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]

## God Nodes (most connected - your core abstractions)
1. `Python Runtime` - 7 edges
2. `AI Studio Web IDE` - 5 edges
3. `Docker web-ide Service` - 5 edges
4. `getVenvPythonPath()` - 4 edges
5. `checkInstalledPackages()` - 3 edges
6. `User` - 3 edges
7. `Project` - 3 edges
8. `FileItem` - 3 edges
9. `ExecutionResult` - 3 edges
10. `onVenvCreated()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `AI Studio Web IDE` --uses--> `Node.js Runtime`  [EXTRACTED]
  README.md → README.md,docker-compose.yml
- `AI Studio Web IDE` --depends_on--> `Gemini API`  [EXTRACTED]
  README.md → README.md,docker-compose.yml
- `Docker web-ide Service` --uses--> `Node.js Runtime`  [EXTRACTED]
  docker-compose.yml → README.md,docker-compose.yml
- `Python Runtime` --depends_on--> `NumPy >=1.24.0`  [EXTRACTED]
  docker-compose.yml → requirements.txt
- `Python Runtime` --depends_on--> `Pandas >=2.0.0`  [EXTRACTED]
  docker-compose.yml → requirements.txt

## Communities (10 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (38): actualPath, app, APP_DATA_DIR, DATA_DIR, database, db, DB_FILE, exists (+30 more)

### Community 1 - "Community 1"
Cohesion: 0.19
Nodes (9): AuthScreenProps, ConsoleSheetProps, getThemeSidebarClasses(), Sidebar(), SidebarProps, ExecutionResult, FileItem, Project (+1 more)

### Community 2 - "Community 2"
Cohesion: 0.21
Nodes (12): Docker web-ide Service, Gemini API, Matplotlib >=3.7.0, Node.js Runtime, npm run dev, NumPy >=1.24.0, Pandas >=2.0.0, Port 3000 (+4 more)

### Community 3 - "Community 3"
Cohesion: 0.4
Nodes (5): checkInstalledPackages(), getVenvPythonPath(), handleCompilationOrExecution(), onVenvCreated(), setupVenv()

### Community 4 - "Community 4"
Cohesion: 0.4
Nodes (3): PackageManagerModalProps, PythonLib, VenvStatus

## Knowledge Gaps
- **55 isolated node(s):** `app`, `DATA_DIR`, `DB_FILE`, `APP_DATA_DIR`, `version` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `app`, `DATA_DIR`, `DB_FILE` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._