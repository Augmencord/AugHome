# AugHome IDE Workspace Rules

## Deep Research & Comprehensive Error Prevention (MANDATORY)
Every change must be preceded and followed by rigorous, deep research to ensure changes NEVER incur errors in any file across the repository:

1. **Exhaustive Pre-Change Research**:
   - Before writing or editing any file, thoroughly research and inspect all files in the dependency chain, consumer modules, and existing test suites.
   - Verify every import explicitly (e.g. `Any`, `Optional`, `Dict`, `List`, `Union` in Python, or exported interfaces in TypeScript). Never rely on assumptions or omit typing symbols.
   - Preserve 100% backward compatibility with existing tests and consumer contracts.

2. **Root Cause Analysis (Zero Superficial Patches)**:
   - If an error, warning, or regression occurs in any file — even a single diagnostic or minor failure — conduct a thorough investigation into root causes, compatibility, and real-world behavior before proposing or pushing fixes.
   - Never apply superficial patches or quick hacks simply to silence diagnostics.

3. **Complete Multi-Layer Local Verification**:
   - Verify full end-to-end functionality locally before marking tasks complete or pushing code:
     - Type checks (`tsc --noEmit` and Python import/type checks).
     - Test suites (`node --test tests/*.test.js` and `python -m unittest discover`).
     - Build verification (`npm run build`).
   - Confirm 0 errors, 0 broken imports, and 0 regressions in any file.
