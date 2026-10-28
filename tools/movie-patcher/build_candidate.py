#!/usr/bin/env python3
"""Build an unpublished movie-patcher candidate from verified packet hashes."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import zipfile

root = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument("--assets", type=Path, required=True, help="Existing release's Movie Patcher/assets")
parser.add_argument("--output", type=Path, required=True, help="New, nonexistent candidate directory")
args = parser.parse_args()
manifest = root / "verification/packet-fixed-manifest.json"
data = json.loads(manifest.read_text())
original = json.loads((args.assets / "manifest.json").read_text())
assert len(data["assets"]) == 30
assert len({a["asset_id"] for a in data["assets"]}) == 30
baseline = {a["asset_id"]: a for a in original["assets"]}
for asset in data["assets"]:
    assert len(asset["packet_fixed_sha256"]) == 64
    assert {k: v for k, v in asset.items() if k != "packet_fixed_sha256"} == baseline[asset["asset_id"]]
args.output.mkdir(parents=True, exist_ok=False)
package = args.output / "Movie Patcher"
shutil.copytree(args.assets, package / "assets")
shutil.copyfile(manifest, package / "assets/manifest.json")
asset_root = package / "assets"
checksums = "".join(f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(asset_root).as_posix()}\n"
                    for p in sorted(asset_root.rglob("*")) if p.is_file() and p.name != "SHA256SUMS.txt")
(asset_root / "SHA256SUMS.txt").write_text(checksums)
manifest_hash = hashlib.sha256(manifest.read_bytes()).hexdigest()
env = {**os.environ, "GOOS": "windows", "GOARCH": "amd64", "CGO_ENABLED": "0"}
subprocess.run(["go", "build", "-trimpath", "-ldflags",
                f"-s -w -X main.buildVersion=v2.1.1-movie-rc1 -X main.manifestSHA256={manifest_hash}",
                "-o", str((package / "wa2-movie-patcher.exe").resolve()), "."], cwd=root, env=env, check=True)
for name in ["Patch Movies (Windows).cmd", "Patch Movies (CrossOver).command", "Patch Movies (Wine).sh", "THIRD_PARTY_NOTICES.txt"]:
    shutil.copyfile(args.assets.parent / name, package / name)
    if name.endswith((".command", ".sh")):
        (package / name).chmod(0o755)
(package / "Repair Movies (Windows).cmd").write_text('@echo off\r\ncd /d "%~dp0"\r\nwa2-movie-patcher.exe --repair-packets\r\npause\r\n')
shutil.copyfile(root / "README.md", package / "README.md")
source = package / "Source"
source.mkdir()
for path in [*root.glob("*.go"), root / "go.mod"]:
    shutil.copyfile(path, source / path.name)
archive = args.output / "WA2_Movie_Packet_Repair_RC1.zip"
with zipfile.ZipFile(archive, "x", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for path in sorted(package.rglob("*")):
        if path.is_file():
            entry = zipfile.ZipInfo(path.relative_to(args.output).as_posix(), (2026, 10, 28, 0, 0, 0))
            entry.external_attr = (path.stat().st_mode & 0xFFFF) << 16
            entry.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(entry, path.read_bytes())
print(json.dumps({"archive": str(archive), "sha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
                  "movie_count": 30, "published": False, "native_windows_playback_verified": False}, indent=2))
