#!/usr/bin/env python3
"""Build the two platform-specific WHITE ALBUM 2 v1.0.0 release archives."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import shutil
from typing import Any
import zipfile


VERSION = "1.0.0"
FIXED_ZIP_TIME = (2026, 7, 29, 0, 0, 0)

WINDOWS_ARCHIVE = "White_Album_2_English_Patch_v1.0.0_Windows.zip"
WINE_ARCHIVE = "White_Album_2_English_Patch_v1.0.0_Wine-CrossOver.zip"

NATIVE_HOOK_SHA256 = (
    "b4b24fd72af8beb4b5c832fa43a2bb05a8561715062a8b74fb9c733ed0cd4542"
)
WINE_HOOK_SHA256 = (
    "49c098a07cc8fea6be6aea7d1dfd973e83d9b434144b1584591e99e189178b0f"
)
SUBTITLE_SOURCE_COMMIT = "27636f564f8b9c7f9a08b4a1a07dc714616b2ca9"
INSTALLER_SOURCE_COMMIT = "ee7e4b7ed5814ea6746f1321a188c07d8503f4ec"

COMMON_SOURCE_PATHS = (
    "game files/WA2.exe",
    "game files/en.pak",
    "game files/novels/The Idol Who Forgot How to Sing.pdf",
    "game files/novels/The Snow Melts, and Until the Snow Falls.pdf",
    "game files/todokanai/font.png",
    "game files/todokanai/subtitles",
    "licenses/Avuxo-subtitles-MIT.txt",
    "licenses/Todokanai-WA2EnglishPatch-BSD-3-Clause.txt",
)

EXPECTED_COMMON_HASHES = {
    "game files/WA2.exe": (
        "7470f377e5ff2c9fd62968ce14c5c8ff434b46d91d6ae7c4081baccdcbf127c7"
    ),
    "game files/en.pak": (
        "27c1582e4f1c5d3fca7bcbb66f12cce7097025f667b947b32059100b47cee4e8"
    ),
    "game files/novels/The Idol Who Forgot How to Sing.pdf": (
        "c98c8aa8682069cc8fb427edd87001b53b1b6419248433fcc321584577d601f1"
    ),
    "game files/novels/The Snow Melts, and Until the Snow Falls.pdf": (
        "afa3fde68961befb51317d2ea1ba927c91e82c0e77b7b597646332439326ae8f"
    ),
    "game files/todokanai/font.png": (
        "002b00fae25a6b564e86117e5c2e0ebb21b811ca697c648561aaa86e1a239a92"
    ),
    "game files/todokanai/subtitles": (
        "205ecc159a38d48749115c8787eb6f4d3d549b0240fb6c8aace3f37c1c35d1b3"
    ),
    "licenses/Avuxo-subtitles-MIT.txt": (
        "ac959a9872c135889f307227387e825ff0f796fb0c4ae9a96a47d85334c5a9f6"
    ),
    "licenses/Todokanai-WA2EnglishPatch-BSD-3-Clause.txt": (
        "af597e609337fcf53d43d37a60914105086e780caef751f6d31a52388d1e0062"
    ),
}

WINDOWS_README = f"""WHITE ALBUM 2 ENGLISH PATCH
Release {VERSION} — Windows

STATUS
This is the native-Windows package. The core patch is Windows-native. Its
audio-only subtitle proxy was built from TodokanaiTL/subtitles.
Source commit: {SUBTITLE_SOURCE_COMMIT}

The proxy passed the recorded structural and reproducible-build checks: two
independent clean builds produced the same DLL.

This project did not perform a native-Windows gameplay smoke test. The package
follows Todokanai TL's own native-Windows hook design and folder layout.

REQUIREMENTS
- A legally obtained Japanese White Album 2 Extended Edition installation.
- Native Windows.
- The legacy DirectX runtime containing D3DX9_43.dll. If the game opens to a
  black screen, install Microsoft's DirectX End-User Runtimes (June 2010):
  https://www.microsoft.com/en-us/download/details.aspx?id=8109

INSTALLATION
1. Back up WA2.exe in the game directory.
2. Copy everything inside the "game files" folder into the game directory,
   preserving the todokanai and novels subfolders.
3. Launch the replacement WA2.exe.

