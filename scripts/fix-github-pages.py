#!/usr/bin/env python3
"""Make vinext's static HTML asset URLs valid under the GitHub Pages repo path."""

from pathlib import Path


EXPORT_ROOT = Path(__file__).resolve().parents[1] / "dist/client"
PREFIX = "/white-album-2/assets/"


def main() -> None:
    html_files = sorted(EXPORT_ROOT.rglob("*.html"))
    if not html_files:
        raise SystemExit(f"no static HTML found under {EXPORT_ROOT}")

    replacements = 0
    for path in html_files:
        original = path.read_text(encoding="utf-8")
        updated = original.replace("/assets/", PREFIX)
        replacements += original.count("/assets/")
        path.write_text(updated, encoding="utf-8")

    if replacements == 0:
        raise SystemExit("no vinext asset URLs found to prefix")

    leftovers = [
        str(path.relative_to(EXPORT_ROOT))
        for path in html_files
        if '"/assets/' in path.read_text(encoding="utf-8")
    ]
    if leftovers:
        raise SystemExit(f"unprefixed asset URLs remain in: {leftovers}")

    print(f"prefixed {replacements} asset URLs across {len(html_files)} HTML files")


if __name__ == "__main__":
    main()
