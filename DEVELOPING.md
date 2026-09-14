# Developing

This repo is only a catalogue. The skills live in the `*-cli` repositories; this repo lists
them in [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json), checks
that every entry still installs, and builds the website for it.

## Layout

```
.claude-plugin/marketplace.json   the marketplace: name "maschinenlesbar", one entry per CLI
scripts/check-plugins.mjs         checks every entry against its repo at the pinned tag
site/                             the website (Jekyll + banira components + Fylgja CSS)
.github/workflows/validate.yml    runs the validator and the check on every push
.github/workflows/pages.yml       builds site/ and deploys it to GitHub Pages
```

Each entry points at a CLI repository and pins a release tag:

```json
{
  "name": "fim-portal",
  "source": { "source": "github", "repo": "maschinenlesbar-org/fim-portal-cli", "ref": "v0.0.9" },
  "description": "…",
  "category": "government"
}
```

- `name` must equal `name` in the CLI repo's `.claude-plugin/plugin.json`. It is the
  install id (`fim-portal@maschinenlesbar`) and the skill namespace
  (`/fim-portal:fim-field-finder`).
- **No `version` in the entry.** The version lives in the CLI repo's `plugin.json`, which
  wins over the entry anyway; keeping it in one place avoids drift.
- The other metadata (description, author, license, repository, homepage, category,
  keywords) is copied from the CLI repo when an entry is added. Keep it in sync by hand
  when a CLI's description changes.
- `metadata.description`, not a top-level `description`: Claude Code 2.1.79 rejects the
  top-level key (2.1.236 accepts both).

## Shipping a plugin update

Claude Code caches an installed plugin under its `plugin.json` **version**. Moving the
`ref` to a new tag without changing the version does nothing for people who already
installed the plugin. So, for a CLI release that changes `skills/` or
`.claude-plugin/plugin.json`:

1. **In the CLI repo**, bump `version` in `.claude-plugin/plugin.json` (semver, independent
   of the npm version) in the release commit, then tag and release as usual.
2. **Here**, set that entry's `ref` to the new tag.
3. Run the check (below), commit, push.

A CLI release that doesn't touch the skills needs no change here; the check reports the
entry as pinned to an older tag, which is fine.

## Adding a CLI

1. In the CLI repo: `.claude-plugin/plugin.json` + `skills/<skill>/SKILL.md` at the repo
   root, **no** `marketplace.json`, and install instructions in `SKILLS.md` pointing here.
   Release a tag that contains them.
2. Here: add an entry in alphabetical order of the repository name, a row in the README's
   plugin table, and a German description in `site/_data/i18n/de.yml` (plus the category
   name, if it's a new category).
3. Run the check.

## Checks

```bash
claude plugin validate --strict .          # the marketplace manifest
node scripts/check-plugins.mjs             # every entry, at its pinned tag
node scripts/check-plugins.mjs fim-portal  # just one
```

`check-plugins.mjs` needs `git` and the Claude Code CLI (or `CLAUDE_BIN=/path/to/claude`).
It shallow-clones each repository at its tag and fails when:

- the source isn't a `maschinenlesbar-org` GitHub repo pinned to an existing `vX.Y.Z` tag;
- the entry sets a `version`, or `plugin.json` at the tag has a different name or no version;
- `claude plugin validate --strict` rejects `plugin.json` or `skills/`;
- the `ref` moved since the previous commit (`--base`, default `HEAD^`) and the plugin's
  content changed, but its version didn't.

It warns (without failing) when a newer tag than the pinned one exists. CI pins the Claude
Code version in `validate.yml`, since the validator's rules change between releases.

## Website

`site/` is a [Jekyll](https://jekyllrb.com/) site in English and German, deployed by
`pages.yml` to <https://maschinenlesbar-org.github.io/plugins/> (English) and
<https://maschinenlesbar-org.github.io/plugins/de/> (German) on every push to `main` that
touches `site/` or the marketplace.

```
site/_plugins/marketplace.rb   reads the marketplace, clones each plugin at its tag (cached in
                               site/.cache/), exposes site.data.marketplace, makes a page per
                               plugin per language: /<plugin>/ and /de/<plugin>/
site/_data/i18n/{en,de}.yml    all interface text, German plugin descriptions and category names
site/_layouts/                 default.html (shell, language switch, hreflang), home.html, plugin.html
site/index.html, site/de/      the two home pages (front matter only)
site/_includes/copy.html       a localised <copy-command>
site/components/*.ts           banira web components: <copy-command>, <plugin-filter>
site/assets/css/site.css       site styles on top of Fylgja
site/scripts/vendor-css.mjs    copies the pinned Fylgja stylesheets into assets/vendor/
```

- **Content comes from the plugins.** Descriptions, categories and keywords come from the
  marketplace entries; the skill list, plugin version and CLI package from each repo at its
  pinned tag. Apart from the German translations, nothing plugin-specific is written by hand,
  so updating the marketplace updates the site.
- **Translations.** `_data/i18n/en.yml` and `de.yml` must have the same interface keys; the
  build fails when they differ. The German plugin descriptions (`plugins:`) and category names
  (`categories:`) may lag behind: a missing one falls back to the English text (marked
  `lang="en"`) and the build logs a warning. **When you add a CLI or change a description in
  `marketplace.json`, update `de.yml` too** — the build can't notice a stale translation.
  Skill descriptions are shown in English in both languages: they are the text Claude matches
  on, and translating them would drift from the SKILL.md files. Placeholders in the strings use
  `%name%` (Liquid can't have `}` inside `{{ }}`). Another language means a new
  `_data/i18n/<lang>.yml`, an entry in `languages:` in `_config.yml`, and a `site/<lang>/index.html`.
- **banira** compiles the components to `assets/js/` (`npm run build:js`) and checks them
  (`npm test` runs `banira test` and `banira lint --strict`). Both components progressively
  enhance plain HTML: without JavaScript every plugin and command is still shown.
- **Fylgja** (`@fylgja/tokens`, `base`, `theme`, `utilities`, `card`, `badge`) is installed
  from npm at pinned versions and served from the site itself, not a CDN. The brand colour
  is `--brand` in `site.css`; dark mode follows `prefers-color-scheme`.

Build and preview locally (Node ≥ 22.12, Ruby 3.4, Bundler):

```bash
cd site
npm ci && bundle install
npm run serve        # http://127.0.0.1:4000/plugins/
npm run build        # into site/_site/
```

The first build clones all 31 plugin repositories into `site/.cache/`; later builds reuse
them until a `ref` changes.

## Why the plugins sit at the CLI repo root

Installing from a repo root clones the whole CLI repo, and because the root has a
`package.json` and a lockfile, Claude Code runs `npm ci --ignore-scripts` in the copy
(about 35 MB, devDependencies included; this can't be switched off). Moving each plugin
into a subfolder and using a `git-subdir` source would copy only the plugin, but it would
change the layout of all 31 repos and require new tags before any entry could use it.
Keeping the plugins at the root was the deliberate choice.
