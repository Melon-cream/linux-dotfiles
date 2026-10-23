/**
 * Permission gate extension for pi.
 *
 * Enforces ~/.pi/agent/permissions.json (global) and, when present, project
 * .pi/permissions.json (project). Model and glob syntax mirror the opencode.json
 * "permission" section:
 *
 *   - bash:                glob matched against the full command line
 *   - read / write / edit: glob matched against the file path
 *   - external_directory:  extra rules for paths outside the current working directory
 *   - tools:               glob matched against tool names (e.g. MCP tools)
 *
 * Each entry maps a glob pattern to "allow" | "ask" | "deny". "*" is the
 * fallback default within a section (a lone "*" matches any path, slashes
 * included). When several patterns match, the most specific one (longest
 * literal part) wins. "ask" prompts via the UI and is blocked in
 * non-interactive mode (fail-safe).
 *
 * Path patterns: "**" crosses "/", a single "*" stays within one path
 * segment (e.g. "**" + "/.env" matches ".env" at any depth). Bash patterns
 * match the whole command line.
 *
 * Project rules may only restrict: "allow" entries in a project file are
 * ignored, so an untrusted project cannot loosen global rules.
 *
 * "**" + "/" in path patterns also matches the root (e.g. "**" + "/.env" matches ".env").
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type Action = "allow" | "ask" | "deny";
type RuleMap = Record<string, Action>;

interface PermissionConfig {
	bash?: RuleMap;
	read?: RuleMap;
	write?: RuleMap;
	edit?: RuleMap;
	external_directory?: RuleMap;
	tools?: RuleMap;
}

const HOME = os.homedir();
const GLOBAL_CONFIG = path.join(HOME, ".pi", "agent", "permissions.json");
const PROJECT_CONFIG = path.join(process.cwd(), ".pi", "permissions.json");

const PATH_TOOLS = new Set(["read", "write", "edit"]);
const RANK: Record<Action, number> = { allow: 1, ask: 2, deny: 3 };
const DEFAULT_ACTION: Action = "allow";

function expandHome(p: string): string {
	if (p.startsWith("~/")) return HOME + p.slice(1);
	if (p.startsWith("$HOME/")) return HOME + p.slice("$HOME".length);
	return p;
}

function globToRegex(pattern: string, pathMode: boolean): RegExp {
	const expanded = expandHome(pattern);
	// a lone "*" is the catch-all default and must match any path, slashes included
	if (pathMode && expanded === "*") return /^.*$/;
	const escaped = expanded.replace(/[.+^${}()|[\]\\]/g, "\\$&");
	if (pathMode) {
		// "**" crosses "/", single "*" stays within one path segment
		return new RegExp(
			"^" +
				escaped.replace(/\*\*/g, "\u0001").replace(/\*/g, "[^/]*").replace(/\u0001/g, ".*").replace(/\?/g, "[^/]") +
				"$",
		);
	}
	return new RegExp("^" + escaped.replace(/\*\*/g, ".*").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
}

function regexesFor(pattern: string, pathMode: boolean): RegExp[] {
	const main = globToRegex(pattern, pathMode);
	if (pathMode && pattern.startsWith("**/")) {
		// "**/.env" should also match ".env" at the root (no leading slash)
		return [main, globToRegex(pattern.slice(3), pathMode)];
	}
	return [main];
}

function specificity(pattern: string): number {
	let n = 0;
	for (const ch of expandHome(pattern)) {
		if (ch !== "*" && ch !== "?") n++;
	}
	return n;
}

function bestMatch(
	target: string,
	rules: RuleMap | undefined,
	pathMode: boolean,
): { action: Action; pattern: string } | undefined {
	if (!rules) return undefined;
	let best: { action: Action; pattern: string; score: number } | undefined;
	for (const [pattern, action] of Object.entries(rules)) {
		if (regexesFor(pattern, pathMode).some((re) => re.test(target))) {
			const score = specificity(pattern);
			if (!best || score > best.score) best = { action, pattern, score };
		}
	}
	return best;
}

