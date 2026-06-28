# v0.1 Vertical Slice

## Purpose

The first implementation should prove that Alia can react proactively through a
mock-first embodied loop without depending on unavailable hardware.

## Slice

1. Mock event source emits a scripted perception event.
2. Brain-lite receives the event and updates state.
3. Brain-lite evaluates active body ownership.
4. Brain-lite runs a simple proactive policy.
5. Brain-lite creates an expression intent.
6. Dispatch sends the intent to the selected active body.
7. The inactive body receives rest or sleep mode.
8. An explainable decision log records the event, state, decision, and dispatch.

## Example Mock Events

- user_approached
- user_left
- web_avatar_opened
- physical_bust_available
- physical_bust_unavailable

These names are examples only. The protocol package should define final event
names before implementation.

## Out of Scope for the Slice

- Real speech recognition.
- Real text-to-speech.
- Real LLM calls.
- Real camera, microphone, GPIO, servo, or sensor I/O.
- Database-backed memory.
- Production authentication.
- Plugin or tool marketplace.

## Completion Bar

The first real vertical slice is complete only when the mock event, ownership
decision, expression intent, dispatch result, inactive-body mode, and decision
log can be observed end to end.
