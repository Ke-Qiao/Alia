# Project Charter

## Identity

Project Alia Rebuild is an embodied emotional companion system. Alia has a
physical bust body and a Web 3D Avatar digital body. The server acts as a
Brain-lite coordination layer for state, ownership, proactive behavior, and
expression routing.

## v0.1 Goal

v0.1 demonstrates a soft-hardware linked proactive interaction loop without
requiring real hardware:

1. A mock perception event is emitted.
2. Brain-lite updates state and evaluates a simple proactive policy.
3. Active Body Ownership decides which body may express.
4. An expression intent is generated.
5. The intent is dispatched to either the Web Avatar or the physical bust mock.
6. The system records an explainable decision log.

## Product Principles

- The physical bust is the primary product body.
- The Web 3D Avatar is Alia's digital body, not merely an admin dashboard.
- Mock sensors and scripted hardware simulation are first-class product inputs.
- Only one body may be active at a time.
- Every v0.1 behavior should support embodied companionship rather than generic
  assistant breadth.

## v0.1 Non-goals

- Complex Agent tool system.
- Plugin marketplace.
- Smart home platform.
- Complex long-term memory.
- Full VRChat integration.
- Production authentication.
- Autonomous daydream system.
- Real LLM, TTS, database, or hardware integrations.

## Success Criteria

- A contributor can install the monorepo with pnpm.
- The repository clearly separates server, Web Avatar, embedded mock, protocol,
  and core packages.
- The v0.1 scope is documented before implementation starts.
- Active Body Ownership is documented as a hard product rule.
