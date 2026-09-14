# Builds the plugin catalogue from ../.claude-plugin/marketplace.json.
#
# For every entry it shallow-clones the plugin's repository at its pinned tag
# (cached under .cache/repos/<name>@<ref>, so a ref bump re-clones), reads
# .claude-plugin/plugin.json, package.json and the front matter of every
# skills/*/SKILL.md, exposes the result as site.data["marketplace"], and renders
# one page per plugin at /<plugin-name>/.

require "fileutils"
require "json"
require "open3"
require "yaml"

module Marketplace
  class Generator < Jekyll::Generator
    safe true
    priority :highest

    def generate(site)
      config = site.config.fetch("marketplace", {})
      manifest = JSON.parse(File.read(File.expand_path(config.fetch("manifest"), site.source)))
      cache = File.expand_path(config.fetch("cache", ".cache/repos"), site.source)
      git_base = ENV.fetch("GIT_URL_BASE", "https://github.com")

      plugins = manifest.fetch("plugins").map do |entry|
        load_plugin(entry, File.join(cache, "#{entry["name"]}@#{entry.dig("source", "ref")}"), git_base)
      end

      site.data["marketplace"] = {
        "name" => manifest.fetch("name"),
        "description" => manifest.dig("metadata", "description"),
        "owner" => manifest.fetch("owner"),
        "plugins" => plugins,
        "categories" => plugins.map { |p| p["category"] }.compact.uniq.sort,
        "skill_count" => plugins.sum { |p| p["skills"].size },
      }

      plugins.each do |plugin|
        page = Jekyll::PageWithoutAFile.new(site, site.source, plugin["name"], "index.html")
        page.content = ""
        page.data.merge!(
          "layout" => "plugin",
          "title" => plugin["name"],
          "description" => plugin["description"],
          "plugin" => plugin,
        )
        site.pages << page
      end
    end

    private

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
