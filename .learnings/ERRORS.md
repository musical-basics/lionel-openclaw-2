# ERRORS.md

> Structured log of command or tool failures with exact error output.
> Entry format:
> - Header: `## [ERR-YYYYMMDD-NNN] Short title`
> - Fields: `Status: pending|resolved|promoted`, `Context:`, `Error Output:`, `Resolution:`, `Promoted To:` when applicable

## [ERR-20260417-001] Git commit blocked by missing author identity

- Status: resolved
- Context: Initial workspace commit attempt during bootstrap
- Error Output:
  ```text
  Author identity unknown

  *** Please tell me who you are.

  Run

    git config --global user.email "you@example.com"
    git config --global user.name "Your Name"

  to set your account's default identity.
  Omit --global to set the identity only in this repository.

  fatal: unable to auto-detect email address (got 'openclaw@lionel-openclaw-2.(none)')
  ```
- Resolution: Configured repo-local `user.name` and `user.email`, then retried the commit successfully.
- Promoted To: none yet
