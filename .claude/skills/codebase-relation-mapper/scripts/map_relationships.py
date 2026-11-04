#!/usr/bin/env python3
"""
Graphify & Multi-Project Codebase Relationship Mapper for Obsidian Vault.
Scans the workspace, analyzes file imports, exports, functions, classes, and configurations
across multiple languages (Python, JS/TS, Dart/Flutter, Go, Rust, C/C++, HTML/CSS, Markdown).
Generates:
1. vault/relationships.md - Clustered Multi-Tier Graph (Graphify style) & Dependency Matrix
2. vault/symbols.md - Global symbol index (classes, functions, interfaces, routes)
Features CLI querying:
- python map_relationships.py --impact <file_path>
- python map_relationships.py --find <symbol_name>
- python map_relationships.py --cluster
"""

import os
import re
import sys
import json
import argparse
from pathlib import Path
from collections import defaultdict

# Enforce UTF-8 stdout across Windows consoles
if sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

IGNORE_DIRS = {
    ".git", ".svn", ".hg", "node_modules", "bower_components",
    ".agents", ".agent", ".gemini", ".idea", ".vscode",
    "__pycache__", ".pytest_cache", ".venv", "venv", "env",
    "dist", "build", "out", "target", "bin", "obj", ".dart_tool",
    ".system_generated"
}

IGNORE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp",
    ".mp3", ".mp4", ".wav", ".avi", ".mov", ".zip", ".tar", ".gz",
    ".exe", ".dll", ".so", ".dylib", ".bin", ".pyc", ".lock",
    ".pdf", ".docx", ".xlsx", ".pptx", ".ttf", ".woff", ".woff2"
}

# Import Patterns
IMPORT_PATTERNS = {
    "python": [
        re.compile(r'^\s*(?:from|import)\s+([a-zA-Z0-9_\.]+)', re.MULTILINE),
    ],
    "javascript": [
        re.compile(r'(?:import|from|require)\s*\(?[\'"]([^\'"\r\n]+)[\'"]\)?', re.MULTILINE),
        re.compile(r'export\s+.*\s+from\s*[\'"]([^\'"\r\n]+)[\'"]', re.MULTILINE),
    ],
    "dart": [
        re.compile(r'^\s*import\s+[\'"]([^\'"\r\n]+)[\'"]', re.MULTILINE),
        re.compile(r'^\s*export\s+[\'"]([^\'"\r\n]+)[\'"]', re.MULTILINE),
        re.compile(r'^\s*part\s+[\'"]([^\'"\r\n]+)[\'"]', re.MULTILINE),
    ],
    "go": [
        re.compile(r'import\s+[\'"]([^\'"\r\n]+)[\'"]', re.MULTILINE),
        re.compile(r'^\s*[\'"]([^\'"\r\n]+)[\'"]', re.MULTILINE),
    ],
    "c_cpp": [
        re.compile(r'#include\s+["<]([^">]+)[">]', re.MULTILINE),
    ],
    "markdown": [
        re.compile(r'\[\[([^\]\|\#]+)(?:[\|#][^\]]*)?\]\]'),
        re.compile(r'\[[^\]]*\]\(([^)]+\.(?:md|ts|js|py|dart|json|yaml|yml))\)'),
    ],
    "html": [
        re.compile(r'<(?:script|link)[^>]*(?:src|href)=[\'"]([^\'"]+)[\'"]', re.IGNORECASE),
    ]
}

# Symbol Patterns
SYMBOL_PATTERNS = {
    "python": [
        ("class", re.compile(r'^\s*class\s+([a-zA-Z0-9_]+)', re.MULTILINE)),
        ("def", re.compile(r'^\s*(?:async\s+)?def\s+([a-zA-Z0-9_]+)', re.MULTILINE)),
    ],
    "javascript": [
        ("class", re.compile(r'(?:export\s+)?(?:default\s+)?class\s+([a-zA-Z0-9_]+)', re.MULTILINE)),
        ("interface", re.compile(r'(?:export\s+)?interface\s+([a-zA-Z0-9_]+)', re.MULTILINE)),
        ("type", re.compile(r'(?:export\s+)?type\s+([a-zA-Z0-9_]+)\s*=', re.MULTILINE)),
        ("function", re.compile(r'(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)', re.MULTILINE)),
        ("const_fn", re.compile(r'(?:export\s+)?const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>', re.MULTILINE)),
    ],
    "dart": [
        ("class", re.compile(r'^\s*(?:abstract\s+)?class\s+([a-zA-Z0-9_]+)', re.MULTILINE)),
        ("enum", re.compile(r'^\s*enum\s+([a-zA-Z0-9_]+)', re.MULTILINE)),
        ("mixin", re.compile(r'^\s*mixin\s+([a-zA-Z0-9_]+)', re.MULTILINE)),
    ],
    "go": [
        ("type_struct", re.compile(r'type\s+([a-zA-Z0-9_]+)\s+struct', re.MULTILINE)),
        ("type_interface", re.compile(r'type\s+([a-zA-Z0-9_]+)\s+interface', re.MULTILINE)),
        ("func", re.compile(r'func\s+(?:\([^\)]+\)\s+)?([a-zA-Z0-9_]+)\s*\(', re.MULTILINE)),
    ]
}

