# maschinenlesbar.org plugins

A [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces) for
the **maschinenlesbar.org** command-line tools: 31 plugins with 97 Agent Skills, one plugin
per open German public-sector API — parliament and lobbying, official statistics, weather
and water levels, energy, public warnings, jobs, and more.

Each plugin lives in its CLI's own repository, next to the code it drives, and is pinned
here to a release tag of that repository. The skills teach Claude which CLI commands to run
and how to read their JSON; they don't call the APIs themselves.

**Website:** <https://maschinenlesbar-org.github.io/plugins/> (English) ·
<https://maschinenlesbar-org.github.io/plugins/de/> (Deutsch) — a searchable catalogue with a
page per plugin listing its skills and install commands.

## Install

Inside Claude Code, add the marketplace once, then install the plugins you want:

```
/plugin marketplace add maschinenlesbar-org/plugins
/plugin install fim-portal@maschinenlesbar
```

From a shell, the same works as `claude plugin marketplace add maschinenlesbar-org/plugins`
and `claude plugin install fim-portal@maschinenlesbar`. Run `/plugin` to browse the
catalogue, and `/plugin marketplace update maschinenlesbar` to pick up new releases.

## Requirements

- **Claude Code.**
- **The plugin's CLI on your PATH**, e.g. `npm i -g @maschinenlesbar.org/fim-portal-cli`.
  Every skill checks for its CLI and tells you when it's missing — skills never install
  anything.
- **A key or account for a few APIs.** Most are open; where one isn't, the plugin's
  `SKILLS.md` says what you need and where to get it. No key is ever bundled.

Plugins install from their CLI repository, so Claude Code copies that repository and runs
`npm ci --ignore-scripts` in the copy (about 35 MB per plugin, mostly build tooling). The
skills don't use those packages; they call the CLI you installed.

## Plugins

