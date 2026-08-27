# ZFinance — Project-Wide Coding Standards

ZFinance is an AI-powered financial dashboard with a React frontend and FastAPI backend. This document establishes project-wide norms for consistency across both stacks.

## Stack-Specific Standards

- **Backend (Python + FastAPI):** See [backend/CLAUDE.md](backend/CLAUDE.md)
- **Frontend (React + TypeScript):** See [frontend/AGENTS.md](frontend/AGENTS.md)

## Cross-Stack Standards

### 1. Clarity & Documentation

**Every function, class, and module must be clearly documented:**

- Functions: Docstrings with args, returns, raises
- Classes: Class-level docstrings explaining responsibility
- Modules: File-level docstrings explaining purpose
- Comments: Inline comments for non-obvious logic

Both stacks follow this principle:
- Backend: Google-style docstrings
- Frontend: JSDoc comments (or simple inline comments for complex logic)

### 2. Type Safety

**Leverage language type systems to catch errors early:**

- **Backend:** Type hints on all functions (`def func(x: int) -> str`)
- **Frontend:** TypeScript, no `any` types without justification

Example across stacks:
```python
# backend/engine.py
def generate_narrative(self, business_id: str, week: str) -> str:
    """Generate narrative from financial data."""
```

```typescript
// frontend/src/screens/AskZFinance.tsx
interface AskRequest {
  business_id: string;
  question: string;
  week?: string;
}

function AskZFinance() {
  const [query, setQuery] = useState<string>("");
```

### 3. Error Handling

**All errors must be handled gracefully with meaningful messages:**

- **Backend:** Use `HTTPException` with status codes and context
- **Frontend:** Catch promise rejections, show user-friendly toast notifications (not console errors)

✓ Backend example:
```python
try:
    df = pd.read_csv(file)
except Exception as e:
    raise HTTPException(400, f"Invalid CSV: {e}")
```

✓ Frontend example:
```typescript
async function askQuestion(q: string) {
  try {
    const res = await fetch("/api/rag/ask", { method: "POST", body: JSON.stringify(q) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (e) {
    showToast("error", "Failed to ask question. Try again.");
    console.error(e);
  }
}
```

### 4. Imports & Organization

**Consistent import ordering across stacks:**

**Backend (Python):**
```python
# Standard library
import os
import json

# Third-party
import pandas as pd
from fastapi import FastAPI

# Local
from rag.engine import ZFinanceRAG
```

**Frontend (TypeScript):**
```typescript
// Third-party
import React, { useState } from "react";

// Local components
import { Card } from "@/components/ui/Card";
import { useStore } from "@/store/useStore";
```

### 5. Configuration & Secrets

**Never hardcode configuration or secrets:**

- **Backend:** Use `.env` file and `os.getenv()`
- **Frontend:** Use `.env` file and `import.meta.env.VITE_*`

Example backend (`.env`):
```
GROQ_API_KEY=gsk_...
LLM_PROVIDER=groq
CHROMA_PATH=./chroma_db
```

Example frontend (`.env`):
```
VITE_API_URL=http://localhost:8000
VITE_LOG_LEVEL=info
```

Access:
```python
# backend
api_key = os.getenv("GROQ_API_KEY", "")
```

```typescript
// frontend
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
```

### 6. Code Organization

**Group related code together, separate concerns:**

- **Backend:** One responsibility per module (engine.py, routes.py, chunker.py, anomaly.py)
- **Frontend:** Components by feature (overview/, screens/, ui/); shared logic in store/ or utils/

Example frontend structure:
```
src/
  components/
    ui/          ← Reusable UI components (Button, Card, Badge)
    layout/      ← Page layout (Sidebar, TopBar)
    overview/    ← Dashboard widgets (KPICards, HealthScoreGauge)
  screens/       ← Full-page components (Overview, Transactions, Reconciliation)
  store/         ← State management (AppProvider, useStore)
  data/          ← Mock data, types
```

### 7. Testing

**Test critical paths; document test assumptions:**

- **Backend:** Integration tests in `test.py` (verify API endpoints work end-to-end)
- **Frontend:** Manual testing (hot reload); automated testing optional (phase 2)

Backend test example:
```python
def test_narrative_generation():
    # Ingest sample data
    ingest_response = requests.post("/api/rag/ingest", files={...})
    assert ingest_response.status_code == 200
    
    # Generate narrative
    narrative_response = requests.post("/api/rag/narrative", json={...})
    assert narrative_response.status_code == 200
    assert "narrative" in narrative_response.json()
```

