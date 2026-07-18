# Public release checklist

## Completed in the repository

- [x] MIT license for source code and package metadata
- [x] third-party and generated-media scope documented
- [x] contributing, security, conduct, and privacy guidance
- [x] CI checks for syntax and tests
- [x] dependency updates configured
- [x] environment files and Python caches ignored
- [x] no common credentials, private keys, or tracked `.env` files found
- [x] no known package vulnerabilities found by `pnpm audit`
- [x] production mode requires a validated `PUBLIC_ORIGIN`
- [x] analytics is optional, deployer-owned, query-sanitized, and privacy-limited

## Owner decisions before changing visibility

- [ ] Confirm that the Suno plan used for the shipped music grants the intended public redistribution rights.
- [ ] Confirm redistribution rights for the ElevenLabs, Higgsfield, and image-generation outputs.
- [ ] Choose an explicit license for cleared media, or remove/replace media that cannot be redistributed.
- [ ] Accept that the six existing commits expose the current Git author name and email, or rewrite history to a public noreply identity before opening the repository.
- [ ] Confirm the Agent Dev Thai GitHub/Facebook identity and links are intended to be public.
- [ ] Confirm the provider job IDs and per-generation costs in the provenance notes are intended to be public.
- [ ] Enable GitHub private vulnerability reporting, secret scanning, Dependabot alerts, and default-branch protection.
- [ ] Set `PUBLIC_ORIGIN` on the deployment; set `GA_MEASUREMENT_ID` only if analytics should be enabled.
- [ ] Replace `PRIVACY.md` with the deployment operator's identity, contact method, and jurisdiction-appropriate notice.
