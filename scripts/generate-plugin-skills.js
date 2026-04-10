#!/usr/bin/env node
/**
 * generate-plugin-skills.js
 *
 * Syncs skills from .agents/skills/ into plugins/kf/skills/ using
 * skills-lock.json as the manifest.
 *
 * What it does:
 *   - Reads skills-lock.json to determine which skills to include
 *   - For each skill, copies .agents/skills/<name>/SKILL.md → plugins/kf/skills/<name>/SKILL.md
 *   - Copies any references/ subdirectory alongside
 *   - Skips skills from the official Anthropic marketplace (source: anthropics/skills)
 *   - Idempotent: only overwrites files whose content has changed
 *
 * Usage:
 *   node scripts/generate-plugin-skills.js [--bump] [--dry-run]
 *
 *   --bump      Auto-increment the patch version in plugins/kf/.claude-plugin/plugin.json
 *   --dry-run   Print what would change without writing anything
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// --- Config -----------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, "..");
const LOCK_FILE = path.join(REPO_ROOT, "skills-lock.json");
const AGENTS_SKILLS_DIR = path.join(REPO_ROOT, ".agents", "skills");
const PLUGIN_SKILLS_DIR = path.join(REPO_ROOT, "plugins", "kf", "skills");
const PLUGIN_JSON = path.join(
  REPO_ROOT,
  "plugins",
  "kf",
  ".claude-plugin",
  "plugin.json"
);

// Skills from these sources are available via the official marketplace
// and should not be inlined into the plugin.
const SKIP_SOURCES = new Set(["anthropics/skills"]);

// --- Helpers ----------------------------------------------------------

function hash(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeFile(filePath, content, dryRun) {
  if (dryRun) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function copyFile(src, dest, dryRun) {
  const content = readFile(src);
  const destExists = fs.existsSync(dest);
  const destContent = destExists ? readFile(dest) : null;

  if (destContent !== null && hash(content) === hash(destContent)) {
    return "unchanged";
  }

  if (!dryRun) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
  return destExists ? "updated" : "added";
}

function copyDir(srcDir, destDir, dryRun) {
  const results = [];
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      results.push(...copyDir(srcPath, destPath, dryRun));
    } else if (entry.isFile()) {
      const status = copyFile(srcPath, destPath, dryRun);
      if (status !== "unchanged") {
        results.push({ file: destPath, status });
      }
    }
  }
  return results;
}

function bumpPatch(version) {
  const parts = version.split(".");
  if (parts.length !== 3) throw new Error(`Unexpected version format: ${version}`);
  parts[2] = String(parseInt(parts[2], 10) + 1);
  return parts.join(".");
}

// --- Main -------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const bump = args.includes("--bump");

  if (dryRun) {
    console.log("DRY RUN — no files will be written\n");
  }

  // Load lock file
  if (!fs.existsSync(LOCK_FILE)) {
    console.error(`skills-lock.json not found at ${LOCK_FILE}`);
    process.exit(1);
  }
  const lock = JSON.parse(readFile(LOCK_FILE));
  const skills = lock.skills || {};

  const stats = { added: 0, updated: 0, skipped: 0, missing: 0 };
  const changes = [];

  for (const [name, meta] of Object.entries(skills)) {
    const source = meta.source || "";

    // Skip official marketplace skills
    if (SKIP_SOURCES.has(source)) {
      console.log(`  SKIP  ${name}  (official marketplace: ${source})`);
      stats.skipped++;
      continue;
    }

    const agentSkillDir = path.join(AGENTS_SKILLS_DIR, name);
    const skillMdSrc = path.join(agentSkillDir, "SKILL.md");
    const skillMdDest = path.join(PLUGIN_SKILLS_DIR, name, "SKILL.md");

    if (!fs.existsSync(skillMdSrc)) {
      console.log(`  MISS  ${name}  (no SKILL.md in .agents/skills/${name})`);
      stats.missing++;
      continue;
    }

    // Copy SKILL.md
    const skillStatus = copyFile(skillMdSrc, skillMdDest, dryRun);
    if (skillStatus !== "unchanged") {
      console.log(`  ${skillStatus.toUpperCase().padEnd(7)} ${name}/SKILL.md`);
      changes.push({ file: `${name}/SKILL.md`, status: skillStatus });
      stats[skillStatus]++;
    } else {
      console.log(`  OK     ${name}/SKILL.md`);
    }

    // Copy references/ if present
    const refsDir = path.join(agentSkillDir, "references");
    if (fs.existsSync(refsDir)) {
      const destRefsDir = path.join(PLUGIN_SKILLS_DIR, name, "references");
      const refChanges = copyDir(refsDir, destRefsDir, dryRun);
      for (const change of refChanges) {
        const rel = path.relative(PLUGIN_SKILLS_DIR, change.file);
        console.log(`  ${change.status.toUpperCase().padEnd(7)} ${rel}`);
        stats[change.status]++;
        changes.push(change);
      }
      // Report unchanged refs quietly only if there were no changes
      if (refChanges.length === 0) {
        const count = fs.readdirSync(refsDir).length;
        console.log(`  OK     ${name}/references/  (${count} files)`);
      }
    }
  }

  // Summary
  console.log(
    `\nDone. added=${stats.added} updated=${stats.updated} skipped=${stats.skipped} missing=${stats.missing}`
  );

  // Version bump
  if (bump) {
    if (!fs.existsSync(PLUGIN_JSON)) {
      console.error(`plugin.json not found at ${PLUGIN_JSON}`);
      process.exit(1);
    }
    const pluginJson = JSON.parse(readFile(PLUGIN_JSON));
    const oldVersion = pluginJson.version;
    const newVersion = bumpPatch(oldVersion);
    pluginJson.version = newVersion;

    if (!dryRun) {
      writeFile(PLUGIN_JSON, JSON.stringify(pluginJson, null, 2) + "\n", false);
    }
    console.log(`\nVersion bumped: ${oldVersion} → ${newVersion}`);
  }

  if (dryRun && changes.length > 0) {
    console.log(
      `\n${changes.length} file(s) would be written. Re-run without --dry-run to apply.`
    );
  }
}

main();