def get_file_type(ext: str) -> str:
    ext = ext.lower()
    if ext in [".py"]:
        return "python"
    elif ext in [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]:
        return "javascript"
    elif ext in [".dart"]:
        return "dart"
    elif ext in [".go"]:
        return "go"
    elif ext in [".c", ".cpp", ".cc", ".h", ".hpp"]:
        return "c_cpp"
    elif ext in [".md", ".markdown"]:
        return "markdown"
    elif ext in [".html", ".htm"]:
        return "html"
    return "other"

def normalize_rel_path(p: Path, root: Path) -> str:
    try:
        return str(p.relative_to(root)).replace("\\", "/")
    except ValueError:
        return str(p).replace("\\", "/")

def get_cluster_name(rel_path: str) -> str:
    p = rel_path.lower()
    if p.startswith("vault/apps/"):
        return "SubProjects"
    elif p.startswith("vault/modules/"):
        return "SharedModules"
    elif p.startswith("vault/"):
        return "CoreVault"
    elif p.startswith("apps/"):
        return "AppsSource"
    elif p.startswith("packages/") or p.startswith("src/"):
        return "CodebaseSource"
    return "RootFiles"

def scan_files(root: Path):
    file_map = {}
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS and not d.startswith(".")]
        for f in filenames:
            ext = os.path.splitext(f)[1].lower()
            if ext in IGNORE_EXTENSIONS:
                continue
            full_path = Path(dirpath) / f
            rel_path = normalize_rel_path(full_path, root)
            file_map[rel_path] = full_path
    return file_map

def parse_codebase(root: Path, file_map: dict):
    forward_refs = defaultdict(set)
    reverse_refs = defaultdict(set)
    external_refs = defaultdict(set)
    symbols_by_file = defaultdict(list)
    symbol_index = defaultdict(list)

    for rel_path, full_path in file_map.items():
        ext = full_path.suffix.lower()
        ftype = get_file_type(ext)

        try:
            with open(full_path, "r", encoding="utf-8", errors="ignore") as fp:
                content = fp.read()
        except Exception:
            continue

        sym_rules = SYMBOL_PATTERNS.get(ftype, [])
        for kind, pat in sym_rules:
            for match in pat.finditer(content):
                sym_name = match.group(1).strip()
                if sym_name and not sym_name.startswith("_"):
                    symbols_by_file[rel_path].append({"kind": kind, "name": sym_name})
                    symbol_index[sym_name].append(rel_path)

        import_patterns = IMPORT_PATTERNS.get(ftype, [])
        for pattern in import_patterns:
            matches = pattern.findall(content)
            for raw_match in matches:
                target_str = raw_match.strip()
                if not target_str:
                    continue

                resolved = None
                if ftype in ["javascript", "dart", "c_cpp", "markdown", "html"]:
                    cur_dir = full_path.parent
                    cand1 = (cur_dir / target_str).resolve()
                    possible_cands = [cand1]
                    if not cand1.suffix:
                        for check_ext in [".ts", ".tsx", ".js", ".jsx", ".dart", ".py", ".md"]:
                            possible_cands.append(cand1.with_suffix(check_ext))
                            possible_cands.append(cand1 / f"index{check_ext}")

                    for cand in possible_cands:
                        cand_rel = normalize_rel_path(cand, root)
                        if cand_rel in file_map:
                            resolved = cand_rel
                            break

                if not resolved and ftype == "markdown":
                    target_name = target_str if target_str.endswith(".md") else f"{target_str}.md"
                    for f_rel in file_map:
                        if Path(f_rel).name.lower() == target_name.lower():
                            resolved = f_rel
                            break

                if not resolved and ftype == "python":
                    py_cand = target_str.replace(".", "/") + ".py"
                    for f_rel in file_map:
                        if f_rel.endswith(py_cand):
                            resolved = f_rel
                            break

                if resolved and resolved != rel_path:
                    forward_refs[rel_path].add(resolved)
                    reverse_refs[resolved].add(rel_path)
                elif not resolved and not target_str.startswith("."):
                    external_refs[rel_path].add(target_str)

    return forward_refs, reverse_refs, external_refs, symbols_by_file, symbol_index

