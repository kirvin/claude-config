# Claude Code Hooks

Hooks for `~/.claude/settings.json` that improve session visibility.

## Timestamp logging

Shows wall-clock time and elapsed duration on every turn. Useful for understanding how long responses take and for post-session analysis.

Add to your global `~/.claude/settings.json`:

```json
"hooks": {
  "UserPromptSubmit": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "TS=$(date '+%H:%M:%S'); EPOCH=$(date +%s); echo \"$EPOCH\" > /tmp/claude-turn-start.txt; echo \"$(date '+%Y-%m-%d %H:%M:%S') [USER]\" >> ~/.claude/session-timestamps.log; printf '{\"systemMessage\":\"⏱ %s\"}' \"$TS\""
        }
      ]
    }
  ],
  "Stop": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "TS=$(date '+%H:%M:%S'); EPOCH=$(date +%s); START=$(cat /tmp/claude-turn-start.txt 2>/dev/null || echo $EPOCH); ELAPSED=$((EPOCH - START)); echo \"$(date '+%Y-%m-%d %H:%M:%S') [CLAUDE +${ELAPSED}s]\" >> ~/.claude/session-timestamps.log; printf '{\"systemMessage\":\"⏱ %s (+%ss)\"}' \"$TS\" \"$ELAPSED\""
        }
      ]
    }
  ]
}
```

**What it does:**
- `UserPromptSubmit` — injects `⏱ HH:MM:SS` as a system message visible to Claude at the start of each turn; saves epoch to `/tmp/claude-turn-start.txt` for elapsed calculation
- `Stop` — shows `⏱ HH:MM:SS (+Xs)` at the end of each Claude turn; appends both events to `~/.claude/session-timestamps.log`

**Also enable native turn duration display** (separate setting):
```json
"showTurnDuration": true
```

## Session context hooks

The `SessionStart` and `PreCompact` hooks run `bd prime` to inject beads workspace context at the start of each session and before context compaction. These are already included in this repo's `.claude/settings.json` template and are only relevant when using beads.
