#!/usr/bin/env python3
"""
Astraonyx Semantic Memory Query Engine for Obsidian Vault.
Performs fast term-weighted & fuzzy search across all vault notes (apps, modules,
errors, decisions, glossary, status) and returns relevant context snippets with
exact file:line citations so AI agents can recall memory instantly without reading
every file into the context window.
"""

import os
import re
import sys
import math
import argparse
from pathlib import Path
from collections import Counter

# Enforce UTF-8 stdout
if sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def tokenize(text: str):
    return re.findall(r'[a-zA-Z0-9_\-]+', text.lower())

def load_vault_documents(vault_dir: Path):
    docs = []
    for root, _, files in os.walk(vault_dir):
        for file in files:
            if file.endswith(".md"):
                full_path = Path(root) / file
                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                        lines = f.readlines()
                    rel_path = str(full_path.relative_to(vault_dir.parent)).replace("\\", "/")
                    docs.append({
                        "path": rel_path,
                        "lines": lines,
                        "full_text": "".join(lines),
                        "tokens": tokenize("".join(lines))
                    })
                except Exception:
                    continue
    return docs

def search_vault(docs: list, query: str, top_k: int = 5):
    query_tokens = tokenize(query)
    if not query_tokens:
        return []

    # IDF calculation
    N = len(docs)
    df = Counter()
    for doc in docs:
        unique_tokens = set(doc["tokens"])
        for qt in set(query_tokens):
            if qt in unique_tokens:
                df[qt] += 1

    scored_results = []
    for doc in docs:
        tf = Counter(doc["tokens"])
        score = 0.0
        for qt in query_tokens:
            if tf[qt] > 0:
                idf = math.log((N + 1) / (df[qt] + 1)) + 1
                score += (tf[qt] / len(doc["tokens"])) * idf

        # Boost if query appears in title or filename
        for qt in query_tokens:
            if qt in doc["path"].lower():
                score += 2.0

        if score > 0:
            # Find best matching section/lines
            best_line_idx = 0
            best_line_score = 0
            for idx, line in enumerate(doc["lines"]):
                l_tokens = set(tokenize(line))
                l_match = sum(1 for qt in query_tokens if qt in l_tokens)
                if l_match > best_line_score:
                    best_line_score = l_match
                    best_line_idx = idx

            # Window of 5 lines around best match
            start_line = max(0, best_line_idx - 2)
            end_line = min(len(doc["lines"]), best_line_idx + 4)
            snippet = "".join(doc["lines"][start_line:end_line]).strip()

            scored_results.append({
                "path": doc["path"],
                "score": score,
                "line": best_line_idx + 1,
                "snippet": snippet
            })

    scored_results.sort(key=lambda x: x["score"], reverse=True)
    return scored_results[:top_k]

def main():
    parser = argparse.ArgumentParser(description="Astraonyx Semantic Memory Query Engine")
    parser.add_argument("query", help="Keywords or concept to search across the vault")
    parser.add_argument("--top", type=int, default=4, help="Number of results to return")
    args = parser.parse_args()

    workspace_root = Path(os.getcwd()).resolve()
    vault_dir = workspace_root / "vault"
    if not vault_dir.exists():
        print(f"[!] Vault directory not found: {vault_dir}")
        sys.exit(1)

    docs = load_vault_documents(vault_dir)
    results = search_vault(docs, args.query, top_k=args.top)

    print("=" * 65)
    print(f"🧠  ASTRAONYX VAULT MEMORY SEARCH: '{args.query}'")
    print(f"📚  Indexed {len(docs)} documents in {vault_dir.name}/")
    print("=" * 65)

    if not results:
        print("\n[!] Tidak ditemukan catatan yang cocok dengan query tersebut.")
        return

    print(f"\n🔍 Ditemukan {len(results)} dokumen paling relevan:\n")
    for idx, r in enumerate(results, 1):
        print(f"[{idx}] 📄 {r['path']}:{r['line']} (Score: {r['score']:.4f})")
        print("   " + "-" * 55)
        for sline in r["snippet"].splitlines():
            print(f"   | {sline}")
        print("   " + "-" * 55 + "\n")

if __name__ == "__main__":
    main()
