#!/usr/bin/env node
// Checks every marketplace entry against its CLI repo at the pinned tag:
//   - the source is a maschinenlesbar-org GitHub repo pinned to an existing v* tag
//   - plugin.json at that tag has the same name and a version
//   - plugin.json and skills/ pass `claude plugin validate --strict`
//   - if the ref moved since the previous marketplace commit and the plugin changed,
//     plugin.json's version changed too (installs are cached by version, so a moved
//     ref with the same version never reaches existing users)
// Stale refs (a newer v* tag exists) are reported as warnings, not failures.
//
// Usage: node scripts/check-plugins.mjs [--base <git-rev>] [plugin-name ...]
// Needs git and the Claude Code CLI (`claude`, or set CLAUDE_BIN). GIT_URL_BASE
// (default https://github.com) points the clones at a mirror, e.g. for testing.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ORG = 'maschinenlesbar-org';
const TAG = /^v\d+\.\d+\.\d+$/;
const MANIFEST = '.claude-plugin/marketplace.json';
const claude = process.env.CLAUDE_BIN || 'claude';
const inActions = Boolean(process.env.GITHUB_ACTIONS);

const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const base = baseIdx >= 0 ? args.splice(baseIdx, 2)[1] : 'HEAD^';
const only = new Set(args);

let errors = 0;
let warnings = 0;
const error = (name, msg) => {
  errors++;
  console.log(inActions ? `::error title=${name}::${msg}` : `  ✘ ${name}: ${msg}`);
};
const warn = (name, msg) => {
  warnings++;
  console.log(inActions ? `::warning title=${name}::${msg}` : `  ⚠ ${name}: ${msg}`);
};

const run = (cmd, argv, opts = {}) =>
  execFileSync(cmd, argv, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });

const semver = (tag) => tag.slice(1).split('.').map(Number);
const newer = (a, b) => {
  const [x, y] = [semver(a), semver(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

// Marketplace as of the base revision, to detect moved refs. Missing on the first commit.
function previousEntries() {
  try {
    const old = JSON.parse(run('git', ['show', `${base}:${MANIFEST}`]));
    return new Map(old.plugins.map((p) => [p.name, p]));
  } catch {
    return new Map();
  }
}

// plugin.json minus version, plus the skills/ tree hash: what users actually receive.
function contentKey(dir, rev) {
  const plugin = JSON.parse(run('git', ['-C', dir, 'show', `${rev}:.claude-plugin/plugin.json`]));
  const { version, ...rest } = plugin;
  const skills = run('git', ['-C', dir, 'rev-parse', `${rev}:skills`]).trim();
  return { version, key: JSON.stringify(rest) + skills };
}

const marketplace = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const previous = previousEntries();
const work = mkdtempSync(join(tmpdir(), 'check-plugins-'));
const seen = new Set();

try {
  for (const entry of marketplace.plugins) {
    const { name, source } = entry;
    if (seen.has(name)) error(name, 'duplicate plugin name');
    seen.add(name);
    if (only.size && !only.has(name)) continue;
    console.log(`${name}`);

    if (entry.version !== undefined) error(name, 'set version in the CLI repo\'s plugin.json, not in the marketplace entry');
    if (source?.source !== 'github' || !source.repo?.startsWith(`${ORG}/`) || !TAG.test(source.ref ?? '')) {
      error(name, `source must be { "source": "github", "repo": "${ORG}/…", "ref": "vX.Y.Z" }`);
      continue;
    }
    const url = `${process.env.GIT_URL_BASE || 'https://github.com'}/${source.repo}.git`;

    const tags = run('git', ['ls-remote', '--tags', '--refs', url])
      .split('\n')
      .map((line) => line.split('refs/tags/')[1])
      .filter((t) => t && TAG.test(t));
    if (!tags.includes(source.ref)) {
      error(name, `tag ${source.ref} not found in ${source.repo}`);
      continue;
    }
    const latest = tags.reduce((a, b) => (newer(b, a) ? b : a));
    if (latest !== source.ref) warn(name, `pinned to ${source.ref}, but ${latest} is the latest tag`);

    const dir = join(work, name);
    run('git', ['clone', '--quiet', '--depth', '1', '--branch', source.ref, url, dir]);
    const pluginJson = join(dir, '.claude-plugin/plugin.json');
    if (!existsSync(pluginJson)) {
      error(name, `${source.ref} has no .claude-plugin/plugin.json`);
      continue;
    }
    const plugin = JSON.parse(readFileSync(pluginJson, 'utf8'));
    if (plugin.name !== name) error(name, `plugin.json name is "${plugin.name}"`);
    if (!plugin.version) error(name, 'plugin.json has no version');

    for (const target of [pluginJson, join(dir, 'skills')]) {
      try {
        run(claude, ['plugin', 'validate', '--strict', target]);
      } catch (e) {
        error(name, `claude plugin validate --strict failed for ${target.slice(dir.length + 1)}:\n${e.stdout}${e.stderr}`);
      }
    }

    const old = previous.get(name);
    if (old?.source?.ref && old.source.ref !== source.ref && TAG.test(old.source.ref)) {
      try {
        run('git', ['-C', dir, 'fetch', '--quiet', '--depth', '1', 'origin', 'tag', old.source.ref]);
        const [before, after] = [contentKey(dir, old.source.ref), contentKey(dir, source.ref)];
        if (before.key !== after.key && before.version === after.version) {
          error(name, `plugin changed between ${old.source.ref} and ${source.ref} but its version is still ${after.version}; bump plugin.json version in the CLI repo and re-tag`);
        }
      } catch (e) {
        warn(name, `could not compare with previous ref ${old.source.ref}: ${e.message.split('\n')[0]}`);
      }
    }
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

console.log(`\n${seen.size} plugins, ${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
