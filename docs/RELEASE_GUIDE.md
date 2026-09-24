# Image release and reviewer handoff

Target: public `sunchuyun/agv-map-editor`, as explicitly requested by the author.
Status: preparation only. The Docker image passed CI, but no Docker Hub image has
been published. Do not interpret the example names below as existing artifacts.

## Account and access decisions

1. The author registers a Docker Hub account and verifies its email address.
2. Confirm the Docker ID and the intended repository name (`agv-map-editor`).
3. Confirm image visibility before creating or pushing to the repository. GitHub
   and Docker Hub have separate visibility controls. A public image exposes the
   compiled application and bundled sample map even if GitHub stays private.
4. For a private image, establish how the reviewers will be granted pull access.
   Do not send them the author's password or personal publishing token. If account
   limits prevent private sharing, discuss the options before paying or publishing.
5. The author creates any required publishing token with the minimum available
   read/write permissions and a short expiry, and enters it directly into an
   approved secret store. Do not put it in chat, Git, scripts, or command arguments.

See Docker's official [access management](https://docs.docker.com/docker-hub/repos/manage/access/)
and [personal access token](https://docs.docker.com/security/access-tokens/personal-access-tokens/)
documentation. No paid plan is authorized by this checklist.

## Publish from a Docker-enabled environment

The local author machine currently has no Docker installation. GitHub-hosted CI
has verified the image; the publishing job still needs account configuration.
Run these steps only after the account, credentials, destination and visibility
are confirmed. Replace `DOCKER_ID` with the actual account name.

1. Check out the exact release commit and run `npm ci`, `npm test`, and
   `npm run build`.
2. Build and run the Docker verification flow from `.github/workflows/verify.yml`
   against that commit. Do not publish after a failed check.
3. Authenticate using a publishing token through `docker login --password-stdin`
   supplied by the secret store, with shell tracing disabled.
4. Tag the verified image `DOCKER_ID/agv-map-editor:0.1.0` and push that tag.
   Record the resulting `sha256` registry digest and the source commit.
5. Independently pull the registry image into a fresh environment and verify
   startup, the UI, map reads/writes, and persistence after container replacement.
   A build from local source alone does not prove the published image works.
6. Verify the intended reviewer access. For a public image, test an anonymous pull;
   for a private image, test using an authorized reviewer account.
7. Replace placeholders in the README with the real image name, tag, digest,
   platform, and tested run command. Only then mark image delivery complete.

Example reviewer command after publication (not executable until the name exists):

```sh
docker run --rm -p 127.0.0.1:3000:3000 -v agv-review-data:/data DOCKER_ID/agv-map-editor:0.1.0
```

The loopback binding keeps this assessment server local. It has no authentication
and uses the required EOL Bullseye base; do not expose it as a production service.

## Submission bundle

- Source: https://github.com/ChuyunSun/agv-map-editor (public requested; identity verification pending).
- Reviewer GitHub access: must be established before submission, or visibility
  changed only on the author's explicit instruction.
- Docker Hub image URL, version tag and digest: pending publication.
- Exact pull/run command and any private-image access instructions: pending.
- Verification: link the successful release CI run and published-image smoke test.
- Documentation: README, implementation plan, assumptions, requirements traceability.
- Limitations: fixed Bullseye snapshots, no live fleet control or robot-safety validation.

Prepare the submission message only after the missing entries are resolved. Sending
an email or inviting reviewers is a separate external action requiring authorization.
