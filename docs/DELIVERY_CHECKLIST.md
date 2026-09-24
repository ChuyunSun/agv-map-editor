# Delivery checklist

## Intended delivery

- Repository name: `mujin-map-editor`.
- Repository visibility: private, as requested by the author before creation.
- Repository: https://github.com/ChuyunSun/mujin-map-editor
- Do not change visibility without a new explicit instruction from the author.
- Do not include recruiting correspondence, the original assessment PDF, credentials,
  or unrelated workspace files. The implementation includes the supplied sample map.
- Confirm the assessment's redistribution/visibility instructions before public upload.
- Docker Hub repository and account: not yet configured.

## Verification status

- [x] Local application tests and production build passed before delivery preparation.
- [x] GitHub Actions workflow prepared for tests, build, Debian Docker startup,
  HTTP save, and persistence across container replacement.
- [ ] Workflow executed successfully on GitHub (configuration alone is not evidence).
- [ ] Docker image built and runtime verified on a Docker-enabled host.
- [x] Source pushed to GitHub and private visibility verified.
- [ ] Verified image pushed to Docker Hub with a versioned tag.
- [ ] README updated with the actual image name and pull/run command.
- [ ] Final repository and image links checked before submission.

## Environment blockers

At preparation time, neither `docker` nor `gh` was available on PATH or in its
standard Program Files location. The in-app browser was signed out of GitHub.
The author subsequently signed in and the private GitHub repository was created.
Source upload is complete; Docker verification and image delivery are tracked above. Passwords and
tokens should not be placed in chat or source files.

The verification workflow never publishes an image and needs no Docker Hub secret.
Its temporary test map is confined to a disposable CI volume, not the author's map.
