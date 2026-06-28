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

## v0.1 Acquisition Policy

`activeBody` is the only active ownership state and must be exactly one of:
`physical`, `web`, or `none`.

When `activeBody` is `physical`, Web Avatar active ownership requests are
rejected or deferred. The Web Avatar must remain in rest mode and the decision
log must explain that the physical body is currently active.

When `activeBody` is `web`, normal physical-side presence or mock sensor events
must not automatically take ownership. The physical bust must remain or enter
sleep pose and the decision log must explain that the Web body is currently
active.

When `activeBody` is `none`, either body may acquire ownership according to the
event: `presence.detected` may acquire `physical`, and `web.session.started` may
acquire `web`. The inactive body still receives its required rest or sleep mode.

## v0.1 Conflict Rule

If both bodies request active ownership, the server must resolve the conflict
explicitly and log the reason. The default product priority is physical bust
first, because the bust is the primary body. The Web Avatar remains the fallback
body when the physical bust is unavailable or intentionally inactive.

Physical availability is not the same as active ownership. `available` means the
physical bust can be used; it does not mean the physical bust is currently
active. Web may become active while the physical bust is available if
`activeBody` is `none`, but Web must not become active while `activeBody` is
`physical`.

## Safety Notes

Physical sleep pose must use conservative fixed angles. Do not add real servo
control until hardware limits, calibration, timeout behavior, and emergency stop
assumptions are documented.
