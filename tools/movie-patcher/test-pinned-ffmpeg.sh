#!/bin/bash
# Test adapter only: uses the existing private test runtime, never launches WA2.
set -euo pipefail
: "${WA2_MOVIE_TEST_RUNTIME:?Set the private movie_runtime test directory}"
args=()
for arg in "$@"; do
  case "$arg" in /*) args+=("Z:$arg");; *) args+=("$arg");; esac
done
exec bash "$WA2_MOVIE_TEST_RUNTIME/run-media-test.sh" 'Movie Patcher/tools/ffmpeg.exe' "${args[@]}"
