# Active Body Ownership

Active Body Ownership, also called Embodiment Ownership, is the rule that only
one Alia body may be active at a time.

## Bodies

- Physical bust: the primary product body.
- Web 3D Avatar: Alia's digital body.

## Required Modes

When the physical bust is active:

- the Web Avatar enters rest mode;
- eyes are closed;
- head is lowered;
- posture is low-presence.

When the Web Avatar is active:

- the physical bust enters sleep pose;
- head is lowered;
- eyes are closed;
- servos are held at fixed safe angles.

## Server Responsibility

The Brain-lite server is the owner of body ownership state. Dispatch targets
should not independently decide that they are active. They should render or
simulate the mode assigned by the server.

## v0.1 Conflict Rule

If both bodies request active ownership, the server must resolve the conflict
explicitly and log the reason. The default product priority is physical bust
first, because the bust is the primary body. The Web Avatar remains the fallback
body when the physical bust is unavailable or intentionally inactive.

## Safety Notes

Physical sleep pose must use conservative fixed angles. Do not add real servo
control until hardware limits, calibration, timeout behavior, and emergency stop
assumptions are documented.
