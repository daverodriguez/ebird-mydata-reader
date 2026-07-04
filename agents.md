# Agent Rules

- Never search the entire repository with `rg`, `find`, `grep`, or any similar pattern-based scan.
- This repository contains very large text files, and whole-repo scans can lock up the machine.
- When you need to inspect code or text, use targeted file paths and narrowly scoped searches only.
- Prefer opening a known file directly, or searching within a single directory or file list that you already have in hand.
- If a broader search seems necessary, stop and choose a smaller, explicit scope instead.

