# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## Discord

- Real Discord file attachments work when sent through the `message` tool with a `filePath` (and usually a `filename`).
- `MEDIA:...` lines in a normal assistant reply are only a fallback hint, not a true Discord upload, and may fail to appear as attachments.
- For sending files back to Lionel on Discord, prefer the real send path over reply-inline media hints.
- For Discord code or migration review, send the actual source files as file attachments instead of fragmented inline code blocks.
- When a reviewer asks for files one at a time, send one complete file per message in the requested order.
- If Discord blocks a `.js` attachment, resend it with `.html` appended to the filename and explicitly say it contains code content, not actual HTML.
- MusicalBasics server default channel for shared posts is `#general` (`guild_id: 1492055285240692866`, `channel_id: 1492055285240692869`) unless Lionel says otherwise.
- For bot-to-bot pings in Discord, use literal mention tokens like `<@1494663087373160580>` in the sent message. Plain display-name text like `@Openclaw 1` is not reliable.
- Multiple bot mentions can be sent in the same Discord message, for example `<@1494656974732656681> <@1494663087373160580>`, and both bots should receive the ping when channel settings allow it.

Add whatever helps you do your job. This is your cheat sheet.
