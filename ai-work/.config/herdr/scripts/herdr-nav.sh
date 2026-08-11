#!/usr/bin/env bash
set -euo pipefail

DIRECTION="${1:?usage: herdr-nav.sh <left|right|up|down>}"
BIN="${HERDR_BIN_PATH:-herdr}"

try_focus() {
  local dir="$1"
  local focus_out changed
  focus_out="$("$BIN" pane focus --direction "$dir" --current 2>&1 || true)"
  changed="$(printf '%s' "$focus_out" | jq -r '.result.focus.changed // .result.focus.reason // false' 2>/dev/null || echo false)"
  [ "$changed" = "true" ]
}

# Prefer moving within the current vertical stack, then horizontally,
# then fall back to tab switching. Unchanged directions pass through.
case "$DIRECTION" in
  left)  try_focus up || try_focus left || true ;;
  right) try_focus down || try_focus right || true ;;
  up)    try_focus up || true ;;
  down)  try_focus down || true ;;
esac

next_tab_id="$("$BIN" tab list 2>/dev/null |
  jq -r -c --arg cur "$HERDR_ACTIVE_TAB_ID" --arg dir "$DIRECTION" '
    .result.tabs as $tabs
    | ( [ $tabs[].tab_id ] | index($cur) ) as $idx
    | if $idx == null then empty
      else
        ( if $dir == "left" or $dir == "up" then $idx - 1 else $idx + 1 end ) as $target
        | if $target < 0 then $tabs[($tabs|length)-1].tab_id
          elif $target >= ($tabs|length) then $tabs[0].tab_id
          else $tabs[$target].tab_id
          end
      end' 2>/dev/null || true)"

if [ -n "$next_tab_id" ]; then
  "$BIN" tab focus "$next_tab_id" >/dev/null 2>&1 || true
fi