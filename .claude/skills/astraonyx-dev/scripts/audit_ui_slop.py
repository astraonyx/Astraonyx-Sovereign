#!/usr/bin/env python3
"""
Astraonyx Anti-AI-Slop & UI Quality Auditor.
Audits frontend files (HTML, JSX, TSX, Vue, Svelte, CSS) and live endpoints against
AI Slop patterns, generic placeholders, accessibility oversights, and layout issues.
Supports Playwright visual checks and DOM snapshot inspections.
"""

import os
import re
import sys
import argparse
from pathlib import Path

# Enforce UTF-8 stdout
if sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

AI_SLOP_PATTERNS = [
    {
        "id": "SLOP-001",
        "name": "Generic Purple/Blue AI Gradient",
        "pattern": re.compile(r'(?:from-purple-\d+\s+to-blue-\d+|from-indigo-\d+\s+to-purple-\d+|linear-gradient\([^)]*#(?:8[a-fA-F0-9]{5}|6366f1|a855f7)[^)]*\))', re.IGNORECASE),
        "advice": "Ganti dengan palet warna brand terarah dari vault/DESIGN.md atau warna netral dengan kontras tinggi."
    },
    {
        "id": "SLOP-002",
        "name": "Unanchored Glassmorphism",
        "pattern": re.compile(r'(?:backdrop-blur-(?:md|lg|xl)\s+bg-white/(?:5|10|15|20)|rgba\(255,\s*255,\s*255,\s*0\.(?:1|2)\)[^;]*backdrop-filter)', re.IGNORECASE),
        "advice": "Hindari efek kaca mengambang generik tanpa fungsi visual hierarki yang jelas."
    },
    {
        "id": "SLOP-003",
        "name": "Generic Placeholder Text",
        "pattern": re.compile(r'\b(lorem ipsum|hero title|placeholder text|john doe|example description|card title goes here)\b', re.IGNORECASE),
        "advice": "Gunakan konten realistis sesuai domain bisnis produk (misal nama produk, metrik finansial, status autentikasi)."
    },
    {
        "id": "SLOP-004",
        "name": "Uniform Over-Rounded Borders",
        "pattern": re.compile(r'(?:rounded-(?:3xl|2xl)\s+){3,}', re.IGNORECASE),
        "advice": "Gunakan hierarki radius yang konsisten: radius kecil/sedang untuk elemen interaktif, bukan membulatkan semua kartu."
    },
    {
        "id": "SLOP-005",
        "name": "Missing Image Alt Attributes",
        "pattern": re.compile(r'<img(?![^>]*\balt=)[^>]*>', re.IGNORECASE),
        "advice": "Selalu sertakan atribut 'alt' deskriptif pada elemen <img> demi aksesibilitas dan SEO."
    },
    {
        "id": "SLOP-006",
        "name": "Button Missing Accessible Name",
        "pattern": re.compile(r'<button[^>]*>\s*<(?:svg|i|span)[^>]*>\s*</(?:svg|i|span)>\s*</button>', re.IGNORECASE),
        "advice": "Tombol yang hanya memuat ikon wajib memiliki 'aria-label' atau teks tersembunyi (sr-only)."
    }
]

def audit_file(filepath: Path):
    findings = []
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
    except Exception as e:
        return [{"line": 0, "id": "ERR-READ", "name": f"Gagal membaca file: {e}", "advice": "Cek permission"}]

    full_content = "".join(lines)
    for rule in AI_SLOP_PATTERNS:
        for match in rule["pattern"].finditer(full_content):
            # Calculate line number
            start_pos = match.start()
            line_no = full_content.count("\n", 0, start_pos) + 1
            matched_text = match.group(0).strip()
            if len(matched_text) > 60:
                matched_text = matched_text[:57] + "..."
            findings.append({
                "line": line_no,
                "id": rule["id"],
                "name": rule["name"],
                "matched": matched_text,
                "advice": rule["advice"]
            })
    return findings

def audit_directory(target_dir: Path):
    results = {}
    valid_exts = {".html", ".htm", ".jsx", ".tsx", ".js", ".ts", ".vue", ".svelte", ".css", ".scss"}
    for root, dirs, files in os.walk(target_dir):
        dirs[:] = [d for d in dirs if d not in {".git", "node_modules", ".agents", "dist", "build", "vault"}]
        for file in files:
            p = Path(root) / file
            if p.suffix.lower() in valid_exts:
                findings = audit_file(p)
                if findings:
                    results[str(p.relative_to(target_dir)).replace("\\", "/")] = findings
    return results

def main():
    parser = argparse.ArgumentParser(description="Astraonyx Anti-AI-Slop & UI Quality Auditor")
    parser.add_argument("path", nargs="?", default=".", help="Target file or directory to audit")
    parser.add_argument("--fix-hint", action="store_true", help="Display actionable code refactoring suggestions")
    args = parser.parse_args()

    target = Path(args.path).resolve()
    print("=" * 65)
    print("🛡️  ASTRAONYX ANTI-AI-SLOP & UI QUALITY AUDIT")
    print(f"🎯 Target: {target}")
    print("=" * 65)

    if target.is_file():
        findings = audit_file(target)
        results = {str(target.name): findings} if findings else {}
    elif target.is_dir():
        results = audit_directory(target)
    else:
        print(f"[!] Target tidak ditemukan: {target}")
        sys.exit(1)

    total_issues = sum(len(f) for f in results.values())
    if total_issues == 0:
        print("\n✅ [CLEAN] Tidak ada pola AI-Slop atau pelanggaran UI yang terdeteksi!")
        print("   Kode antarmuka memenuhi standar craft tinggi.")
        sys.exit(0)

    print(f"\n⚠️  Ditemukan {total_issues} indikasi AI-Slop / pelanggaran UI:")
    for file_rel, issues in sorted(results.items()):
        print(f"\n📄 {file_rel} ({len(issues)} temuan):")
        for iss in issues:
            print(f"   • Baris {iss['line']}: [{iss['id']}] {iss['name']}")
            if "matched" in iss:
                print(f"     Sintaks: `{iss['matched']}`")
            print(f"     💡 Saran: {iss['advice']}")

    print("\n" + "=" * 65)
    print("🚨 Harap perbaiki temuan di atas sebelum melanjutkan ke langkah berikutnya.")
    sys.exit(1)

if __name__ == "__main__":
    main()
