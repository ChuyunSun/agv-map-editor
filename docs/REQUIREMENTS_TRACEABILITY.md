# Requirements traceability

This table maps the assessment wording to implementation evidence. It is intended to
make review fast and to keep bonus work from obscuring the required behavior.

| Assessment requirement | Implementation | Verification |
| --- | --- | --- |
| Start from `debian:bullseye` | Multi-stage `Dockerfile`; every stage derives from the Debian base; signed fixed-date APT snapshots | [CI run 36027252482](https://github.com/ChuyunSun/agv-map-editor/actions/runs/35966864017): build, health, HTTP save, container replacement persistence passed |
| React and TypeScript UI | `client/src` workbench and SVG map canvas | strict client typecheck, component tests, browser smoke test |
| Integer X/Y millimeter coordinates and integer QR code | shared Zod schema plus integer inspector fields | schema and inspector tests |
| Optional directions, charger/chute direction, and name | node inspector controls for every optional property | component tests and API validation |
| Same-X or same-Y connections only; no diagonals | shared nearest-aligned-neighbor algorithm | route unit tests |
| North = +X; West = +Y | shared direction deltas, compass, status bar | boundary tests and visual smoke test |
| HTTP backend in an allowed language | Node/Express REST API | Supertest API suite and live API smoke test |
| Automated frontend/backend tests | Vitest, Testing Library, Supertest | `npm test` |
| Zoom, rotate, drag/drop bonus | non-destructive viewport transforms and integer node drag commit | UI tests and browser verification |
| Source, documentation, Docker image | README, assumptions, plan, this traceability table, Dockerfile | final delivery checklist |

## REST contract

- `GET /api/health` returns process health.
- `GET /api/map` returns `{ document, issues }`.
- `PUT /api/map` validates syntax and semantics before an atomic write.
- Invalid syntax returns `400`; blocking topology errors return `422`; unexpected
  storage failures return a path-safe `500` response.
