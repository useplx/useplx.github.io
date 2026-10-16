# Publishing the docs

The PLeX README is intentionally short: it is suitable for the organization
profile/repository landing surface and sends readers to the complete MkDocs
site. The documentation source remains in the PLeX documentation repository.

## GitHub surfaces

A clean organization setup is:

- `.github/profile/README.md` — copy/use the short PLeX README shown on the
  organization page;
- `useplx.github.io` — the contents of the local `PLeX/docs/` directory,
  including `mkdocs.yml`, `requirements.txt`, the Pages workflow, and the
  conventional `docs/` source directory.

The source directory is not part of the published URL. For example,
`docs/guide/getting-started.md` is published at
`https://useplx.github.io/guide/getting-started/`.

The Pages workflow must live in `useplx.github.io`. The organization `.github`
repository only owns `profile/README.md`; a workflow committed there cannot
read documentation files stored in another repository.

The documentation URL is:

```text
https://useplx.github.io/
```

## Test locally

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
mkdocs serve
```

Before publishing:

```bash
mkdocs build --strict
```

## GitHub Pages workflow

Configure **Settings → Pages → GitHub Actions** and place a workflow at
`.github/workflows/docs.yml`:

```yaml
name: docs

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
      - run: pip install -r requirements.txt
      - run: mkdocs build --strict
      - uses: actions/upload-pages-artifact@v3
        if: github.event_name != 'pull_request'
        with:
          path: site

  deploy:
    needs: build
    if: github.event_name != 'pull_request'
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Pull requests validate the site; pushes to `main` publish it.

## README rule

Keep the organization README fast to scan:

1. one sentence explaining PLeX;
2. direct links to Documentation, Quickstart, Architecture, and Reference;
3. one diagram/line showing SYNaPSe → `.mln` → MyeLiN;
4. no duplicated API reference, package catalog, or long setup guide.

The docs site is the source of detailed technical truth.
