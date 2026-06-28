# ADR-0002: Mock-first Hardware Strategy

## Status

Accepted

## Context

The physical bust hardware is currently unavailable. Waiting for real hardware
would block the v0.1 demo and obscure product decisions around perception,
ownership, proactive behavior, and expression.

## Decision

Mock sensors, scripted events, and simulated actuators are first-class v0.1
requirements. The repository includes an `apps/embedded-mock` workspace from the
start.

## Consequences

- The first vertical slice can be developed and tested without hardware.
- Protocols must be clear enough that real hardware can replace mocks later.
- Mock behavior should not be treated as throwaway code; it is part of the demo
  and development workflow.
- Real hardware control remains out of scope until safety limits and operating
  assumptions are documented.
