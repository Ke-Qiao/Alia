# ADR-0001: Clean Rebuild from Reference

## Status

Accepted

## Context

The old Project Alia repository contains useful reference ideas, but it was
closer to a modular AI assistant platform than the new embodied emotional
companion product direction.

## Decision

Project Alia Rebuild starts as a clean TypeScript-first monorepo. The old
repository is reference material only. Code, architecture, and product scope
should not be copied directly unless a future decision record explains why.

## Consequences

- v0.1 can stay focused on embodied companionship rather than assistant breadth.
- Old modules such as complex tools, plugins, memory, and smart home integration
  do not enter the new codebase by default.
- Any reuse from the old repository must be deliberate and documented.
