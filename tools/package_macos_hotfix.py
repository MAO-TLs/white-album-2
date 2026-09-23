#!/usr/bin/env python3
"""Add the macOS media/renderer launcher to the existing v2.1.0 package.

Never edits the source archive; verifies every preserved member and rebuilds
both package manifests and the root checksum list. No movie or prose changes.
"""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

VERSION = '2.1.0'
ROOT = 'White_Album_2_Complete_English_Release_v2.1.0'
BASE_SHA256 = '1f4816007979dbd80b9a0ddd81538f7cfb2dfb17bfc033450053010aedb35dfe'
SITE = Path(__file__).resolve().parents[1]
LAUNCHER = 'Launch WHITE ALBUM 2 (Sikarugir).command'
PREFIX = 'Main Game/Wine-CrossOver/'
NOTE = '''

MACOS MOVIE-PLAYBACK HOTFIX (2026-09-23; version remains 2.1.0)
An optional Launch WHITE ALBUM 2 (Sikarugir).command is included beside the
existing CrossOver launcher. Use it for a game inside an existing Wine bottle
(under drive_c) with Sikarugir's Template-1.0.11 and WS12WineSikarugir10.0_6
engine installed through Sikarugir Creator. It uses that template's complete
GStreamer framework for movies and D3D9 Vulkan renderer for game performance,
and retains the local MAO audio-subtitle proxy. The first run extracts the
installed engine archive into .mao-runtime beside the game. It downloads
nothing and does not change your game, movies, or other applications.

The tested old Whisky runtime could not load its missing Intel Homebrew
GStreamer dependencies, failing even on the untouched Leaf startup movie.
Re-running the movie patcher or changing stream order cannot supply those
missing libraries. CrossOver users can continue using the existing launcher.

For blurry movies, select Movie Settings > High Quality in the game's
settings. The original game supplies both 704x480 and 1280x720 versions;
the patch preserves their resolutions. This hotfix does not re-encode movies
or establish a cause for a different native-Windows playback failure.
'''

def digest(raw):
    return hashlib.sha256(raw).hexdigest()

def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()

def build(source, output):
    if source.resolve() == output.resolve():
        raise ValueError('Output must not overwrite the input archive')
    assert digest(source.read_bytes()) == BASE_SHA256, 'Unexpected source package'
    with zipfile.ZipFile(source) as z:
        entries = {i.filename[len(ROOT)+1:]: i for i in z.infolist() if not i.is_dir()}
        assert len(entries) == 118
        assert all(i.filename.startswith(ROOT + '/') for i in entries.values())
        replacements = {
            PREFIX + 'game files/' + LAUNCHER: (SITE / 'tools/macos' / LAUNCHER).read_bytes(),
            'README.txt': z.read(entries['README.txt']) + NOTE.encode(),
            PREFIX + 'README.txt': z.read(entries[PREFIX + 'README.txt']) + NOTE.encode(),
            'RELEASE_NOTES.md': (SITE / 'RELEASE_NOTES.md').read_bytes(),
        }
        def payload(name):
            return replacements[name] if name in replacements else z.read(entries[name])
        names = set(entries) | set(replacements)
        def metadata(name, prefix=''):
            raw = payload(name)
            return {'path': name[len(prefix):], 'sha256': digest(raw), 'byte_count': len(raw)}
        platform_manifest = json.loads(payload(PREFIX + 'MANIFEST.json'))
        platform_manifest['hotfix'] = '2026-09-23-macos-media-launcher'
        platform_manifest['files'] = [metadata(n, PREFIX) for n in sorted(names)
                                     if n.startswith(PREFIX) and n != PREFIX+'MANIFEST.json']
        replacements[PREFIX + 'MANIFEST.json'] = encoded(platform_manifest)
        manifest = json.loads(payload('MANIFEST.json'))
        manifest['hotfix'] = '2026-09-23-macos-media-launcher'
        manifest['hotfix_base_sha256'] = BASE_SHA256
        manifest['files'] = [metadata(n) for n in sorted(names)
                             if n not in {'MANIFEST.json','SHA256SUMS.txt'}]
        replacements['MANIFEST.json'] = encoded(manifest)
        replacements['SHA256SUMS.txt'] = ''.join(
            f'{digest(payload(n))}  {n}\n' for n in sorted(names) if n != 'SHA256SUMS.txt'
        ).encode()
        output.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as dest:
            for name in sorted(names):
                info = zipfile.ZipInfo(ROOT+'/'+name, (2026,9,23,0,0,0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = entries[name].external_attr if name in entries else (0o100755 << 16)
                dest.writestr(info, payload(name))
        with zipfile.ZipFile(output) as dest:
            assert dest.testzip() is None
            assert len(dest.infolist()) == 119
            actual = {n: dest.read(ROOT+'/'+n) for n in names}
            for name in names:
                assert actual[name] == payload(name), name
                if name not in replacements:
                    assert actual[name] == z.read(entries[name]), name
            for prefix in ['', 'Main Game/Windows/', PREFIX]:
                m = json.loads(actual[prefix+'MANIFEST.json'])
                assert m['version'] == VERSION
                for record in m['files']:
                    raw = actual[prefix+record['path']]
                    assert (digest(raw),len(raw)) == (record['sha256'],record['byte_count'])
            for line in actual['SHA256SUMS.txt'].decode().splitlines():
                checksum, name = line.split('  ',1)
                assert digest(actual[name]) == checksum
        report = {'version': VERSION, 'hotfix': manifest['hotfix'],
                  'archive': output.name, 'sha256': digest(output.read_bytes()),
                  'byte_count': output.stat().st_size, 'changed_members': sorted(replacements),
                  'all_other_members_byte_exact': True, 'crc_and_manifests_verified': True}
        output.with_suffix('.report.json').write_bytes(encoded(report))
        print(json.dumps(report,indent=2))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    build(args.source,args.output)
