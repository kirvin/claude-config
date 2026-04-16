# Session Close

When the user wants to end the session, clear context, or hand off work, load
the `session-close` project skill.

## Trigger phrases

Load `session-close` when the user says things like:
- "wrap up", "let's wrap", "closing out"
- "I'm done for now", "that's it for today", "stopping here"
- "save context", "save session", "save my place"
- "generate handoff", "handoff notes", "next session instructions"
- "before I clear", "before I /clear", "before I exit"
- "session close", "/session-close"

## What the skill does

1. Updates in-progress beads issues with a `## Session State` block
2. Pushes git + beads dolt to remote
3. Prints a handoff block with branch state, in-progress issues, and next recommended action

The handoff block is what makes the next session productive without re-reading
this conversation.
