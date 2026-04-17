# FEATURE_REQUESTS.md

> Structured record of user asks that could not be completed yet.
> Entry format:
> - Header: `## [FEAT-YYYYMMDD-NNN] Short title`
> - Fields: `Status: pending|resolved|promoted`, `Requested By:`, `Need:`, `Blocker:`, `Next Step:`

## [FEAT-20260417-001] Push workspace repo to GitHub remote

- Status: pending
- Requested By: Lionel
- Need: Push `/home/openclaw/.openclaw/workspace` to `https://github.com/musical-basics/lionel-openclaw-2.git`.
- Blocker: The configured remote is correct, but the provided GitHub token does not have permission to push to that repository.
- Next Step: Retry with a GitHub token that has write access to `musical-basics/lionel-openclaw-2`, or switch to an SSH remote with an authorized key.
