# FEATURE_REQUESTS.md

> Structured record of user asks that could not be completed yet.
> Entry format:
> - Header: `## [FEAT-YYYYMMDD-NNN] Short title`
> - Fields: `Status: pending|resolved|promoted`, `Requested By:`, `Need:`, `Blocker:`, `Next Step:`

## [FEAT-20260417-001] Push workspace repo to GitHub remote

- Status: pending
- Requested By: Lionel
- Need: Push `/home/openclaw/.openclaw/workspace` to `https://github.com/musical-basics/lionel-openclaw-2.git`.
- Blocker: No GitHub HTTPS credentials or authenticated CLI session are available in this environment.
- Next Step: Once GitHub auth is configured, run `git push -u origin main` from the workspace.
