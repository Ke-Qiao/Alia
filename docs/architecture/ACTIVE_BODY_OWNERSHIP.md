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

Physical availability is not active ownership. `physicalAvailable=true` means
the physical bust can be used. `physicalAvailable=false` means the physical bust
must not acquire active ownership, but it does not automatically make the Web
Avatar active.

While `physicalAvailable=false`, presence, mock sensor, and physical-side
acquire requests for physical ownership are rejected. Decision logs must use
clear unavailable reasons such as `physical_unavailable_presence_rejected`,
`physical_unavailable_mock_sensor_rejected`, or
`physical_unavailable_physical_acquire_rejected`.

If the physical bust becomes unavailable while `activeBody` is `physical`, the
server releases `activeBody` to `none` and logs
`physical_unavailable_released_active_body`. Web may acquire ownership afterward
only through a Web active request.

## v0.1 Conflict Rule

If both bodies request active ownership, the server must resolve the conflict
explicitly and log the reason. The default product priority is physical bust
first, because the bust is the primary body. The Web Avatar remains the fallback
body when the physical bust is unavailable or intentionally inactive.

If physical is available, simultaneous physical and Web requests resolve to
physical with a `physical_priority` reason. If physical is unavailable, the same
conflict resolves to Web as fallback with a reason that includes
`physical_unavailable` and `fallback`; the server must not log
`physical_priority` for that unavailable case.

## Safety Notes

Physical sleep pose must use conservative fixed angles. Do not add real servo
control until hardware limits, calibration, timeout behavior, and emergency stop
assumptions are documented.