The package deliberately does not contain mv000.pak. Leave the original Leaf
startup movie in place. Do not install a Todokanai TL-branded mv000.pak over it.

CONTENTS
- en.pak: complete replacement English scenario archive.
- WA2.exe: English menu/system executable from the technical patch base.
- d3d9.dll, todokanai/font.png, todokanai/subtitles: the native-Windows
  audio-subtitle hook and this project's 339 proofread voice-only subtitle cues.
- novels: the two complete translated digital novels as PDFs.
- provenance/windows-hook: source, toolchain, export/import, and reproducible-
  build records for the native proxy DLL.
- CHANGELOG.txt: translation, engine-integration, and packaging history.

TROUBLESHOOTING
If DirectX installation and Windows 7 compatibility mode do not resolve a black
screen, delete d3d9.dll from the game directory. The translated scenario,
menus, choices, and novels will still work; only the 339 audio-only subtitle
cues will be unavailable.

The canonical translation is UTF-8. The game archive is a mechanically reflowed
and CP932-safe derivative required by the engine. See MANIFEST.json for exact
source identities and file hashes, and THIRD_PARTY_NOTICES.txt for attribution.
"""

WINE_README = f"""WHITE ALBUM 2 ENGLISH PATCH
Release {VERSION} — Wine / CrossOver

STATUS
This is the Wine/CrossOver package. This exact core payload and Todokanai TL's
installer-pinned Wine audio-subtitle hook passed the recorded live runtime
smoke test under CrossOver.

REQUIREMENTS
- A legally obtained Japanese White Album 2 Extended Edition installation.
- CrossOver or Wine.

INSTALLATION
1. Back up WA2.exe in the game directory.
2. Copy everything inside the "game files" folder into the game directory,
   preserving the todokanai and novels subfolders.
3. Launch the replacement WA2.exe.
   On macOS, "Launch WHITE ALBUM 2.command" may be used instead; it keeps the
   Japanese code-page bottle while requesting English native dialog controls.

The package deliberately does not contain mv000.pak. Leave the original Leaf
startup movie in place. Do not install a Todokanai TL-branded mv000.pak over it.

CONTENTS
- en.pak: complete replacement English scenario archive.
- WA2.exe: English menu/system executable from the technical patch base.
- d3d9.dll, todokanai/font.png, todokanai/subtitles: the Wine audio-subtitle
  hook and this project's 339 proofread voice-only subtitle cues.
- novels: the two complete translated digital novels as PDFs.
- CHANGELOG.txt: translation, engine-integration, and packaging history.

The canonical translation is UTF-8. The game archive is a mechanically reflowed
and CP932-safe derivative required by the engine. See MANIFEST.json for exact
source identities and file hashes, and THIRD_PARTY_NOTICES.txt for attribution.

MACOS NATIVE DIALOGS
Use "Launch WHITE ALBUM 2.command" if a Japanese-language bottle renders native
Yes/No controls in Japanese. The launcher changes only the process locale used
by CrossOver; it does not modify the bottle, the game, or the translation
archive.
"""

CREDITS = """WHITE ALBUM 2 ENGLISH PATCH

Project Lead: MAO
Translator: GPT-5.6 Sol
Special Thanks: gambs

Technical patch base
Todokanai TL
https://github.com/TodokanaiTL/WA2EnglishPatch

Audio-only subtitle hook
Ben (Avuxo), as maintained by TodokanaiTL
https://github.com/TodokanaiTL/subtitles

The replacement English script was produced by the credited project team.
Todokanai TL is credited for the technical patch base and is not
credited as translator or editor of the replacement script.

Complete third-party copyright and license notices are reproduced in
THIRD_PARTY_NOTICES.txt and the licenses directory.

WHITE ALBUM 2 and its original game assets are the property of their
respective rightsholders. No endorsement by Leaf, AQUAPLUS, Todokanai TL,
Ben (Avuxo), or any contributor is implied.
"""

THIRD_PARTY_NOTICES = f"""WHITE ALBUM 2 ENGLISH PATCH — THIRD-PARTY NOTICES

This project uses Todokanai TL's patch technology as a technical
base. Todokanai TL did not translate or edit the replacement English
script distributed by this project.

