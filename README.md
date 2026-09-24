# Mujin AGV Map Editor

A full-stack engineering workbench for viewing, validating, and editing an AGV
waypoint map. The primary user is a commissioning or integration engineer configuring
QR-code waypoints, directed travel routes, charging stations, and payload chutes on a
warehouse floor.

The project deliberately focuses on map authoring. Live fleet tracking, dispatch,
collision avoidance, authentication, and WMS integration are outside the assessment
scope.

## Quick start

Requirements: Node.js 22 and npm 10.

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`. Vite forwards `/api` requests to the Node server.

For a production-style local run:

```bash
npm run build
npm start
```

Open `http://localhost:3000`; Express serves both the REST API and compiled client.

## Docker

The image starts from `debian:bullseye`, builds the TypeScript application in a
separate stage, runs as an unprivileged user, exposes a health check, and stores the
editable map under `/data`.

```bash
docker build -t mujin-map-editor:local .
docker run --rm -p 3000:3000 -v mujin-map-data:/data mujin-map-editor:local
```

Then open `http://localhost:3000`. The named volume preserves saved edits across
container replacement. On the first run, the supplied assessment map is copied into
the empty volume.

The Dockerfile defaults to the Linux x64 Node distribution. For a native ARM64 build,
pass `--build-arg NODE_ARCH=arm64`.

The assessment requires Bullseye, which is now end-of-life. Its live security
repository currently references missing packages ([Debian issue #1147093](https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1147093)).
The build therefore uses official Debian snapshots dated 2026-08-31 for both main
and security packages. Only snapshot expiry checking is disabled, as documented by
[Debian Snapshot](https://snapshot.debian.org/); package signature verification stays
enabled. This preserves the required base and historical package availability, but
does not provide ongoing security updates. This image is for assessment use, not
an internet-facing production deployment.

## User workflow

1. Search or select a waypoint in the explorer or on the map.
2. Edit exact integer coordinates, QR code, name, travel directions, and optional
   charger/chute configuration in the inspector.
3. Review routes and diagnostics as they recompute immediately.
4. Resolve blocking errors; warnings remain saveable and document suspicious topology.
5. Save. The API validates again and atomically replaces the JSON file.

To create a waypoint, click **Add node**, then click its approximate position on the map.
In the configuration dialog, verify integer millimeter coordinates, enter the actual
floor QR code (no code is generated), and configure name, outgoing directions, and
optional station features. Review incoming/outgoing routes, their distances, and any
existing routes redirected by the insertion. **Create node** adds one undoable local
change; **Save map** persists it. Missing connections are warnings, so points awaiting
configuration can be created and saved. Duplicate coordinates block creation.
**Cancel** or `Escape` discards the draft without changing the map.
Adding, deleting, and moving nodes preserve your current view;
use **Fit map** when you want to frame the complete map again.

View controls do not modify map data: use the mouse wheel or **Zoom in**, drag the
canvas background to pan, use **Rotate**, and use **Fit map** to reset the view. Drag a
node to commit a new integer millimeter position.

Keyboard shortcuts:

- `Ctrl/Cmd+S`: save;
- `Ctrl/Cmd+Z`: undo;
- `Ctrl/Cmd+Shift+Z` or `Ctrl/Cmd+Y`: redo;
- `Delete`: remove the selected node when focus is not in a form field;
- `Escape`: clear selection.

## Architecture

- `client/src`: React workbench, SVG canvas, inspector, diagnostics, and history.
- `server`: Express REST API and atomic JSON file store.
- `shared`: Zod schema, route inference, and semantic validation used by both sides.
- `data/map.json`: the complete 58-node assessment map.

The source format contains node directions but no explicit edges. For each declared
direction, the editor connects to the nearest node that is exactly aligned on the
required axis and is within `maxNeighborDistance`. Connections are directed. North is
increasing X; West is increasing Y. These rules live in one shared module so the
canvas, diagnostics, and tests cannot silently disagree.

## REST API

- `GET /api/health`
- `GET /api/map`
- `PUT /api/map`

The PUT endpoint rejects schema errors with `400`, blocking semantic errors with
`422`, and does not expose internal filesystem paths on `500`. Warning-only maps are
accepted. Writes use a same-directory temporary file followed by rename.

## Verification

The GitHub Actions workflow in `.github/workflows/verify.yml` runs tests, builds the
application and Debian image, then verifies HTTP save and data persistence across
container replacement. It does not publish images. A configured workflow is not a
successful run; see the [delivery checklist](docs/DELIVERY_CHECKLIST.md) for pending
release verification and publication steps.

```bash
npm run typecheck
npm test
npm run build
```

Design decisions and review aids:

- [Assumptions and edge cases](docs/ASSUMPTIONS.md)
- [Living implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Assessment requirements traceability](docs/REQUIREMENTS_TRACEABILITY.md)

## Development approach

This assessment was developed with AI assistance. Design decisions, assumptions,
tests, and acceptance checks are documented so the implementation remains reviewable
and explainable rather than relying on generated code as a black box. The author
reviewed the architecture, exercised the user workflow, and retained explicit tests
for the business rules and failure paths.
