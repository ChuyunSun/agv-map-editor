# Delivery checklist

## Delivered artifacts

- Public source: https://github.com/ChuyunSun/agv-map-editor
- Public Docker Hub repository: https://hub.docker.com/r/sunchuyun/agv-map-editor
- Image tag: `sha-19b8186cdf7d9e9986af64392a9e8ad38135d86f`
- Image digest: `sha256:f6caa7745ba6c017a602104fff796c0647c602c33531c84b06890c472a8125e7`
- Image source commit: `19b8186cdf7d9e9986af64392a9e8ad38135d86f`.
- Platform verified: Linux amd64.
- Visibility and neutral names follow the author's latest explicit instruction.
- No recruiting correspondence, original PDF, credentials, or unrelated workspace files uploaded.
- Git history remains intact; neutral naming does not anonymize historical content.

## Verified gates

- [x] Source and README publicly accessible without authentication.
- [x] Frontend/backend tests and strict production build passed.
- [x] Assessment-mandated Debian Bullseye image built successfully.
- [x] Container health, HTML serving, initial 58 nodes, map save and persistence verified.
- [x] Image published with a source-commit tag and registry digest.
- [x] A separate fresh runner pulled the public image without Docker credentials.
- [x] Published image passed the same startup/save/container replacement tests.
- [x] README contains the actual tested image reference and run command.

Evidence: [release run 36027252482](https://github.com/ChuyunSun/agv-map-editor/actions/runs/36027252482).
Documentation-only commits after the image source commit do not change the delivered runtime.

## Remaining author actions

- Send the links to the reviewers; no submission email has been sent by the assistant.
- Revoke the short-lived publishing token when no further releases are needed.
- Do not deploy this unauthenticated, EOL-base assessment service publicly on a server.
