# ADR-0003: Active Body Ownership

## Status

Accepted

## Context

Alia has a physical bust body and a Web 3D Avatar digital body. If both bodies
act as active Alia at the same time, the product identity becomes incoherent and
the user experience weakens.

## Decision

The system enforces Active Body Ownership: only one body may be active at a
time. The Brain-lite server owns this state and dispatches active, rest, or
sleep modes to bodies.

When the physical bust is active, the Web Avatar rests with closed eyes, lowered
head, and low-presence posture. When the Web Avatar is active, the physical bust
sleeps with lowered head, closed eyes, and servos at fixed safe angles.

## Consequences

- Ownership state becomes a core protocol concept.
- Body runtimes should render assigned modes rather than independently choosing
  active status.
- Physical bust availability affects whether the Web Avatar becomes the active
  fallback body.
- Real servo sleep poses require explicit safety documentation before hardware
  implementation.
