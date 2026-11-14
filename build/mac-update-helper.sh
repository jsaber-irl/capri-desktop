#!/bin/sh
# Fixed, reviewed installer helper. Paths are passed as individual quoted arguments by the
# authenticated updater; no downloaded metadata is evaluated as shell code.
set -eu

parent_pid=$1
archive=$2
target=$3
stage=$4
backup=$5
success_marker=$6
version=$7
candidate="$stage/Capri.app"
failure_marker="$(/usr/bin/dirname "$success_marker")/install-failed.json"

fail() {
  if [ -d "$backup" ] && [ ! -e "$target" ]; then /bin/mv "$backup" "$target" || true; fi
  /bin/rm -rf "$stage"
  /bin/printf '%s\n' '{"error":"The verified macOS update could not be installed. Check available disk space and folder permissions, then retry."}' > "$failure_marker" 2>/dev/null || true
  exit 1
}

case "$target" in *.app) ;; *) fail ;; esac
case "$stage" in "$(/usr/bin/dirname "$target")"/.capri-update-stage-*) ;; *) fail ;; esac
case "$archive" in *.zip) ;; *) fail ;; esac

while /bin/kill -0 "$parent_pid" 2>/dev/null; do /bin/sleep 0.25; done
/usr/bin/ditto -x -k "$archive" "$stage" || fail
[ -f "$candidate/Contents/Info.plist" ] || fail
[ -x "$candidate/Contents/MacOS/Capri" ] || fail

# Mark the downloaded app as quarantined so macOS applies its normal Gatekeeper checks.
timestamp=$(/usr/bin/printf '%x' "$(/bin/date +%s)")
/usr/bin/xattr -w com.apple.quarantine "0001;$timestamp;Capri;00000000-0000-0000-0000-000000000000" "$candidate" || fail

[ ! -e "$backup" ] || fail
/bin/mv "$target" "$backup" || fail
/bin/mv "$candidate" "$target" || fail

# `open -W` returns after the new Capri session exits. Its startup writes the marker only after
# Electron has initialized the updated app; if launch fails or is rejected, restore the old bundle.
if /usr/bin/open -n -W "$target"; then
  if [ -f "$success_marker" ] && [ "$(/bin/cat "$success_marker")" = "$version" ]; then
    /bin/rm -rf "$backup" "$stage"
    /bin/rm -f "$archive" "$(/usr/bin/dirname "$success_marker")/pending-install.json" "$success_marker" "$failure_marker"
    exit 0
  fi
fi

/bin/rm -rf "$target"
if [ -d "$backup" ]; then /bin/mv "$backup" "$target"; fi
/bin/rm -rf "$stage"
/bin/rm -f "$success_marker"
/bin/printf '%s\n' '{"error":"The updated app did not start successfully; Capri restored the previous app bundle."}' > "$failure_marker" 2>/dev/null || true
/usr/bin/open -n "$target" || true
exit 1