| Plugin | Repository | What the skills do |
|---|---|---|
| `abgeordnetenwatch` | [abgeordnetenwatch-cli](https://github.com/maschinenlesbar-org/abgeordnetenwatch-cli) | Pull a politician's roll-call voting record, surface disclosed side income, and break down how a parliament voted on a bill — all over the open, key-free abgeordnetenwatch.de API (CC0 data) via the abgeordnetenwatch-cli. |
| `ausbildungssuche` | [ausbildungssuche-cli](https://github.com/maschinenlesbar-org/ausbildungssuche-cli) | Find apprenticeships & training near a place, brief a single offer from its id, and profile the training market across regions — over the Bundesagentur für Arbeit Ausbildungssuche API via the ausbildungssuche-cli. |
| `autobahn` | [autobahn-cli](https://github.com/maschinenlesbar-org/autobahn-cli) | Brief motorway disruptions before a drive, plan EV charging stops along a route, and export any Autobahn service as GeoJSON — all over the open, key-free Autobahn App API via the autobahn-cli. |
| `bundeshaushalt` | [bundeshaushalt-cli](https://github.com/maschinenlesbar-org/bundeshaushalt-cli) | Break the German federal budget down by ministry, economic group or function, compare planned vs. realised (Soll/Ist) figures, and build multi-year spending trends — all over the open, key-free bundeshaushalt.de portal via the bundeshaushalt-cli. |
| `bundesrat` | [bundesrat-cli](https://github.com/maschinenlesbar-org/bundesrat-cli) | Follow the Bundesrat: the current plenary sitting's agenda and Drucksachen, the members (by Land or party), and committee dates — via the bundesrat-cli. Surfaces only openly-licensed data. |
| `bundeswahl` | [bundeswahlleiterin-cli](https://github.com/maschinenlesbar-org/bundeswahlleiterin-cli) | Query the official Bundestagswahl 2025 result — first/second votes by Bund, Land or Wahlkreis, filtered by party — plus the parties, the 299 constituencies and structural data, via the bundeswahlleiterin-cli. Open data (Datenlizenz Deutschland). |
| `destatis-genesis` | [destatis-genesis-cli](https://github.com/maschinenlesbar-org/destatis-genesis-cli) | Find the right official-statistics object, fetch and decode its data, and export tables to CSV/Excel — over the DESTATIS GENESIS-Online API via the destatis-genesis-cli. |
| `ddb` | [deutsche-digitale-bibliothek-cli](https://github.com/maschinenlesbar-org/deutsche-digitale-bibliothek-cli) | Search Germany's digitised cultural heritage, explore facet distributions, and fetch an object's full detail — over the public v2 Deutsche Digitale Bibliothek API via the deutsche-digitale-bibliothek-cli. No API key required. |
| `dip-bundestag` | [dip-bundestag-cli](https://github.com/maschinenlesbar-org/dip-bundestag-cli) | Track a Bundestag legislative procedure end to end, profile a member, and digest Drucksachen / Plenarprotokolle with full text — all over the Bundestag DIP API via the dip-bundestag-cli. |
| `dwd` | [dwd-cli](https://github.com/maschinenlesbar-org/dwd-cli) | Brief the current German weather warnings, decode a DWD station forecast into real units, export warning areas as GeoJSON, and cross-check official warnings against crowd reports — all over the open, key-free DWD Warnwetter app API via the dwd-cli. |
| `entgeltatlas` | [entgeltatlas-cli](https://github.com/maschinenlesbar-org/entgeltatlas-cli) | Look up what a German occupation earns, compare salaries across gender/region/level, and resolve the KldB and dimension codes — over the Bundesagentur für Arbeit Entgeltatlas API via the entgeltatlas-cli. |
| `fim-portal` | [fim-portal-cli](https://github.com/maschinenlesbar-org/fim-portal-cli) | Assemble service dossiers, lay out data-schema form blueprints, audit schema quality, and find reusable data fields — all over the open, key-free FIM Portal API via the fim-portal-cli. |
| `fit-connect` | [fit-connect-cli](https://github.com/maschinenlesbar-org/fit-connect-cli) | Resolve which German authority is responsible for a public service in a given place, look up area codes (ags/ars/areaId), and build citizen-facing service briefings — all over the open, key-free FIT-Connect Routing API via the fit-connect-cli. |
| `fragdenstaat` | [fragdenstaat-cli](https://github.com/maschinenlesbar-org/fragdenstaat-cli) | Find and analyse FOI requests, look up the right authority, explore the German FOI legal landscape, and dig out and export released documents — all over the public, key-free FragDenStaat.de API via the fragdenstaat-cli. |
| `govdata` | [govdata-cli](https://github.com/maschinenlesbar-org/govdata-cli) | Find and rank open German government datasets, build catalogue statistics with CKAN facets, and harvest downloadable resources into a manifest — all over the open, key-free GovData CKAN API via the govdata-cli. |
| `hochwasser` | [hochwasserzentralen-cli](https://github.com/maschinenlesbar-org/hochwasserzentralen-cli) | Check Germany's official flood warnings and the flood classification at ~1200 gauges, get a per-state situation overview, and export warning areas or gauges as GeoJSON — all over the open, key-free LHP-PublicAPI via the hochwasserzentralen-cli. |
| `jobsuche` | [jobsuche-cli](https://github.com/maschinenlesbar-org/jobsuche-cli) | Scan the German job market for a role/region, run a ranked job hunt with full-detail enrichment, and watch a specific employer's openings — all over the open Bundesagentur für Arbeit Jobsuche API via the jobsuche-cli. |
| `ladesaeulen` | [ladesaeulenregister-cli](https://github.com/maschinenlesbar-org/ladesaeulenregister-cli) | Find, count and map public EV charging stations in Germany — by place, operator, connector, capacity or nearby a point — from the Bundesnetzagentur's Ladesäulenregister, via the ladesaeulenregister-cli. |
| `lebensmittelwarnung` | [lebensmittelwarnung-cli](https://github.com/maschinenlesbar-org/lebensmittelwarnung-cli) | Check Germany's official product-recall portal: current warnings (Rückrufe) by product, federal state, product type and recall reason — via the lebensmittel CLI over the official RSS feeds. |
| `lobbyregister` | [lobbyregister-cli](https://github.com/maschinenlesbar-org/lobbyregister-cli) | Profile who lobbies the Bundestag on a topic, rank registered lobbyists by declared spend or by legislative-engagement volume, track new registrations and deregistrations over time, and surface the revolving door of former MdBs and government officials — all over the open, key-free Lobbyregister search API via the lobbyregister-cli. |
| `luftqualitaet` | [luftqualitaet-cli](https://github.com/maschinenlesbar-org/luftqualitaet-cli) | Find the right air-quality monitoring station for a place, brief the current air-quality index for a station, and rank stations by annual pollutant levels or limit exceedances — all over the open, key-free Umweltbundesamt Air Data API via the luftqualitaet-cli. |
| `mastr` | [marktstammdatenregister-cli](https://github.com/maschinenlesbar-org/marktstammdatenregister-cli) | Search and count German electricity & gas units — solar, wind, storage, CHP — in the Bundesnetzagentur's Marktstammdatenregister (MaStR), with the filter-syntax and record-reading help, via the marktstammdatenregister-cli. |
| `mudab` | [mudab-cli](https://github.com/maschinenlesbar-org/mudab-cli) | Explore German marine-monitoring data — stations, measured parameters, measurements and HELCOM PLC river loads for the North and Baltic Sea — over the MUDAB (Meeresumweltdatenbank) API via the mudab-cli. |
| `nina` | [nina-warnungen-cli](https://github.com/maschinenlesbar-org/nina-warnungen-cli) | Brief Germany's live civil-protection warnings across all NINA sources, watch a specific region by its ARS/AGS key, and export a warning's affected area as GeoJSON — all over the open, key-free NINA API via the nina-warnungen-cli. |
| `pegel` | [pegel-online-cli](https://github.com/maschinenlesbar-org/pegel-online-cli) | Check live water levels and flood/low-water state at any German federal-waterway gauge, get a whole-river overview, analyse level trends, and export gauges as GeoJSON — all over the open, key-free PEGELONLINE API via the pegel-online-cli. |
| `regionalatlas` | [regionalatlas-cli](https://github.com/maschinenlesbar-org/regionalatlas-cli) | Browse, map and compare regional-statistics indicators for Germany — by Bundesland, Regierungsbezirk, Kreis or Gemeinde — from the Regionalatlas Deutschland of the Statistische Ämter des Bundes und der Länder, via the regionalatlas-cli. |
| `regionalstatistik` | [regionalstatistik-cli](https://github.com/maschinenlesbar-org/regionalstatistik-cli) | Find the right regional-statistics object, fetch and decode its data by Kreis or Gemeinde, and export tables to CSV/Excel — over the Regionaldatenbank Deutschland GENESIS API via the regionalstatistik-cli. |
| `reisewarnungen` | [reisewarnungen-cli](https://github.com/maschinenlesbar-org/reisewarnungen-cli) | Brief the German Foreign Office's travel and safety advice for a trip, rank every country currently under a warning, and diff warnings over time — all over the open, key-free Auswärtiges Amt travel-warning API via the reisewarnungen-cli. |
| `smard` | [smard-cli](https://github.com/maschinenlesbar-org/smard-cli) | Build Germany's generation mix and renewable share, summarise day-ahead wholesale prices across bidding zones, and export gap-clean electricity time series — all over the open, key-free SMARD chart-data API via the smard-cli. |
| `strahlenschutz` | [strahlenschutz-cli](https://github.com/maschinenlesbar-org/strahlenschutz-cli) | Rank the live ambient gamma dose rate (ODL) across Germany's ~1700 BfS stations, read a single station's time-series trend, and export the network as GeoJSON — all over the open, key-free ODL-Info WFS via the strahlenschutz-cli. |
| `tagesschau` | [tagesschau-cli](https://github.com/maschinenlesbar-org/tagesschau-cli) | Briefings of current German headlines, regional news by Bundesland, full-text topic tracking, and live stream links — all over the open, key-free Tagesschau API via the tagesschau-cli. |

## For a team or project

Commit this to a project's `.claude/settings.json` to register the marketplace and enable
plugins for everyone working in that project:

```json
{
  "extraKnownMarketplaces": {
    "maschinenlesbar": {
      "source": { "source": "github", "repo": "maschinenlesbar-org/plugins" }
    }
  },
  "enabledPlugins": {
    "fim-portal@maschinenlesbar": true
  }
}
```

## Data

The plugins provide the tool, not the data. Each API's data comes with its own terms —
public domain, attribution licences, or custom provider terms — documented in
`DATA_LICENSE.md` in the plugin's repository.

## Issues

Report problems with a plugin's skills in that plugin's repository. Problems with the
marketplace itself (a plugin that won't install, a broken link) belong here.

## License

The marketplace and the plugins are dual-licensed **AGPL-3.0-or-later OR commercial** — see
[LICENSING.md](LICENSING.md). No external code contributions are accepted
([CONTRIBUTING.md](CONTRIBUTING.md)).
