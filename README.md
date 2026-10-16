# PLeX documentation

Source for [useplx.github.io](https://useplx.github.io/).

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
mkdocs serve
```

Run `mkdocs build --strict` before publishing. GitHub Actions builds and deploys
the site from `main`; the source directory name does not appear in published
URLs.

## License

The documentation source is available under the
[PolyForm Noncommercial License 1.0.0](LICENSE).