def generate_relationships_markdown(root: Path, file_map: dict, forward_refs: dict, reverse_refs: dict, external_refs: dict) -> str:
    lines = []
    lines.append("---")
    lines.append("title: Codebase Relationships & Graphify Map")
    lines.append("tags: [codebase, relationships, graph, graphify, dependencies, vault]")
    lines.append(f"updated: {Path(__file__).stat().st_mtime}")
    lines.append("---")
    lines.append("")
    lines.append("# 🕸️ Graphify Multi-Project Relationship Map")
    lines.append("")
    lines.append("> **Catatan untuk AI Agent**: Ini adalah peta arsitektur modular multi-project (Graphify).")
    lines.append("> Terklaster rapi berdasarkan **Sub-Projects**, **Shared Modules**, dan **Core Vault**.")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 📊 Diagram Alur Arsitektur (Clustered Mermaid Graph)")
    lines.append("")
    lines.append("```mermaid")
    lines.append("graph TD")

    node_id_map = {}
    def get_id(path_str):
        if path_str not in node_id_map:
            clean = re.sub(r'[^a-zA-Z0-9_]', '_', path_str)
            node_id_map[path_str] = f"node_{len(node_id_map)}_{clean[:15]}"
        return node_id_map[path_str]

    # Group files into clusters for Graphify view
    clusters = defaultdict(list)
    for f in sorted(file_map.keys()):
        if f.endswith(".md") and ("template.md" in f or "README.md" in f):
            continue
        cname = get_cluster_name(f)
        clusters[cname].append(f)

    cluster_titles = {
        "SubProjects": "🚀 Sub-Projects (Apps Ecosystem)",
        "SharedModules": "🧩 Shared Modules & Domains",
        "CoreVault": "🧠 Core Knowledge Vault",
        "AppsSource": "💻 Apps Source Code",
        "CodebaseSource": "📦 Packages & Core Code",
        "RootFiles": "📁 Workspace Root"
    }

    for cname, files in clusters.items():
        if not files:
            continue
        title = cluster_titles.get(cname, cname)
        lines.append(f"    subgraph {cname}[\"{title}\"]")
        for f in files:
            nid = get_id(f)
            label = Path(f).name
            lines.append(f'        {nid}["{label}"]')
        lines.append("    end")

    # Add edges
    edge_count = 0
    for src, targets in sorted(forward_refs.items()):
        if "template.md" in src:
            continue
        src_id = get_id(src)
        for tgt in sorted(targets):
            if "template.md" in tgt:
                continue
            tgt_id = get_id(tgt)
            lines.append(f"    {src_id} --> {tgt_id}")
            edge_count += 1
            if edge_count >= 80:
                break
        if edge_count >= 80:
            lines.append("    %% Graf dibatasi untuk performa visual render")
            break

    lines.append("```")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 📑 Matriks Keterhubungan File Lengkap")
    lines.append("")
    lines.append("| File Sumber (Source) | Klaster / Kategori | Terhubung Ke (Outgoing) | Digunakan Oleh (Incoming) |")
    lines.append("| :--- | :--- | :--- | :--- |")

    all_files = sorted(set(list(file_map.keys())))
    for f in all_files:
        if "template.md" in f:
            continue
        cname = get_cluster_name(f)
        outgoing = sorted(forward_refs.get(f, []))
        incoming = sorted(reverse_refs.get(f, []))

        if not outgoing and not incoming and not f.startswith("vault/"):
            continue

        out_str = ", ".join([f"`{Path(o).name}`" for o in outgoing if "template.md" not in o]) if outgoing else "-"
        in_str = ", ".join([f"`{Path(i).name}`" for i in incoming if "template.md" not in i]) if incoming else "-"

        lines.append(f"| `{f}` | **{cname}** | {out_str} | {in_str} |")

    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 💡 Tips Vibe-Coding untuk AI Agent")
    lines.append("1. **Kembangkan Sub-Project:** Saat user menyebut fitur aplikasi tertentu, buka `vault/apps/<nama-app>.md` untuk melihat arsitekturnya.")
    lines.append("2. **Gunakan Modul Bersama:** Cek `vault/modules/` sebelum membuat fungsi utilitas baru agar tidak menduplikasi kode.")
    lines.append("3. **Analisis Dampak:** Jalankan `python .agents/skills/codebase-relation-mapper/scripts/map_relationships.py --impact <file>` sebelum refactoring.")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 🔗 Navigasi Vault")
    lines.append("- Hub Utama: [[index.md|Index (MOC)]]")
    lines.append("- Sub-Projects: [[apps/README.md|Apps Registry]]")
    lines.append("- Shared Modules: [[modules/README.md|Modules Registry]]")
    lines.append("- Indeks Simbol: [[symbols.md|Symbols Registry]]")

    return "\n".join(lines) + "\n"

