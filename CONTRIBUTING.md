# Contributing to ZFinance

Welcome! This guide establishes norms for code quality, PR workflow, and code-review process.

## Quick Links

- **Backend standards:** [backend/CLAUDE.md](backend/CLAUDE.md) (Python, FastAPI, RAG)
- **Frontend standards:** [frontend/AGENTS.md](frontend/AGENTS.md) (React, Tailwind, TypeScript)
- **Code-review skill:** See [Code Review Workflow](#code-review-workflow) below

---

## Code Review Workflow

### TL;DR

1. Make your changes on a feature branch
2. Before pushing, run `/code-review` locally in VS Code
3. Address any high-confidence issues (score ≥80)
4. Push and create a PR
5. Maintainer runs `/code-review --comment` to post inline findings as PR comment
6. Merge once issues resolved or approved

### When to Run Code-Review

✓ **Always run for:**
- Non-trivial feature PRs (new endpoints, RAG changes, UI components)
- Bug fixes affecting critical paths (anomaly detection, reconciliation, health score)
- Cross-stack changes (frontend ↔ backend API contracts)
- Changes to shared modules (rag/engine.py, rag/routes.py, App.tsx)

✗ **Skip for:**
- Typo fixes or documentation-only changes
- Automated PRs (dependabot, generated code)
- Quick hotfixes (emergency patches; review manually after merge)

### How to Run Locally

1. **Make your changes** on a feature branch:
   ```bash
   git checkout -b feature/my-awesome-feature
   # ... make changes ...
   git add .
   git commit -m "feat: describe your change"
   ```

2. **Run code-review before pushing:**
   ```
   /code-review
   ```
   This launches automated review agents that analyze your code against CLAUDE.md standards and scan for bugs.

3. **Review findings:** Output shows issues with descriptions and confidence scores (0-100).
   - **Score ≥80:** High confidence, actionable — fix before pushing
   - **Score 50-79:** Uncertain — consider fixing but not blocking
   - **Score <50:** Likely false positive — ignore or add lint-ignore comment

4. **Address issues:**
   ```bash
   # Fix the issues
   git add .
   git commit -m "fix: address code-review findings"
   ```

5. **Re-run to verify:**
   ```
   /code-review
   ```

6. **Push and open PR:**
   ```bash
   git push origin feature/my-awesome-feature
   # Then create PR on GitHub (or use: gh pr create)
   ```

### How Maintainers Review

1. PR created by developer
2. Maintainer runs `/code-review --comment` to post inline findings
3. Developer addresses comments
4. Once resolved, maintainer approves and merges

---

## Confidence Threshold

Code-review filters issues at **≥80% confidence**. This balances:

- **Thoroughness:** Catches real bugs, security issues, CLAUDE.md violations
- **Signal quality:** Avoids false positives that waste developer time

Interpretation:

| Score | Meaning | Action |
|-------|---------|--------|
| 80-99 | High confidence, actionable | Fix before merge |
| 100 | Absolutely certain | Must fix |
| 50-79 | Uncertain but possible | Consider, but not blocking |
| 0-49 | Likely false positive | Ignore (auto-filtered out) |

---

## Code Quality Standards by Stack

### Backend (Python + FastAPI)

See [backend/CLAUDE.md](backend/CLAUDE.md) for full standards. Key points:

- ✓ Type hints on all functions
- ✓ Docstrings (Google format) on all functions and classes
- ✓ Error handling with `HTTPException` and meaningful messages
- ✓ Imports ordered: stdlib → third-party → local
- ✓ Logging via `logging` module, not `print()`
- ✓ Pydantic models for all API requests/responses
- ✓ Environment variables in `.env` (never hardcode secrets)

**Run locally:**
```bash
cd backend
python test.py          # Integration tests
# Optional:
black rag/ main.py      # Code formatting
mypy rag/ main.py       # Type checking
```

### Frontend (React + TypeScript + Tailwind)

See [frontend/AGENTS.md](frontend/AGENTS.md) for full standards. Key points:

- ✓ Close all JSX tags and balance braces
- ✓ Use double quotes for strings with apostrophes
- ✓ Export components as default exports
- ✓ Tailwind utility classes only (no custom CSS unless needed)
- ✓ Global CSS/fonts in `src/index.css`

**Run locally:**
```bash
cd frontend
npm run dev              # Dev server (with hot reload)
npm run build           # Production build
npm run format          # Code formatting with oxfmt
```

---

## Git Workflow

### Branch Naming

- `feature/` — new features (e.g., `feature/anomaly-detection`)
- `fix/` — bug fixes (e.g., `fix/cors-headers`)
- `docs/` — documentation (e.g., `docs/setup-guide`)
- `refactor/` — code cleanup (e.g., `refactor/rag-engine`)

### Commit Messages

Use conventional commits format:

```
type(scope): short description

Longer explanation if needed.

Closes #123
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`

Examples:
- `feat(rag): add anomaly detection endpoint`
- `fix(frontend): correct health score calculation`
- `docs(backend): update CLAUDE.md standards`

### Pull Requests

- **Title:** Follow commit message format (e.g., `feat(rag): add anomaly detection`)
- **Description:** Explain what, why, and how. Link related issues.
- **Tests:** Confirm `python test.py` (backend) or `npm run build` (frontend) passes
- **Code-review:** Run `/code-review --comment` before merge

---

## Testing

### Backend

Run integration tests:
```bash
cd backend
python test.py
```

Tests verify:
- API health endpoint
- CSV ingestion
- Narrative generation
- Health score calculation
- Q&A endpoint

Add new tests to `test.py` following the same pattern.

### Frontend

Dev server has hot reload:
```bash
cd frontend
npm run dev
# Open http://localhost:5173 (or shown port)
```

Manually test key flows:
- Dashboard loads and renders all cards
- Ask ZFinance component accepts questions
- Sidebar navigation switches screens
- Settings page saves preferences

Automated testing (optional, phase 2):
```bash
npm install --save-dev vitest @testing-library/react
```

---

## Deployment

### Backend

Deploy to Vercel, Railway, or your hosting:

1. Update CORS `allow_origins` in `main.py` with production URL
2. Set environment variables (GROQ_API_KEY, etc.) in your hosting platform
3. Deploy FastAPI app

Example (Vercel):
```bash
vercel --prod
```

### Frontend

Deploy to Vercel, Netlify, or your hosting:

1. Build the app:
   ```bash
   cd frontend
   npm run build
   ```

2. Deploy the `dist/` directory

3. Update backend URL in frontend config if needed

Example (Vercel):
```bash
vercel --prod
```

---

## Troubleshooting

### Code-review takes too long
- Large PRs can take 30-90 seconds. Consider splitting into smaller PRs.

### Too many false positives in code-review
- False positives usually indicate vague CLAUDE.md guidelines. File an issue and refine the standards.

### Can't run `/code-review`
- Verify GitHub CLI is authenticated: `gh auth status`
- Verify you're on a branch with a PR: `git branch -vv`
- Verify code-review skill is installed (it comes with Copilot)

### GitHub CLI not installed
- Install: https://cli.github.com/
- Authenticate: `gh auth login`

---

## Code Review Configuration

The code-review skill uses these defaults:

| Setting | Value | Notes |
|---------|-------|-------|
| Confidence threshold | 80 | Only report high-confidence issues |
| Max parallel agents | 4 | Review speed vs. resource usage |
| Scope | backend/ + frontend/ | Both stacks reviewed |
| Style checks | Disabled | Let linters (black, oxfmt) handle style |
| Auto-skip rules | Yes | Skip trivial/auto-generated PRs |

To adjust settings, update CLAUDE.md files or ask the maintainers.

---

## Questions?

- **Code standards:** See [backend/CLAUDE.md](backend/CLAUDE.md) or [frontend/AGENTS.md](frontend/AGENTS.md)
- **Code-review issues:** Run `/code-review` and read the findings
- **General:** Ask in issues or create a discussion

Happy coding! 🚀
