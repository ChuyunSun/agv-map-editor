# Image release and reviewer handoff

## Delivered release

- Source: https://github.com/ChuyunSun/agv-map-editor
- Image: https://hub.docker.com/r/sunchuyun/agv-map-editor
- Tag: `sha-19b8186cdf7d9e9986af64392a9e8ad38135d86f`
- Digest: `sha256:f6caa7745ba6c017a602104fff796c0647c602c33531c84b06890c472a8125e7`
- Source commit: `19b8186cdf7d9e9986af64392a9e8ad38135d86f`
- Platform: Linux amd64.
- Both repositories are public, as explicitly requested by the author.
- [Verification run](https://github.com/ChuyunSun/agv-map-editor/actions/runs/36027252482)
  passed tests, build, image push, anonymous pull on a fresh runner, HTTP save and
  persistence across container replacement.

See README for the tested run command. No account invitation or Docker login is
required for reviewers. The image has no `latest` tag; use the exact commit tag
or digest.

## Future releases

1. Commit the intended changes and review them.
2. Open Actions → Verify application and Docker → Run workflow on `main`.
3. Select the explicit public publication checkbox only when publication is intended.
4. The workflow tests and builds before pushing a `sha-<source commit>` tag, then
   independently pulls and tests the registry digest on a fresh runner.
5. Only after both jobs pass, update the README and checklist with that run, tag,
   source commit and digest.
6. Store credentials only in the `DOCKERHUB_TOKEN` GitHub Actions secret. Never
   print it or commit it. Revoke the publishing token after final handoff if no
   more releases are needed. This does not prevent public image pulls.

## Submission message draft

The following is a draft only; no email has been sent:

> The AGV map editor is ready for review.
>
> Source and instructions: https://github.com/ChuyunSun/agv-map-editor
>
> Docker image: https://hub.docker.com/r/sunchuyun/agv-map-editor
>
> The README includes the exact versioned Docker run command. Automated verification
> covers the frontend/backend tests, image build, anonymous pull, map saving and
> persistence across container replacement. Design assumptions, the implementation
> plan and AI-assisted development disclosure are included in the repository.
>
> The image uses the required Debian Bullseye base with fixed official package
> snapshots. It is for local assessment use, not production fleet control.
