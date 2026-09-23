# Implementation plan

This is the living execution plan for the assessment. Every phase states why it exists,
what it produces, and how completion is verified.

## Status legend

- `[x]` complete and verified
- `[~]` in progress
- `[ ]` not started

## 1. Project foundation `[x]`

### Why

Create an isolated, reproducible project without affecting unrelated workspace files.
Make scope and assumptions visible before implementation details accumulate.

### Deliverables

- independent Git repository;
- one TypeScript package with client, server, and shared source areas;
- strict TypeScript configurations;
- development, build, test, and start scripts;
- documented product scope and assumptions;
- locked dependency tree with no reported npm vulnerabilities.

### Acceptance

- dependencies install successfully;
- `package-lock.json` exists;
- unsupported Node engine warnings are resolved;
- repository contains no credentials or environment-specific paths.

## 2. Domain model and route rules `[x]`

### Why

The map file has no explicit edges. Rendering and editing cannot be correct until the
relationship between coordinates, directions, and neighbor distance is deterministic.

### Deliverables

- shared TypeScript types and Zod schema;
- nearest aligned neighbor algorithm;
- directed route inference;
- semantic errors and warnings;
- source map copied from the assessment;
- unit tests for coordinate conventions and boundary cases.

### Acceptance

- North means increasing X and West means increasing Y;
- diagonal nodes never connect;
- the nearest eligible node is selected;
- distance equal to `maxNeighborDistance` is accepted;
- `code: 0` and negative integer coordinates remain valid;
- all domain tests and strict type checks pass.

## 3. REST API and persistence `[x]`

### Why

The assessment requires the editor to load and save through an HTTP server. The server
must independently protect the source file even if the client sends invalid data.

### Deliverables

- `GET /api/health`;
- `GET /api/map` returning the map and diagnostics;
- `PUT /api/map` with schema and semantic validation;
- atomic JSON persistence using a same-directory temporary file and rename;
- production static-file serving;
- API and file-storage tests.

### Acceptance

- malformed input returns 400 and is not saved;
- semantic blocking errors return 422 and are not saved;
- warning-only maps can be saved;
- saved data survives a server restart;
- unexpected storage errors return 500 without exposing internal paths;
- tests, type checks, and a real API smoke test pass.

## 4. Read-only engineering workbench `[x]`

### Why

Prove the coordinate transform and route model visually before adding editing behavior.

### Deliverables

- toolbar, explorer, central canvas, inspector, diagnostics, and status bar shell;
- initial loading, empty, and error states;
- SVG rendering for nodes and directed routes;
- charger and chute visual treatment;
- labels, legend, millimeter units, and a North/West compass;
- auto-fit to the supplied map.

### Acceptance

- all supplied nodes render inside the viewport;
- route arrows match known examples from the assessment;
- selecting a node highlights it and its incoming/outgoing routes;
- the inspector displays exact source values;
- keyboard and pointer selection both work.

## 5. Core map editing `[x]`

### Why

Turn the viewer into the editor requested by the assessment while preserving exact
physical coordinate entry.

### Deliverables

- edit X, Y, code, name, and outgoing directions;
- add and remove charger/chute configuration;
- edit `maxNeighborDistance`;
- add and delete nodes;
- live route recomputation;
- dirty-state tracking and save action;
- save success and retryable failure feedback.

### Acceptance

- every field in the supplied file format is editable;
- invalid field input is explained near the field;
- deleting or moving a node updates routes and diagnostics immediately;
- save followed by reload preserves the edited map;
- API failure never discards unsaved work.

## 6. Diagnostics and edit safety `[x]`

### Why

Industrial configuration tools must make invalid topology easy to locate and repair.

### Deliverables

- filterable error/warning panel;
- click an issue to select and center its node;
- blocking-error save behavior;
- undo/redo using explicit reducer actions;
- unsaved-change navigation warning;
- keyboard shortcuts for save, undo, redo, delete, and escape.

### Acceptance

- each issue identifies the affected node or nodes;
- undo and redo cover add, update, and delete;
- disabled actions expose a reason;
- error state is never communicated by color alone.

## 7. Bonus canvas interactions `[x]`

### Why

Add the optional spatial interactions only after the complete core workflow is stable.

### Priority order

1. zoom around pointer position;
2. pan;
3. drag nodes with integer-coordinate output;
4. fit-to-map;
5. rotate viewport without mutating stored coordinates.

### Acceptance

- precise inspector input remains available;
- transformations do not alter source coordinates unless a node is intentionally moved;
- dragging recomputes routes and diagnostics;
- reset/fit always returns the map to a usable view.

## 8. Docker and delivery `[~]`

### Why

The required artifact is not only source code: reviewers must be able to run the same
verified application from Docker Hub.

### Deliverables

- builder and runtime stages based on `debian:bullseye`;
- one process serving the API and built client;
- persistent `/data` volume support;
- health check;
- public Docker Hub image;
- complete run, development, test, and architecture documentation.

### Acceptance

- clean `docker build` succeeds;
- documented `docker run` command starts the application;
- health endpoint responds;
- edit/save/restart preserves volume data;
- image contains no `.git`, credentials, or development cache;
- a reviewer can complete the core user flow using only the README.

## Final review checklist

- [x] All explicit assessment requirements are mapped to a deliverable.
- [x] Core requirements work without bonus features.
- [x] Frontend and backend automated tests pass.
- [x] Strict type checking passes.
- [x] Production build succeeds.
- [ ] Docker clean-run test succeeds.
- [x] Assumptions and tradeoffs are documented.
- [ ] Repository access and Docker Hub URL are ready for submission.
