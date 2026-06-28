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

For v0.1, active ownership is represented by exactly one `activeBody` value:
`physical`, `web`, or `none`. A body that is merely available is not active.
Physical availability means the bust can be used; it does not block Web
ownership when `activeBody` is `none`.

If `activeBody` is `physical`, Web active requests are rejected or deferred and
the Web Avatar remains in rest mode. If `activeBody` is `web`, normal
physical-side presence or mock sensor events do not automatically acquire
physical ownership; the physical bust remains in sleep pose. If both bodies
request active ownership in the same conflict window, v0.1 resolves to physical
priority and logs the reason.

## Consequences

- Ownership state becomes a core protocol concept.
- Body runtimes should render assigned modes rather than independently choosing
  active status.
- Physical bust availability affects fallback choices only when no body is
  currently active; availability alone is not active ownership.
- Real servo sleep poses require explicit safety documentation before hardware
  implementation.