def generate_symbols_markdown(symbols_by_file: dict) -> str:
    lines = []
    lines.append("---")
    lines.append("title: Codebase Symbols & API Registry")
    lines.append("tags: [codebase, symbols, functions, classes, api, vault]")
    lines.append("---")
    lines.append("")
    lines.append("# 🧩 Codebase Symbols & API Registry")
    lines.append("")
    lines.append("> **Catatan untuk AI Agent**: File ini adalah indeks global seluruh kelas, fungsi, tipe, dan komponen.")
    lines.append("> Gunakan daftar ini untuk menemukan implementasi tanpa perlu pencarian teks berulang (*grep/search*).")
    lines.append("")
    lines.append("---")
    lines.append("")

    if not symbols_by_file:
        lines.append("*Belum ada simbol kode (fungsi/kelas) yang terdeteksi. Simbol akan otomatis tercatat saat file kode aplikasi mulai ditambahkan.*")
    else:
        lines.append("| File Lokasi | Tipe (Kind) | Nama Simbol (Identifier) |")
        lines.append("| :--- | :--- | :--- |")
        for f, syms in sorted(symbols_by_file.items()):
            for s in syms:
                lines.append(f"| `{f}` | `{s['kind']}` | **`{s['name']}`** |")

    lines.append("")
    lines.append("---")
    lines.append("## 🔗 Navigasi Vault")
    lines.append("- Hub Utama: [[index.md|Index (MOC)]]")
    lines.append("- Relasi Graph: [[relationships.md|Relationships]]")
    lines.append("- Sub-Projects: [[apps/README.md|Apps]]")
    lines.append("- Shared Modules: [[modules/README.md|Modules]]")

    return "\n".join(lines) + "\n"

def query_impact(target_file: str, reverse_refs: dict):
    target_clean = target_file.replace("\\", "/").strip()
    print(f"\n[🔍 Graphify Impact Analysis for: {target_clean}]")
    direct_consumers = sorted(reverse_refs.get(target_clean, []))
    if not direct_consumers:
        print("  -> Tidak ada file yang mengimpor/menggunakan file ini secara langsung.")
        return

    print(f"  -> Digunakan langsung oleh {len(direct_consumers)} file:")
    for c in direct_consumers:
        print(f"     • [{get_cluster_name(c)}] {c}")

    visited = set(direct_consumers)
    queue = list(direct_consumers)
    while queue:
        curr = queue.pop(0)
        for parent in reverse_refs.get(curr, []):
            if parent not in visited and parent != target_clean:
                visited.add(parent)
                queue.append(parent)

    indirect = sorted(visited - set(direct_consumers))
    if indirect:
        print(f"  -> Dampak transitif (tidak langsung) pada {len(indirect)} file:")
        for ind in indirect:
            print(f"     • [{get_cluster_name(ind)}] {ind}")
    print()

def query_symbol(symbol_name: str, symbol_index: dict):
    print(f"\n[🔍 Symbol Search for: '{symbol_name}']")
    matches = [k for k in symbol_index if symbol_name.lower() in k.lower()]
    if not matches:
        print("  -> Simbol tidak ditemukan di indeks codebase.")
        return

    for m in sorted(matches):
        files = symbol_index[m]
        print(f"  • {m}: didefinisikan di {', '.join(files)}")
    print()

def main():
    parser = argparse.ArgumentParser(description="Graphify & Multi-Project Codebase Mapper")
    parser.add_argument("--impact", type=str, help="Show impact analysis for a specific file")
    parser.add_argument("--find", type=str, help="Search for a function, class, or symbol across the codebase")
    args = parser.parse_args()

    workspace_root = Path(os.getcwd()).resolve()
    file_map = scan_files(workspace_root)
    forward_refs, reverse_refs, external_refs, symbols_by_file, symbol_index = parse_codebase(workspace_root, file_map)

    if args.impact:
        query_impact(args.impact, reverse_refs)
        return

    if args.find:
        query_symbol(args.find, symbol_index)
        return

    print(f"[+] Scanning codebase from: {workspace_root}")
    print(f"[+] Found {len(file_map)} project files.")
    print(f"[+] Analyzed {len(forward_refs)} outgoing relations and {len(reverse_refs)} incoming relations.")

    vault_dir = workspace_root / "vault"
    vault_dir.mkdir(parents=True, exist_ok=True)

    rel_path = vault_dir / "relationships.md"
    rel_content = generate_relationships_markdown(workspace_root, file_map, forward_refs, reverse_refs, external_refs)
    with open(rel_path, "w", encoding="utf-8") as f:
        f.write(rel_content)
    print(f"[OK] Generated & updated Graphify map: {rel_path}")

    sym_path = vault_dir / "symbols.md"
    sym_content = generate_symbols_markdown(symbols_by_file)
    with open(sym_path, "w", encoding="utf-8") as f:
        f.write(sym_content)
    print(f"[OK] Generated & updated Symbol index: {sym_path}")

if __name__ == "__main__":
    main()
