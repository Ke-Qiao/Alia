# Agent Tasks

This folder records scoped implementation tasks for Codex or other engineering
agents working on Project Alia Rebuild.

## Task Rules

- Keep tasks aligned with the v0.1 vertical slice.
- Prefer mock-first implementation.
- Preserve Active Body Ownership.
- Do not add real LLM, TTS, database, auth, plugin, or hardware integrations
  without a decision record.
- If scope expands, update `docs/decisions` before implementing it.

## Suggested Next Tasks

1. Define shared protocol types for mock perception events, ownership state,
   expression intents, dispatch results, and decision logs.
2. Add a minimal Brain-lite server entrypoint that can consume one mock event.
3. Add embedded mock scripts for deterministic sensor events.
4. Add Web Avatar mode stubs for active and rest states.
5. Add tests around active body ownership transitions.
