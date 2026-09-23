#!/bin/bash
# Same-version v2.1.0 compatibility launcher. Uses the user's installed
# Sikarugir runtime; does not download runtimes or modify game/movie files.
set -euo pipefail
GAME_DIR=$(cd "$(dirname "$0")" && pwd)
fail() { printf '%s\n' "$*" >&2; exit 1; }
[[ -f "$GAME_DIR/WA2.exe" ]] || fail 'Place this launcher beside WA2.exe in your installed game.'
case "$GAME_DIR" in
  */drive_c/*) BOTTLE_ROOT=${GAME_DIR%%/drive_c/*} ;;
  *) fail 'Place the game inside its existing Wine bottle (under drive_c) before using this launcher. This preserves the existing bottle and saves.' ;;
esac

SIKARUGIR_ROOT="${MAO_SIKARUGIR_ROOT:-$HOME/Library/Application Support/Sikarugir}"
TEMPLATE="${MAO_SIKARUGIR_TEMPLATE:-$SIKARUGIR_ROOT/Template/Template-1.0.11.app}"
FRAMEWORKS="$TEMPLATE/Contents/Frameworks"
GST_ROOT="$FRAMEWORKS/GStreamer.framework/Versions/1.0"
RENDERER="$FRAMEWORKS/renderer/d9vk/wine"
[[ -f "$GST_ROOT/lib/libgstreamer-1.0.0.dylib" && -d "$GST_ROOT/lib/gstreamer-1.0" ]] ||
  fail 'The complete Sikarugir 1.0.11 template is required, including its GStreamer framework. Install it with Sikarugir Creator first.'
[[ -f "$RENDERER/i386-windows/d3d9.dll" ]] || fail 'The Sikarugir template is missing its D3D9 Vulkan renderer.'
[[ -x "$GST_ROOT/libexec/gstreamer-1.0/gst-plugin-scanner" ]] || fail 'The Sikarugir template is missing its GStreamer plugin scanner.'

ENGINE_ID=WS12WineSikarugir10.0_6
CACHE="$GAME_DIR/.mao-runtime"
ENGINE="${MAO_SIKARUGIR_ENGINE:-$CACHE/$ENGINE_ID/wswine.bundle}"
if [[ ! -x "$ENGINE/bin/wine" ]]; then
  [[ -z "${MAO_SIKARUGIR_ENGINE:-}" ]] || fail 'MAO_SIKARUGIR_ENGINE does not contain an executable bin/wine.'
  ARCHIVE="$SIKARUGIR_ROOT/Engines/$ENGINE_ID.tar.xz"
  [[ -f "$ARCHIVE" ]] || fail "Install $ENGINE_ID with Sikarugir Creator first. No runtime has been downloaded or changed."
  mkdir -p "$CACHE"
  STAGING=$(mktemp -d "$CACHE/engine-stage.XXXXXX")
  # Retain staging on failure for diagnosis; never remove an existing engine.
  tar -xJf "$ARCHIVE" -C "$STAGING"
  [[ -x "$STAGING/wswine.bundle/bin/wine" ]] || fail "Incomplete runtime archive; staging retained at $STAGING"
  [[ ! -e "$CACHE/$ENGINE_ID" ]] || fail "An incomplete engine cache already exists at $CACHE/$ENGINE_ID; move it aside before retrying."
  mv "$STAGING" "$CACHE/$ENGINE_ID"
fi

export WINEPREFIX="$BOTTLE_ROOT"
export DYLD_FALLBACK_LIBRARY_PATH="$FRAMEWORKS:$GST_ROOT/lib${DYLD_FALLBACK_LIBRARY_PATH:+:$DYLD_FALLBACK_LIBRARY_PATH}"
export GST_PLUGIN_SYSTEM_PATH_1_0="$GST_ROOT/lib/gstreamer-1.0"
export GST_PLUGIN_SCANNER_1_0="$GST_ROOT/libexec/gstreamer-1.0/gst-plugin-scanner"
export GST_REGISTRY_1_0="$BOTTLE_ROOT/mao-gstreamer-$ENGINE_ID.bin"
# Retain MAO's local audio-subtitle proxy, with the accelerated system backend.
export WINEDLLPATH_PREPEND="$RENDERER${WINEDLLPATH_PREPEND:+:$WINEDLLPATH_PREPEND}"
export WINEDLLOVERRIDES="${WINEDLLOVERRIDES:+$WINEDLLOVERRIDES;}d3d9=n,b"
export WINEDEBUG="${WINEDEBUG:--all}"
export GST_DEBUG="${GST_DEBUG:-0}"
cd "$GAME_DIR"
exec "$ENGINE/bin/wine" WA2.exe