### 8. Git Workflow

**Consistent commit messages and branch naming across both stacks:**

Branch naming:
- `feature/` — new features
- `fix/` — bug fixes
- `docs/` — documentation
- `refactor/` — code cleanup

Commit messages (conventional commits):
```
type(scope): description

Longer explanation if needed.

Closes #123
```

Examples:
- `feat(rag): add anomaly detection endpoint`
- `fix(frontend): correct health score gauge rendering`
- `docs: update code review workflow`

### 9. Code Review

**All meaningful PRs go through automated code-review before merge:**

See [CONTRIBUTING.md](CONTRIBUTING.md#code-review-workflow) for full workflow.

- Developers run `/code-review` locally before pushing
- Maintainers run `/code-review --comment` after PR creation
- Issues with confidence ≥80 must be resolved before merge
- Frontend and backend are reviewed together (cross-stack consistency checked)

### 10. Logging

**Use structured logging, not print/console.log:**

- **Backend:** Python `logging` module
- **Frontend:** console (but consider structured logger in phase 2)

Backend example:
```python
import logging
log = logging.getLogger("zfinance.rag")
log.info(f"Ingesting {len(df)} rows for business {business_id}")
log.error(f"LLM failed: {e}")
```

Frontend example (for now):
```typescript
console.log("[INFO] Loading data...");
console.error("[ERROR] Failed to fetch:", e);
```

---

## API Contract (Frontend ↔ Backend)

### Request Format

All API requests from frontend → backend use JSON:

```typescript
// Frontend
const response = await fetch("http://localhost:8000/api/rag/narrative", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ business_id: "acme", week: "week1" })
});
```

```python
# Backend expects Pydantic model
class NarrativeRequest(BaseModel):
    business_id: str
    week: str

@router.post("/narrative")
async def narrative(req: NarrativeRequest):
    return {"narrative": "..."}
```

### Response Format

All responses are JSON with consistent structure:

```json
{
  "business_id": "acme",
  "week": "week1",
  "result": "...",
  "status": "ok"
}
```

Or on error:
```json
{
  "detail": "Invalid business_id"
}
```

---

## Incident Response

### Quick Hotfix

1. Create `fix/hotfix-description` branch
2. Fix the issue
3. Push and create PR (skip full code-review if urgent)
4. Merge after quick manual review
5. Tag release: `git tag v0.1.x`

### Post-Incident Review

After merge:
- Document what happened in PR comments
- Update CLAUDE.md if prevention is needed
- Schedule code-review of surrounding code

---

## Deployment & Release

### Version Bumping

Follow semantic versioning (major.minor.patch):
- `0.1.0` → `0.1.1` (patch: bug fixes)
- `0.1.0` → `0.2.0` (minor: features)
- `0.1.0` → `1.0.0` (major: breaking changes)

File: Update `version` in:
- Backend: `main.py` (FastAPI `version="0.1.0"`)
- Frontend: `package.json` (`"version": "0.1.0"`)

### Release Checklist

- [ ] All PRs merged to main
- [ ] All tests pass
- [ ] Version bumped in backend + frontend
- [ ] CHANGELOG updated
- [ ] Tag created: `git tag v0.1.x`
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] CORS URLs updated in backend

---

## Tools & Linting (Optional, Phase 2)

Once adopted by the team:

**Backend:**
- `black` — code formatting
- `mypy` — type checking
- `pytest` — unit testing

**Frontend:**
- `eslint` — linting
- `prettier` — code formatting
- `vitest` — unit testing

Add to `requirements.txt` (backend) and `package.json` (frontend) once ready.

---

## FAQ

**Q: Should I run code-review on every commit?**
A: No, run before pushing to main/creating a PR. Local iterations don't need review.

**Q: What if code-review finds false positives?**
A: File an issue with the finding and refine CLAUDE.md standards. Add lint-ignore comments if appropriate.

**Q: Can I skip code-review for urgent fixes?**
A: Yes, for true emergencies. But schedule a post-incident review of the fix.

**Q: How do I report a bug?**
A: Create an issue on GitHub with: (1) what happened, (2) expected behavior, (3) steps to reproduce, (4) backend/frontend/both.

---

## See Also

- [backend/CLAUDE.md](backend/CLAUDE.md) — Python/FastAPI standards
- [frontend/AGENTS.md](frontend/AGENTS.md) — React/TypeScript standards
- [CONTRIBUTING.md](CONTRIBUTING.md) — PR workflow and code-review guide
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
