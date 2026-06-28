# Project Alia Rebuild

Project Alia Rebuild is a mock-first embodied emotional companion system.

v0.1 focuses on a soft-hardware linked proactive interaction demo:
mock sensor event -> Brain-lite server -> active body ownership -> Web Avatar / physical bust mock expression.

## Product Direction

Alia is not a generic AI assistant platform. The product is an embodied
emotional companion with two possible bodies:

- a physical bust, which is the primary product body;
- a Web 3D Avatar, which is Alia's digital body rather than an admin dashboard.

Only one body may be active at a time. This rule is called Active Body
Ownership or Embodiment Ownership.

## v0.1 Scope

The v0.1 rebuild is intentionally small:

- Brain-lite server state management;
- active body ownership;
- mock perception events and scripted hardware simulation;
- simple proactive policy;
- expression intent generation;
- dispatch targets for the Web Avatar and physical bust mock;
- explainable decision logs.

The old Project Alia repository is a reference only. Code should not be copied
or expanded from it by default.

## Workspace Layout

```text
apps/
  server/          Brain-lite server placeholder
  web/             Web 3D Avatar placeholder
  embedded-mock/   Mock sensor and hardware runtime placeholder
packages/
  protocol/        Shared protocol contract placeholder
  core/            Shared core behavior placeholder
docs/
  product/         Product charter and scope
  architecture/    System architecture notes
  decisions/       Architecture decision records
  agent-tasks/     Agent handoff and task notes
```

## Commands

This repository uses pnpm workspaces.

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
```

The current scripts are explicit placeholders. They verify workspace wiring but
do not claim real linting, type coverage, or test coverage yet.
