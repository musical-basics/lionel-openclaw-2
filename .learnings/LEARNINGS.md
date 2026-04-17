# LEARNINGS.md

> Structured record of corrections, insights, knowledge gaps, and best practices.
> Entry format:
> - Header: `## [LRN-YYYYMMDD-NNN] Short title`
> - Fields: `Status: pending|resolved|promoted`, `Context:`, `Learning:`, `Next Step:` or `Promoted To:`

## [LRN-20260417-001] Discord bot mentions need raw mention tokens
- Status: promoted
- Context: Lionel had me test repeated bot-to-bot pings between Openclaw 1, 2, and 3 in Discord.
- Learning: Reliable Discord bot pings require literal mention tokens like `<@1494663087373160580>` in the sent message. Plain display-name text like `@Openclaw 1` is not reliable, while multiple raw mention tokens can be sent in one message.
- Promoted To: `TOOLS.md`, `memory/2026-04-17.md`
