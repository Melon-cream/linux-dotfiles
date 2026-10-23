#!/usr/bin/env bash
set -euo pipefail

BIN="${HERDR_BIN_PATH:-herdr}"
STATE_DIR="$HOME/.config/herdr/state"
CWD="$PWD"

mkdir -p "$STATE_DIR"

ws_json="$("$BIN" workspace create --label workspace --cwd "$CWD" --focus)"
ws_id="$(   printf '%s' "$ws_json" | jq -r -c '.result.workspace.workspace_id')"
t1="$(      printf '%s' "$ws_json" | jq -r -c '.result.tab.tab_id')"
p_left="$(  printf '%s' "$ws_json" | jq -r -c '.result.root_pane.pane_id')"

p_right="$("$BIN" pane split --pane "$p_left" --direction right --ratio 0.5 --cwd "$CWD" --no-focus \
  | jq -r -c '.result.pane.pane_id')"

p_opencode="$("$BIN" pane split --pane "$p_right" --direction down --ratio 0.5 --cwd "$CWD" --no-focus \
  | jq -r -c '.result.pane.pane_id')"

"$BIN" tab create --workspace "$ws_id" --label terminal --cwd "$CWD" --no-focus \
  | jq -r -c '.result.tab.tab_id' >/dev/null

printf '%s\n' "$p_left" > "$STATE_DIR/.left-pane"
printf '%s\n' "leaf"    > "$STATE_DIR/.left-kind"

"$BIN" pane run "$p_right"    "yazi"     >/dev/null 2>&1 || true
"$BIN" pane run "$p_opencode" "opencode" >/dev/null 2>&1 || true
"$BIN" pane run "$p_left"     "leaf" >/dev/null 2>&1 || true

"$BIN" tab focus "$t1" >/dev/null 2>&1 || true