# AGENTS.md

## Project Identity

Project Alia Rebuild is an embodied emotional companion system with a physical
bust body, a Web 3D Avatar digital body, and a Brain-lite server.

## v0.1 Scope

v0.1 is a soft-hardware linked proactive interaction loop:
mock sensor event -> Brain-lite state/policy -> active body ownership ->
expression intent -> Web Avatar or physical bust mock dispatch -> explainable
decision log.

## Explicit Non-goals

Do not build a complex Agent tool system, plugin marketplace, smart home
platform, complex long-term memory, full VRChat integration, production auth,
autonomous daydream system, real LLM/TTS/database integrations, or real hardware
drivers in v0.1.

## Mock-first Rule

Hardware is currently unavailable. Mock sensors, scripted events, and simulated
actuators are first-class requirements, not temporary afterthoughts.

## Active Body Ownership Rule

Only one Alia body may be active at a time. If the physical bust is active, the
Web Avatar must rest with closed eyes, lowered head, and low-presence posture.
If the Web Avatar is active, the physical bust must sleep with lowered head,
closed eyes, and servos at fixed safe angles.

## Coding Expectations

Make minimal, maintainable TypeScript-first changes. Preserve the skeleton
architecture, keep modules separated, avoid new dependencies unless necessary,
and do not copy old Project Alia code by default.

## Testing Expectations

Run the most relevant available checks before finishing. Placeholder scripts
must say they are placeholders and must not imply real coverage.

## Scope Control

Codex must not expand v0.1 scope without updating `docs/decisions` with the
reason, decision, and consequences.
