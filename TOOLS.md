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
- MusicalBasics server default channel for shared posts is `#general` (`guild_id: 1492055285240692866`, `channel_id: 1492055285240692869`) unless Lionel says otherwise.

Add whatever helps you do your job. This is your cheat sheet.
