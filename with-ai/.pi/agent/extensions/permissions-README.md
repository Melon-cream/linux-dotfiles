# pi permission policy

Pi has **no built-in permission-policy setting** (no equivalent of opencode's
`permission` section). The official mechanism is an extension that gates
`on("tool_call")`. This setup combines a JSON policy file with such an extension.

## Files

| File | Role |
|------|------|
| `~/.pi/agent/permissions.json` | Policy file (mirrors the `permission` section of the user's `opencode.json`) |
| `~/.pi/agent/permissions.schema.json` | JSON Schema for editor validation (`$schema` ref) |
| `~/.pi/agent/extensions/permissions.ts` | Extension that enforces the policy |

## Policy format

Each section maps a **glob pattern** to an action: `allow` | `ask` | `deny`.

| Section | Matched against |
|---------|-----------------|
| `bash` | the full command line |
| `read` / `write` / `edit` | the file path (raw form and resolved absolute form) |
| `external_directory` | additionally, paths outside the current working directory |
| `tools` | tool names (e.g. MCP tools) |

- `"*"` is the fallback default within a section (a lone `*` matches any path, slashes included).
- When several patterns match, the **most specific** one (longest literal part) wins.
- Path patterns: `*` matches within one path segment, `**` crosses segments,
  `~` and `$HOME` are expanded. `**/X` also matches `X` at the root.
- `ask` prompts via the UI and is **blocked in non-interactive mode** (fail-safe).
- A project `.pi/permissions.json` is merged with the global one, but its rules
  may only restrict (`ask`/`deny`) so an untrusted project cannot loosen global rules.
- Bash patterns match the whole command line (`cmd A && cmd B` is treated as one string).

## Applying changes

- Editing `permissions.json` takes effect on the next `tool_call` (re-read per call).
- Editing `permissions.ts` requires `/reload` (or pi restart).

## Examples

```json
{
  "bash": {
    "*": "allow",
    "git push *": "ask"
  },
  "read": {
    "*": "allow",
    "~/.ssh/*": "deny"
  }
}
```

## Notes

- Non-interactive modes (`-p`, `--mode json`, `--mode rpc`) block all `ask` rules.
  Add `--approve`-style handling or run interactively if that breaks automation.
- For stronger isolation, see the official recommendation: run pi in a
  container/sandbox (`pi docs containerization`).
