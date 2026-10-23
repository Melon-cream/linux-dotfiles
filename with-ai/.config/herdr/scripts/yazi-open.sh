#!/usr/bin/env bash
set -euo pipefail

BIN="${HERDR_BIN_PATH:-herdr}"
STATE_DIR="$HOME/.config/herdr/state"
STATUS_FILE="$STATE_DIR/.modified-status"

pane_id="$(cat "$STATE_DIR/.left-pane" 2>/dev/null || true)"
cur_kind="$(cat "$STATE_DIR/.left-kind" 2>/dev/null || true)"
cur_kind="${cur_kind:-leaf}"

[ -n "$pane_id" ] || exit 0

if [ "$cur_kind" = "nvim" ]; then
  modified="$(cat "$STATUS_FILE" 2>/dev/null || echo 0)"
  if [ "$modified" != "0" ]; then
    "$BIN" notification show "Blocked: unsaved changes in vim" \
      --body "The file currently open in vim has unsaved changes. Save it with :w or discard with :q! before opening a file from yazi." \
      >/dev/null 2>&1 || true
    exit 0
  fi
fi

case "$cur_kind" in
  leaf) "$BIN" pane run "$pane_id" "q" >/dev/null 2>&1 || true ;;
  nvim) "$BIN" pane send-keys "$pane_id" esc ":" q a "!" enter >/dev/null 2>&1 || true ;;
esac

sleep 0.5

first="$1"
case "$first" in
  *.md|*.markdown)
    cmd="leaf --watch $(printf %q "$first")"
    new_kind="leaf"
    ;;
  *)
    cmd="nvim"
    for f in "$@"; do
      cmd="$cmd $(printf %q "$f")"
    done
    cmd="$cmd -c \"call writefile(['0'],'$STATUS_FILE') | au BufModifiedSet * call writefile([string(&mod)],'$STATUS_FILE') | au VimLeave * call writefile(['0'],'$STATUS_FILE')\""
    new_kind="nvim"
    ;;
esac

"$BIN" pane run "$pane_id" "$cmd" >/dev/null 2>&1 || true

printf '%s\n' "$new_kind" > "$STATE_DIR/.left-kind"