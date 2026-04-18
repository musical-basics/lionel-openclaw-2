# Workspace Structure

Source of truth used for this local reorganization: Lionel's standard structure as summarized by Openclaw Commander on 2026-04-18.

## Layout

- Root: bot system files and assistant memory (`AGENTS.md`, `SOUL.md`, `USER.md`, `MEMORY.md`, `memory/`, `.learnings/`, `.openclaw/`, and related workspace-control files)
- `projects/`: project repos, kept out of the workspace git history
- `plans/`: active specs and implementation plans
- `docs/`: reference docs
- `data/`: local data and state files
- `deploy/`: deployment configs and deployment-oriented scripts
- `reports/`: status notes, audit notes, and one-off reports

## Current project repo placement

- Ultimate Pianist: `/home/openclaw/.openclaw/workspace/projects/ultimate-pianist`

## Notes

- The workspace `.gitignore` ignores `projects/` so nested repos remain independent.
- The old root-level Ultimate Pianist code copies were removed after the repo was moved under `projects/`.