Subtitle hook
-------------
The audio-only subtitle renderer and D3D9 proxy derive from the White Album 2
Subtitle Patch by Ben (Avuxo), as maintained in the TodokanaiTL/subtitles
repository. That software is licensed under the MIT License. The complete
notice is reproduced in licenses/Avuxo-subtitles-MIT.txt.

Source: https://github.com/TodokanaiTL/subtitles
Build source commit: {SUBTITLE_SOURCE_COMMIT}

Installer and technical patch base
----------------------------------
Installer logic and related technical integration derive from the
TodokanaiTL/WA2EnglishPatch project, copyright 2017–2022 Todokanai TL, licensed
under the BSD 3-Clause License. The complete notice is reproduced in
licenses/Todokanai-WA2EnglishPatch-BSD-3-Clause.txt.

Source: https://github.com/TodokanaiTL/WA2EnglishPatch
Packaging reference commit: {INSTALLER_SOURCE_COMMIT}

WHITE ALBUM 2 and its original game assets are the property of their
respective rightsholders. No endorsement by Leaf, AQUAPLUS, Todokanai TL,
Ben (Avuxo), or any contributor is implied.
"""


class ReleaseError(RuntimeError):
    pass


def canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def copy_file(source: Path, target: Path) -> None:
    if not source.is_file():
        raise ReleaseError(f"missing source file: {source}")
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")


def records(root: Path, *, exclude: set[str] | None = None) -> list[dict[str, Any]]:
    excluded = exclude or set()
    result: list[dict[str, Any]] = []
    for path in sorted(item for item in root.rglob("*") if item.is_file()):
        relative = path.relative_to(root).as_posix()
        if relative in excluded:
            continue
        result.append(
            {
                "path": relative,
                "byte_count": path.stat().st_size,
                "sha256": sha256(path),
            }
        )
    return result


def zip_tree(root: Path, output: Path) -> None:
    with zipfile.ZipFile(
        output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9
    ) as archive:
        for path in sorted(item for item in root.rglob("*") if item.is_file()):
            relative = path.relative_to(root).as_posix()
            info = zipfile.ZipInfo(relative, date_time=FIXED_ZIP_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            mode = 0o100755 if path.suffix == ".command" else 0o100644
            info.external_attr = (mode & 0xFFFF) << 16
            archive.writestr(info, path.read_bytes())


def verify_sources(base_payload: Path, native_hook: Path) -> dict[str, Any]:
    base_manifest = load_json(base_payload / "MANIFEST.json")
    if (
        base_manifest.get("version") != VERSION
        or base_manifest.get("platform") != "CrossOver/Wine"
        or base_manifest.get("status") != "verified_release"
        or base_manifest.get("live_smoke", {}).get("status") != "passed"
    ):
        raise ReleaseError("base v1.0.0 payload lineage is not the verified release")

    for relative in COMMON_SOURCE_PATHS:
        actual = sha256(base_payload / relative)
        expected = EXPECTED_COMMON_HASHES[relative]
        if actual != expected:
            raise ReleaseError(
                f"common payload identity differs for {relative}: {actual}"
            )

    if sha256(base_payload / "game files/d3d9.dll") != WINE_HOOK_SHA256:
        raise ReleaseError("base payload no longer contains the official Wine hook")

    native_dll = native_hook / "d3d9.dll"
    if sha256(native_dll) != NATIVE_HOOK_SHA256:
        raise ReleaseError("native source-built hook identity differs")

    first_provenance = load_json(native_hook / "build-provenance.json")
    second_provenance = load_json(native_hook / "second-build-provenance.json")
    reproducibility = load_json(native_hook / "reproducibility.json")
    if (
        first_provenance.get("artifact", {}).get("sha256") != NATIVE_HOOK_SHA256
        or second_provenance.get("artifact", {}).get("sha256")
        != NATIVE_HOOK_SHA256
        or reproducibility.get("sha256") != NATIVE_HOOK_SHA256
        or reproducibility.get("clean_builds_compared") != 2
        or reproducibility.get("byte_identical") is not True
        or first_provenance.get("subtitle_hook_source", {}).get("commit")
        != SUBTITLE_SOURCE_COMMIT
        or first_provenance.get("installer_reference", {}).get("commit")
        != INSTALLER_SOURCE_COMMIT
    ):
        raise ReleaseError("native-hook provenance or reproducibility gate differs")

    return base_manifest


def updated_changelog(base_payload: Path) -> str:
    source = (base_payload / "CHANGELOG.txt").read_text(encoding="utf-8")
    source = source.replace(
        "WHITE ALBUM 2 RETRANSLATION PROJECT — CHANGE HISTORY",
        "WHITE ALBUM 2 ENGLISH PATCH — CHANGE HISTORY",
        1,
    )
    old = (
        "- Version 1.0 is scoped to CrossOver/Wine. A native-Windows subtitle-hook\n"
        "  payload is not included.\n"
    )
    new = (
        "- Published separate native-Windows and Wine/CrossOver archives under\n"
        "  version 1.0.0. The Windows proxy is a byte-reproducible source build\n"
        f"  from TodokanaiTL/subtitles commit {SUBTITLE_SOURCE_COMMIT}; the\n"
        "  Wine/CrossOver archive retains the installer-pinned, runtime-tested\n"
        "  Wine proxy.\n"
    )
    if source.count(old) != 1:
        raise ReleaseError("base changelog platform paragraph differs")
    return source.replace(old, new)


def build_payload(
    *,
    platform_id: str,
    base_payload: Path,
    native_hook: Path,
    target: Path,
    base_manifest: dict[str, Any],
) -> tuple[Path, dict[str, Any]]:
    payload = target / "payload"
    payload.mkdir(parents=True)

    for relative in COMMON_SOURCE_PATHS:
        copy_file(base_payload / relative, payload / relative)

    if platform_id == "windows":
        copy_file(native_hook / "d3d9.dll", payload / "game files/d3d9.dll")
        provenance_files = (
            "build-provenance.json",
            "second-build-provenance.json",
            "reproducibility.json",
            "dumpbin-headers.txt",
            "dumpbin-exports.txt",
            "dumpbin-dependents.txt",
        )
        for name in provenance_files:
            copy_file(
                native_hook / name,
                payload / "provenance/windows-hook" / name,
            )
        readme = WINDOWS_README
        platform_name = "Native Windows"
        status = "source_built_structurally_validated_release"
        hook = {
            "kind": "native_windows_source_build",
            "sha256": NATIVE_HOOK_SHA256,
            "source_repository": "https://github.com/TodokanaiTL/subtitles",
            "source_commit": SUBTITLE_SOURCE_COMMIT,
            "clean_builds_compared": 2,
            "byte_reproducible": True,
            "runtime_smoke_by_this_project": False,
            "requires": "D3DX9_43.dll from the legacy DirectX runtime",
        }
        live_smoke = None
    elif platform_id == "wine-crossover":
        copy_file(
            base_payload / "game files/d3d9.dll",
            payload / "game files/d3d9.dll",
        )
        copy_file(
            base_payload / "game files/Launch WHITE ALBUM 2.command",
            payload / "game files/Launch WHITE ALBUM 2.command",
        )
        readme = WINE_README
        platform_name = "Wine / CrossOver"
        status = "runtime_smoke_verified_release"
        hook = {
            "kind": "installer_pinned_wine_binary",
            "sha256": WINE_HOOK_SHA256,
            "installer_repository": (
                "https://github.com/TodokanaiTL/WA2EnglishPatch"
            ),
            "installer_reference_commit": INSTALLER_SOURCE_COMMIT,
            "runtime_smoke_by_this_project": True,
        }
        live_smoke = base_manifest["live_smoke"]
    else:
        raise ReleaseError(f"unsupported platform: {platform_id}")

    write_text(payload / "README.txt", readme)
    write_text(payload / "CHANGELOG.txt", updated_changelog(base_payload))
    write_text(payload / "CREDITS.txt", CREDITS)
    write_text(payload / "THIRD_PARTY_NOTICES.txt", THIRD_PARTY_NOTICES)

    payload_records = records(payload)
    runtime_payload_sha256 = hashlib.sha256(
        canonical(payload_records).encode("utf-8")
    ).hexdigest()
    manifest: dict[str, Any] = {
        "schema": "wa2-platform-release/1",
        "status": status,
        "version": VERSION,
        "platform": platform_name,
        "runtime_payload_sha256": runtime_payload_sha256,
        "file_count_excluding_manifest": len(payload_records),
        "files": payload_records,
        "hook": hook,
        "live_smoke": live_smoke,
        "translation_lineage": base_manifest["upstream"],
        "deliberately_absent": {
            "mv000.pak": (
                "The original Leaf startup movie must remain in the user's "
                "installation."
            )
        },
    }
    manifest["release_manifest_sha256"] = hashlib.sha256(
        canonical(manifest).encode("utf-8")
    ).hexdigest()
    write_text(payload / "MANIFEST.json", canonical(manifest))
    return payload, manifest


def build_archive(
    *,
    platform_id: str,
    archive_name: str,
    base_payload: Path,
    native_hook: Path,
    output: Path,
    base_manifest: dict[str, Any],
) -> dict[str, Any]:
    target = output / platform_id
    payload, manifest = build_payload(
        platform_id=platform_id,
        base_payload=base_payload,
        native_hook=native_hook,
        target=target,
        base_manifest=base_manifest,
    )
    archive = output / archive_name
    zip_tree(payload, archive)
    receipt = {
        "schema": "wa2-platform-release-build/1",
        "status": manifest["status"],
        "version": VERSION,
        "platform": manifest["platform"],
        "archive": {
            "filename": archive.name,
            "byte_count": archive.stat().st_size,
            "sha256": sha256(archive),
        },
        "manifest": {
            "sha256": sha256(payload / "MANIFEST.json"),
            "release_manifest_sha256": manifest["release_manifest_sha256"],
        },
        "payload": {
            "runtime_payload_sha256": manifest["runtime_payload_sha256"],
            "file_count_including_manifest": (
                manifest["file_count_excluding_manifest"] + 1
            ),
        },
    }
    write_text(target / "build-receipt.json", canonical(receipt))
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-payload", type=Path, required=True)
    parser.add_argument("--native-hook-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    base_payload = args.base_payload.resolve()
    native_hook = args.native_hook_dir.resolve()
    output = args.output_dir.resolve()
    if output.exists():
        raise ReleaseError(f"refusing to replace existing output directory: {output}")
    base_manifest = verify_sources(base_payload, native_hook)
    output.parent.mkdir(parents=True, exist_ok=True)
    staging = output.with_name(f".{output.name}.building")
    if staging.exists():
        raise ReleaseError(f"stale staging directory exists: {staging}")
    staging.mkdir()

    try:
        windows = build_archive(
            platform_id="windows",
            archive_name=WINDOWS_ARCHIVE,
            base_payload=base_payload,
            native_hook=native_hook,
            output=staging,
            base_manifest=base_manifest,
        )
        wine = build_archive(
            platform_id="wine-crossover",
            archive_name=WINE_ARCHIVE,
            base_payload=base_payload,
            native_hook=native_hook,
            output=staging,
            base_manifest=base_manifest,
        )

        windows_manifest = load_json(staging / "windows/payload/MANIFEST.json")
        wine_manifest = load_json(
            staging / "wine-crossover/payload/MANIFEST.json"
        )
        windows_files = {
            item["path"]: item["sha256"] for item in windows_manifest["files"]
        }
        wine_files = {
            item["path"]: item["sha256"] for item in wine_manifest["files"]
        }
        shared_runtime_paths = set(COMMON_SOURCE_PATHS)
        for relative in shared_runtime_paths:
            if windows_files.get(relative) != wine_files.get(relative):
                raise ReleaseError(
                    f"platform archives diverge in common file: {relative}"
                )

        release_set = {
            "schema": "wa2-platform-release-set/1",
            "version": VERSION,
            "status": "complete",
            "archives": {
                "windows": windows["archive"],
                "wine_crossover": wine["archive"],
            },
            "shared_runtime_file_count": len(shared_runtime_paths),
            "shared_runtime_hashes": {
                relative: windows_files[relative]
                for relative in sorted(shared_runtime_paths)
            },
            "hook_hashes": {
                "windows": NATIVE_HOOK_SHA256,
                "wine_crossover": WINE_HOOK_SHA256,
            },
        }
        release_set["release_set_sha256"] = hashlib.sha256(
            canonical(release_set).encode("utf-8")
        ).hexdigest()
        write_text(
            staging / "release-set-manifest.json",
            canonical(release_set),
        )
        staging.rename(output)
    except Exception:
        shutil.rmtree(staging, ignore_errors=True)
        raise

    print(canonical(release_set), end="")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ReleaseError as error:
        print(f"error: {error}")
        raise SystemExit(1)
