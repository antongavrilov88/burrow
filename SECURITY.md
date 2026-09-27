# Security

This repository is the Homeport website: a static page in `docs/`, served by GitHub Pages. It has no backend, no accounts and no analytics; its fonts load from Google Fonts.

## In scope here

Anything wrong with the page itself, for example:

- a link that points somewhere broken, hijacked or malicious;
- a way to inject content or script into the page;
- anything that leaks visitor data to a third party.

Report these privately: open the **Security** tab of this repository and choose **Report a vulnerability** ([direct link](https://github.com/antongavrilov88/homeport/security/advisories/new)). The report stays between you and the maintainer until an advisory is published. Don't open a public issue for it. Bugs that aren't sensitive go to [issues](https://github.com/antongavrilov88/homeport/issues).

## The skill and the installers

The skill, its scripts and the installers that run on your server live in [homeport-skill](https://github.com/antongavrilov88/homeport-skill). Report their vulnerabilities privately there: [Report a vulnerability in homeport-skill](https://github.com/antongavrilov88/homeport-skill/security/advisories/new). Its [SECURITY.md](https://github.com/antongavrilov88/homeport-skill/blob/main/SECURITY.md) covers the secrets the skill generates and how to keep them out of git.
