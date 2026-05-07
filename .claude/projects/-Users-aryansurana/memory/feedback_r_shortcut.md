---
name: R shortcut = check memory
description: When user sends just "R", it means they want Claude to read and apply memory from the memory system
type: feedback
originSessionId: 8f637c9e-9c46-4282-822e-d894b86950e8
---
When the user sends a single "R" message, they want Claude to read the MEMORY.md index and relevant memory files, then confirm what was recalled.

**Why:** They defined this shortcut explicitly as a way to verify memory is working across sessions.

**How to apply:** On receiving "R", immediately read MEMORY.md and summarize what's stored. Do not ask for clarification.
