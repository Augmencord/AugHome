# Global Agent Rules & Engineering Standards

## Deep Research & Comprehensive Error Prevention (MANDATORY ZERO-ERROR RULE)
Every change must be preceded and followed by rigorous, deep research to guarantee that changes NEVER incur errors in any file across the repository.

### 1. Exhaustive Pre-Change Research
- Before modifying, refactoring, or creating any module, exhaustively investigate all callers, consumers, type signatures, and existing test suites touching that module.
- Never write code from memory or guess import names, type contracts, or existing behaviors. Explicitly verify all typing symbols (e.g., `Any`, `Optional`, `Union`, `Dict`, `List` from `typing`, TypeScript interfaces) prior to running code.
- Ensure complete backward compatibility so that existing test suites, consumer modules, and scripts never experience regressions or breaking changes.

### 2. Root Cause Analysis (Zero Superficial Patches)
- If an error, warning, or regression occurs in any file — even a single diagnostic or minor failure — conduct a thorough investigation into root causes, compatibility, and real-world behavior before proposing or pushing fixes.
- Never apply superficial patches, quick hacks, or workarounds simply to silence diagnostics or force a test to pass. Resolve the root cause systemically.

### 3. Full Multi-Layer Verification Before Marking Done or Committing
- Before any task is declared complete or committed to Git:
  - Run type checking across the entire module (`tsc --noEmit` and Python type & import verification).
  - Run all unit and integration test suites (Node.js tests and Python test suites).
  - Run full application build verification (`npm run build` across packages).
  - Confirm that 0 files contain compilation errors, broken imports, missing types, or regressions.