function pickStricter(
	a: { action: Action } | undefined,
	b: { action: Action } | undefined,
): { action: Action } | undefined {
	if (!a) return b;
	if (!b) return a;
	return RANK[a.action] >= RANK[b.action] ? a : b;
}

/** Match a path as given by the tool against rules, testing both the raw form and the resolved absolute form. */
function matchPath(raw: string, rules: RuleMap | undefined): { action: Action; pattern: string } | undefined {
	return pickStricter(bestMatch(raw, rules, true), bestMatch(resolvePath(raw), rules, true));
}

function resolvePath(p: string): string {
	if (p.startsWith("~/")) return path.join(HOME, p.slice(2));
	if (p.startsWith("$HOME/")) return path.join(HOME, p.slice("$HOME/".length));
	return path.isAbsolute(p) ? path.normalize(p) : path.resolve(process.cwd(), p);
}

function isInsideCwd(abs: string): boolean {
	const cwd = process.cwd();
	return abs === cwd || abs.startsWith(cwd + path.sep);
}

function loadConfig(): PermissionConfig {
	const merged: PermissionConfig = {};
	const mergeFile = (file: string, restrict: boolean): void => {
		let parsed: PermissionConfig;
		try {
			parsed = JSON.parse(fs.readFileSync(file, "utf8")) as PermissionConfig;
		} catch {
			return; // missing or invalid file: skip
		}
		for (const section of ["bash", "read", "write", "edit", "external_directory", "tools"] as const) {
			const rules = parsed[section];
			if (!rules || typeof rules !== "object") continue;
			const target = (merged[section] ??= {});
			for (const [pattern, action] of Object.entries(rules)) {
				if (action !== "allow" && action !== "ask" && action !== "deny") continue;
				if (restrict && action === "allow") continue; // project rules can only restrict
				target[pattern] = action;
			}
		}
	};
	mergeFile(GLOBAL_CONFIG, false);
	mergeFile(PROJECT_CONFIG, true); // project overrides global, but only with ask/deny
	return merged;
}

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		const config = loadConfig();
		let action: Action = DEFAULT_ACTION;
		let reason = "";

		if (event.toolName === "bash") {
			const command = String((event.input as { command?: unknown }).command ?? "");
			const m = bestMatch(command, config.bash, false);
			if (m) {
				action = m.action;
				reason = `bash rule "${m.pattern}"`;
			}
		} else if (PATH_TOOLS.has(event.toolName)) {
			const raw = String((event.input as { path?: unknown }).path ?? "");
			if (!raw) return undefined;
			const abs = resolvePath(raw);
			const section = config[event.toolName as "read" | "write" | "edit"];
			const m = matchPath(raw, section);
			if (m) {
				action = m.action;
				reason = `${event.toolName} rule "${m.pattern}"`;
			}
			if (!isInsideCwd(abs)) {
				const ext = matchPath(raw, config.external_directory);
				if (ext && RANK[ext.action] > RANK[action]) {
					action = ext.action;
					reason = `external_directory rule "${ext.pattern}"`;
				}
			}
		} else {
			const m = bestMatch(event.toolName, config.tools, false);
			if (m) {
				action = m.action;
				reason = `tools rule "${m.pattern}"`;
			}
		}

		if (action === "allow") return undefined;

		if (action === "deny") {
			return { block: true, reason: `[permissions] Denied by ${reason}` };
		}

		// ask
		if (!ctx.hasUI) {
			return { block: true, reason: `[permissions] Blocked (no UI): ${reason}` };
		}
		const detail =
			event.toolName === "bash"
				? `Command:\n  ${String((event.input as { command?: unknown }).command ?? "")}`
				: `Path:\n  ${String((event.input as { path?: unknown }).path ?? "")}`;
		const ok = await ctx.ui.confirm("Permission required", `${detail}\n\nRule: ${reason}\n\nAllow?`);
		if (!ok) return { block: true, reason: `[permissions] Blocked by user (${reason})` };
		return undefined;
	});
}
