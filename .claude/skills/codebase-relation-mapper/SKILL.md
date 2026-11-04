---
name: codebase-relation-mapper
description: Scans the codebase to extract file imports, syntax dependencies, symbols (functions, classes, interfaces), and cross-references. Updates vault/relationships.md and vault/symbols.md, and supports impact analysis queries. Use this skill whenever you need to explore or understand how files relate to each other, trace dependencies, inspect symbols, check which file imports or calls another, or update the codebase architecture map without reading files one-by-one.
---

# Codebase Relation & Symbol Mapper

The **Codebase Relation Mapper** skill provides automated dependency, relationship, and symbol mapping for the workspace. Instead of forcing the AI Agent to read files one-by-one to understand the architecture, this skill scans imports, exports, functions, classes, interfaces, and syntax references across multiple languages (Python, JS/TS, Dart/Flutter, Go, C/C++, HTML/CSS, Markdown) and maintains unified indexes in `vault/`.

---

## 🎯 When to Use This Skill

Activate this skill whenever:
1. **Navigating the Codebase**: You need to know what a file imports, what depends on it, or how modules connect.
2. **Refactoring or Editing**: You are about to modify a core file and need to know which other files might break (impact analysis).
3. **Locating Symbols**: You need to find where a class, function, or interface is defined without scanning every directory.
4. **Updating the Vault**: New files or modules have been created or modified, and `vault/relationships.md` and `vault/symbols.md` need to be updated.
5. **Avoiding File Thrashing**: You want to quickly inspect file connections without making dozens of `read_file` calls.

---

## 🛠️ CLI Utilities & Workflows

### 1. Full Codebase Scan & Vault Synchronization
Run the parser to update both `vault/relationships.md` and `vault/symbols.md`:
```powershell
python .agents/skills/codebase-relation-mapper/scripts/map_relationships.py
```

### 2. Impact Analysis Query
Before editing or refactoring a file, check all direct and indirect consumers that rely on it:
```powershell
python .agents/skills/codebase-relation-mapper/scripts/map_relationships.py --impact <path/to/file>
```

### 3. Symbol Search Query
Instantly locate where a function, class, or type is defined:
```powershell
python .agents/skills/codebase-relation-mapper/scripts/map_relationships.py --find <symbol_name>
```

---

## 📑 Output Artifacts in `vault/`
- **`vault/relationships.md`**: Mermaid dependency graph + source/target/external matrix table.
- **`vault/symbols.md`**: Global registry of classes, functions, interfaces, and types.
