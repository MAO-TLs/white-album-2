"""Validate the compatibility launcher without launching Wine or a game."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

LAUNCHER = Path(__file__).resolve().parents[1] / 'tools/macos/Launch WHITE ALBUM 2 (Sikarugir).command'

class MovieLauncherTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='wa2-launcher-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.game = self.root / 'bottle with spaces/drive_c/Leaf/WHITE ALBUM2'
        self.game.mkdir(parents=True)
        self.launcher = self.game / LAUNCHER.name
        shutil.copyfile(LAUNCHER, self.launcher)
        (self.game / 'WA2.exe').write_bytes(b'game sentinel')
        self.sika = self.root / 'Sikarugir'
        self.template = self.sika / 'Template/Template-1.0.11.app'
        self.frameworks = self.template / 'Contents/Frameworks'
        self.gst = self.frameworks / 'GStreamer.framework/Versions/1.0'
        for path in [self.gst / 'lib/libgstreamer-1.0.0.dylib',
                     self.gst / 'libexec/gstreamer-1.0/gst-plugin-scanner',
                     self.frameworks / 'renderer/d9vk/wine/i386-windows/d3d9.dll']:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.touch()
            path.chmod(0o755)
        (self.gst / 'lib/gstreamer-1.0').mkdir()
        self.engine = self.root / 'verified engine/wswine.bundle'
        wine = self.engine / 'bin/wine'
        wine.parent.mkdir(parents=True)
        wine.write_text('#!/bin/bash\nprintf "argument=%s\\n" "$1"\npwd\nenv\n')
        wine.chmod(0o755)
        self.env = {**os.environ, 'MAO_SIKARUGIR_ROOT': str(self.sika),
                    'MAO_SIKARUGIR_ENGINE': str(self.engine),
                    'WINEDEBUG': '-all', 'GST_DEBUG': '0'}

    def run_launcher(self):
        return subprocess.run(['bash', str(self.launcher)], env=self.env,
                              capture_output=True, text=True)

    def test_launch_preserves_game_and_uses_complete_runtime(self):
        self.env['WINEDLLOVERRIDES'] = 'd3d9=b;mscoree=d'
        before = (self.game / 'WA2.exe').read_bytes()
        result = self.run_launcher()
        self.assertEqual(result.returncode, 0, result.stderr)
        lines = result.stdout.splitlines()
        env = dict(line.split('=', 1) for line in lines if '=' in line)
        self.assertEqual(env['argument'], 'WA2.exe')
        self.assertIn(str(self.game), lines)
        self.assertEqual(env['WINEPREFIX'], str(self.root / 'bottle with spaces'))
        self.assertEqual(env['GST_PLUGIN_SYSTEM_PATH_1_0'], str(self.gst / 'lib/gstreamer-1.0'))
        self.assertEqual(env['WINEDLLOVERRIDES'], 'd3d9=b;mscoree=d;d3d9=n,b')
        self.assertEqual(env['WINEDEBUG'], '-all')
        self.assertEqual(env['GST_DEBUG'], '0')
        self.assertEqual((self.game / 'WA2.exe').read_bytes(), before)
        self.assertFalse((self.game / '.mao-runtime').exists())

    def test_missing_game(self):
        (self.game / 'WA2.exe').unlink()
        result = self.run_launcher()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('beside WA2.exe', result.stderr)

    def test_missing_media_library(self):
        (self.gst / 'lib/libgstreamer-1.0.0.dylib').unlink()
        result = self.run_launcher()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('GStreamer', result.stderr)

    def test_missing_renderer(self):
        (self.frameworks / 'renderer/d9vk/wine/i386-windows/d3d9.dll').unlink()
        result = self.run_launcher()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('D3D9', result.stderr)

    def test_bad_explicit_engine(self):
        self.env['MAO_SIKARUGIR_ENGINE'] = str(self.root / 'absent')
        result = self.run_launcher()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('MAO_SIKARUGIR_ENGINE', result.stderr)

    def test_missing_cached_engine_does_not_download(self):
        del self.env['MAO_SIKARUGIR_ENGINE']
        result = self.run_launcher()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('No runtime has been downloaded or changed', result.stderr)
        self.assertFalse((self.game / '.mao-runtime').exists())

    def test_requires_existing_prefix(self):
        outside = self.root / 'standalone'
        outside.mkdir()
        self.launcher = outside / LAUNCHER.name
        shutil.copyfile(LAUNCHER, self.launcher)
        (outside / 'WA2.exe').touch()
        result = self.run_launcher()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('existing Wine bottle', result.stderr)

if __name__ == '__main__':
    unittest.main()
