# Builds the plugin catalogue from ../.claude-plugin/marketplace.json.
#
# For every entry it shallow-clones the plugin's repository at its pinned tag
# (cached under .cache/repos/<name>@<ref>, so a ref bump re-clones), reads
# .claude-plugin/plugin.json, package.json and the front matter of every
# skills/*/SKILL.md, and exposes the result as site.data["marketplace"].
#
# The site is built in every language listed under `languages` in _config.yml,
# with strings from _data/i18n/<lang>.yml. It renders one page per plugin per
# language: /<plugin>/ for the default language, /<lang>/<plugin>/ for the others.
# Pages that are translations of each other share a `ref`, which the layout uses
# for the language switch and hreflang links.

require "fileutils"
require "json"
require "open3"
require "yaml"

module Marketplace
  # Keys that may be partial in a translation (English text is the fallback).
  PARTIAL_KEYS = %w[categories plugins].freeze

  class Generator < Jekyll::Generator
    safe true
    priority :highest

    def generate(site)
      config = site.config.fetch("marketplace", {})
      manifest = JSON.parse(File.read(File.expand_path(config.fetch("manifest"), site.source)))
      cache = File.expand_path(config.fetch("cache", ".cache/repos"), site.source)
      git_base = ENV.fetch("GIT_URL_BASE", "https://github.com")
      languages = site.config.fetch("languages")
      default_lang = site.config.fetch("default_lang")
      i18n = site.data.fetch("i18n")
      check_translations(i18n, languages, default_lang)

      plugins = manifest.fetch("plugins").map do |entry|
        plugin = load_plugin(entry, File.join(cache, "#{entry["name"]}@#{entry.dig("source", "ref")}"), git_base)
        plugin.merge("i18n" => languages.to_h { |lang| [lang, localize(plugin, i18n.fetch(lang), lang, default_lang)] })
      end

      site.data["marketplace"] = {
        "name" => manifest.fetch("name"),
        "description" => manifest.dig("metadata", "description"),
        "owner" => manifest.fetch("owner"),
        "plugins" => plugins,
        "categories" => plugins.map { |p| p["category"] }.compact.uniq.sort,
        "skill_count" => plugins.sum { |p| p["skills"].size },
      }

      languages.each do |lang|
        plugins.each do |plugin|
          dir = lang == default_lang ? plugin["name"] : File.join(lang, plugin["name"])
          page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "index.html")
          page.content = ""
          page.data.merge!(
            "layout" => "plugin",
            "lang" => lang,
            "ref" => "plugin/#{plugin["name"]}",
            "title" => plugin["name"],
            "description" => plugin.dig("i18n", lang, "description"),
            "plugin" => plugin,
          )
          site.pages << page
        end
      end
    end

    private

    # Interface strings must be complete in every language; plugin descriptions and
    # category names may be missing (they fall back to English, with a warning).
    def check_translations(i18n, languages, default_lang)
      reference = flat_keys(i18n.fetch(default_lang).reject { |k, _| PARTIAL_KEYS.include?(k) })
      languages.each do |lang|
        strings = i18n[lang] or raise Jekyll::Errors::FatalException, "_data/i18n/#{lang}.yml is missing"
        keys = flat_keys(strings.reject { |k, _| PARTIAL_KEYS.include?(k) })
        missing = reference - keys
        extra = keys - reference
        next if missing.empty? && extra.empty?

        raise Jekyll::Errors::FatalException,
              "_data/i18n/#{lang}.yml differs from #{default_lang}.yml: missing #{missing.inspect}, extra #{extra.inspect}"
      end
    end

    def flat_keys(hash, prefix = nil)
      hash.flat_map do |key, value|
        path = [prefix, key].compact.join(".")
        value.is_a?(Hash) && !value.empty? ? flat_keys(value, path) : [path]
      end
    end

    def localize(plugin, strings, lang, default_lang)
      name = plugin["name"]
      description = strings.dig("plugins", name)
      category = strings.dig("categories", plugin["category"])
      if lang != default_lang
        Jekyll.logger.warn "Marketplace:", "no #{lang} description for #{name}, using English" unless description
        Jekyll.logger.warn "Marketplace:", "no #{lang} name for category #{plugin["category"]}" unless category
      end
      localized = description.to_s.strip.empty? ? nil : description.strip
      {
        "description" => localized || plugin["description"],
        # Set when the text shown is the English fallback, so it can be marked lang="en".
        "description_lang" => (localized || lang == default_lang) ? nil : default_lang,
        "category" => category || plugin["category"],
        "search" => [plugin["search"], localized, category].compact.join(" ").downcase,
      }
    end

    def load_plugin(entry, dir, git_base)
      source = entry.fetch("source")
      unless source["source"] == "github" && source["repo"] && source["ref"]
        raise Jekyll::Errors::FatalException, "#{entry["name"]}: expected a github source with repo and ref"
      end
      clone("#{git_base}/#{source["repo"]}.git", source["ref"], dir) unless File.directory?(dir)

      plugin_json = JSON.parse(File.read(File.join(dir, ".claude-plugin/plugin.json")))
      package_json = JSON.parse(File.read(File.join(dir, "package.json")))
      bin = package_json["bin"].is_a?(Hash) ? package_json["bin"].keys.first : package_json["name"]
      blob = "https://github.com/#{source["repo"]}/blob/#{source["ref"]}"

      entry.merge(
        "repo" => source["repo"],
        "ref" => source["ref"],
        "version" => plugin_json["version"],
        "package" => package_json["name"],
        "bin" => bin,
        "skills_url" => "#{blob}/SKILLS.md",
        "data_license_url" => (File.exist?(File.join(dir, "DATA_LICENSE.md")) ? "#{blob}/DATA_LICENSE.md" : nil),
        "skills" => skills(dir),
        "search" => [entry["name"], entry["description"], entry["category"], *entry["keywords"], source["repo"]]
          .compact.join(" ").downcase,
      )
    end

    def clone(url, ref, dir)
      FileUtils.mkdir_p(File.dirname(dir))
      Jekyll.logger.info "Marketplace:", "cloning #{url} at #{ref}"
      _, err, status = Open3.capture3("git", "clone", "--quiet", "--depth", "1", "--branch", ref, url, dir)
      raise Jekyll::Errors::FatalException, "git clone #{url} #{ref} failed: #{err}" unless status.success?
    end

    def skills(dir)
      Dir.glob(File.join(dir, "skills", "*", "SKILL.md")).sort.map do |file|
        front = File.read(file)[/\A---\s*\n(.*?)\n---\s*$/m, 1]
        raise Jekyll::Errors::FatalException, "#{file}: no front matter" unless front
        meta = YAML.safe_load(front)
        { "name" => meta["name"] || File.basename(File.dirname(file)), "description" => meta["description"].to_s.strip }
      end
    end
  end
end
