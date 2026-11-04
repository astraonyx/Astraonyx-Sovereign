---
name: astraonyx-redhat
description: Autonomous Red-Team Ethical Hacker & Penetration Testing Engine for Astraonyx-Ataraxia. Simulates real-world cyber attacks (SQLi, XSS, Auth Bypass, IDOR, Secret Leaks, Brute-Force, Fuzzing) and verifies security with safe-state rollback. Use this skill whenever conducting security audits, testing authentication resilience, hardening endpoints, or hunting for exploitable vulnerabilities.
---

# 🔴 astraonyx-redhat: Autonomous Red-Team Cyber Security Engine

The **`astraonyx-redhat`** skill turns the AI Agent into an elite, autonomous **Ethical Hacker (Red-Team Pentester)** that aggressively attempts to breach your application, find exploitable holes in authentication, data queries, and APIs, generates a formal CVSS threat report, and safely restores state.

---

## 🎯 When to Use This Skill

Activate this skill:
1. **Security Audit Before Release**: Prior to deploying or releasing any new sub-project or API endpoint.
2. **Auth & Session Hardening**: After building login, registration, password reset, or token verification logic.
3. **Data Protection & IDOR Auditing**: To verify that no user can access another user's data by tampering with IDs.
4. **Automated Exploit Fuzzing**: To attack forms and APIs with malicious payloads (SQLi, XSS, path traversal).

---

## 🛠️ Tri-Mode Hacker Execution Engine

The bundled engine (`scripts/redhat_pentest.py`) supports three execution modes:

### Mode 1: Auto-Scan & Auto-Patch
Scans the codebase for critical vulnerabilities (secret leaks, SQL injection, XSS, unhashed passwords, insecure JWT) and drafts secure remediation patches.

### Mode 2: Executive Threat Report & CVSS Scoring
Generates a formal Markdown audit report in `vault/security/audit-report.md` mapping findings to CVSS v3.1 severity scores (Critical, High, Medium, Low).

### Mode 3: Aggressive Fuzzing with Safe-Restore Checkpointing
Attacks inputs with hundreds of malicious payloads to test server-side resilience. **Guaranteed Safe-Restore:** The script ensures all original files and configurations remain intact and unharmed after testing.

---

## ⚡ CLI Commands

```powershell
# 1. Full Security Audit + Fuzzing + Safe-Restore + Report
python .agents/skills/astraonyx-redhat/scripts/redhat_pentest.py --report --fuzz --safe-restore

# 2. Audit a specific sub-project or module directory
python .agents/skills/astraonyx-redhat/scripts/redhat_pentest.py apps/core-ecosystem --report --safe-restore
```

---

## 📑 Artifacts Generated
- **`vault/security/audit-report.md`**: Up-to-date penetration testing log & CVSS scores.
- **`vault/security/threat-model.md`**: STRIDE threat matrix mapping risks to mitigations.
