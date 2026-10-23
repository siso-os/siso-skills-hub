# ADR-011 — A named folder IS the dependency boundary (directed-arrow rule)

- **Principle:** P11
- **Status:** ACCEPTED · **Classification: UNIVERSAL** (corpus-corroborated)
- **Layer:** Universal code-layout

## Context

Domain partitioning (ADR-001) puts each feature in its own folder, but a folder is only a *real* boundary if crossing it is constrained. If any file can import any other file regardless of folder, the domain tree is cosmetic — coupling leaks everywhere and the "boundary" is a suggestion. Agents (and humans) then cannot reason about blast radius from the folder structure, defeating the whole point of the layout.

## Decision

A **named folder IS the dependency/effect boundary**, governed by a **directed-arrow rule:** the **core depends on nothing; outer layers point inward** (dependency inversion as a layout law). The arrows go one way only — inner layers never reach outward. This is READ/dependency isolation across the *standing* tree, complementary to worktree write-isolation across *tasks* (ADR-012).

The boundary is enforced executably (ADR-002): forbidden cross-folder imports are a failing build/lint, not a convention. Reference: oracle's dependency-cruiser forbids `renderer↔main` imports.

## Consequences

- Blast radius is readable from the folder graph: if `outer/` points at `core/` and never vice versa, a change to `outer/` cannot break `core/`. An agent reasons about impact from structure alone.
- Enables the contract-assembly rule (ADR-001): cross-module access flows only through the explicit inward-pointing contract, never a back-channel import.
- Requires an executable gate to be real (ADR-011 without ADR-002 is just a diagram). Until the gate is at zero violations it stays warn+ratchet (ADR-003/ADR-005).
- Pairs with the explicit export surface (ADR-001/P12): the boundary is only enforceable if each folder declares what it exports.

## When this applies

Any code tree partitioned into folders that are meant to be boundaries — i.e. any domain-partitioned tree (ADR-001). If the folders aren't boundaries, you don't have domains, you have directories.

## Evidence

UNIVERSAL — `create-t3-app` (`server/` boundary), `halogen-realworld` (`Capability/` + `Api/`), `eShopOnWeb` (dependency inversion as layout law). Reference wiring: oracle's dependency-cruiser forbidding renderer↔main. Source: GQ-001 ANSWER.html, External Corpus Pass net-new principle P11, Oracle deep-wiring pass (P11 folder-is-boundary).
