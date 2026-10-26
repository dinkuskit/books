import { execFile as execFileCb } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);

const DECISION_STATES = new Set([
  "proposed",
  "locked",
  "implemented",
  "verified",
  "reopened",
  "superseded",
  "needs_reverification",
  "deferred",
]);
const TRACK_STATES = new Set(["active", "paused", "closed"]);
const REVIEW_RESULTS = new Set(["clean", "findings"]);
const REVIEW_CLASSIFICATIONS = new Set([
  "required_fix",
  "reject_false_positive",
  "defer",
  "human_gate",
]);
const ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const SOURCE_IDENTITY_RE = /^(?:git:[0-9a-f]{40}|sha256:[0-9a-f]{64})$/;

const SHELL_CORRUPTION_PATTERNS = [
  {
    name: "shell $0 expansion",
    regex: /\b(?:zsh|bash)(?:\.\d+|\b)/i,
  },
  {
    name: "stripped currency before unit rate",
    regex: /(?:^|[\s([]|(?<![0-9kKmM])\+)\/(?:yr|mo|person|contractor|return)\b/,
  },
  {
    name: "stripped currency before thousands group",
    regex: /(?:^|[\s([+]),\d{3}\b/,
  },
];

const FORBIDDEN_COORDINATE_SHA256 = new Set([
  "071bebbe2c48bc5a5a11dc58b90b0160c53fa3a525cb086afebd2f399094f713",
  "f551d2dfdfd8b8b887caba65cb4dcb17790698cf2e68193ced6f0ee38b6e808a",
  "6e418d47bb0df81d6a2e4d1aeac47dab7d8a509ca84ecaac61a05488b8cc4bea",
]);

function hasForbiddenCoordinateToken(text) {
  const seen = new Set();
  for (const match of text.matchAll(/[A-Za-z0-9][A-Za-z0-9_-]{4,63}/g)) {
    const raw = match[0].toLowerCase();
    for (const candidate of [raw, raw.replace(/^[_-]+|[_-]+$/g, "")]) {
      if (candidate.length < 5 || seen.has(candidate)) continue;
      seen.add(candidate);
      const digest = createHash("sha256").update(candidate).digest("hex");
      if (FORBIDDEN_COORDINATE_SHA256.has(digest)) {
        return true;
      }
    }
  }
  return false;
}

const PUBLIC_SAFETY_PATTERNS = [
  {
    name: "PEM private key header",
    regex: new RegExp("-----BEGIN [A-Z0-9 ]*" + "PRIVATE KEY-----"),
  },
  {
    name: "GitHub token",
    regex: new RegExp("\\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_" + "pat_[A-Za-z0-9_]{20,})\\b"),
  },
  {
    name: "API secret key",
    regex: new RegExp(
      "\\b(?:sk-(?:live|test|proj|ant)-[A-Za-z0-9_-]{16,}|(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{12,}|wh" +
        "sec_[A-Za-z0-9]{16,}|xox[baprs]-[A-Za-z0-9-]{16,}|AK" +
        "IA[0-9A-Z]{16})\\b",
    ),
  },
  {
    name: "local workstation user path",
    regex: new RegExp("(?:^|[^A-Za-z0-9])" + "/Users" + "/[A-Za-z0-9._-]+"),
  },
];

const UNTRACKED_IGNORED_DIRS = new Set(["node_modules", "dist", ".astro", "coverage"]);

function isForbiddenEnvFile(baseName) {
  const lower = baseName.toLowerCase();
  return (lower === ".env" || lower.startsWith(".env.")) && lower !== ".env.example";
}

function isIgnoredBuildPath(relPath) {
  if (relPath === ".grilltrack/work" || relPath.startsWith(".grilltrack/work/")) {
    return true;
  }
  return relPath.split("/").some((segment) => UNTRACKED_IGNORED_DIRS.has(segment));
}

async function hasGitCheckoutMarker(repoRealPath) {
  try {
    const gitStat = await lstat(path.join(repoRealPath, ".git"));
    if (gitStat.isSymbolicLink()) {
      throw new Error(".git must not be a symbolic link");
    }
    return gitStat.isDirectory() || gitStat.isFile();
  } catch (err) {
    if (err && err.code === "ENOENT") {
      return false;
    }
    throw err;
  }
}

async function listGitStageEntries(repoRealPath) {
  const { stdout } = await execFile("git", ["-C", repoRealPath, "ls-files", "--stage", "-z"], {
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
  });
  const records = stdout.toString("utf8").split("\0").filter(Boolean);
  const entries = [];
  for (const record of records) {
    const tabIdx = record.indexOf("\t");
    if (tabIdx <= 0) {
      throw new Error(`unexpected git ls-files --stage entry: ${record}`);
    }
    const meta = record.slice(0, tabIdx).trim().split(/\s+/);
    const relPath = record.slice(tabIdx + 1);
    entries.push({ mode: meta[0], relPath });
  }
  return entries;
}

async function readGitIndexBlob(repoRealPath, relPath) {
  const { stdout } = await execFile("git", ["-C", repoRealPath, "cat-file", "-p", `:${relPath}`], {
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout.toString("utf8");
}

function isWithinRoot(candidatePath, rootPath) {
  const rel = path.relative(rootPath, candidatePath);
  return (
    rel === "" ||
    (rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel))
  );
}

async function resolveInsideRepo(repoRealPath, baseDir, rawTarget, contextLabel) {
  const candidate = path.resolve(baseDir, rawTarget);
  if (!isWithinRoot(candidate, repoRealPath)) {
    throw new Error(`${contextLabel}: path escapes repository root: ${rawTarget}`);
  }
  let targetReal;
  try {
    targetReal = await realpath(candidate);
  } catch {
    throw new Error(`${contextLabel}: target does not exist: ${rawTarget}`);
  }
  if (!isWithinRoot(targetReal, repoRealPath)) {
    throw new Error(`${contextLabel}: symlink escapes repository root: ${rawTarget}`);
  }
  return targetReal;
}

function stripInlineCodeSpans(line) {
  let out = "";
  let i = 0;
  while (i < line.length) {
    if (line[i] !== "`") {
      out += line[i];
      i += 1;
      continue;
    }
    let tickCount = 1;
    while (i + tickCount < line.length && line[i + tickCount] === "`") {
      tickCount += 1;
    }
    let searchIdx = i + tickCount;
    let closedAt = -1;
    while (searchIdx < line.length) {
      if (line[searchIdx] !== "`") {
        searchIdx += 1;
        continue;
      }
      let closeTicks = 1;
      while (searchIdx + closeTicks < line.length && line[searchIdx + closeTicks] === "`") {
        closeTicks += 1;
      }
      if (closeTicks === tickCount) {
        closedAt = searchIdx + closeTicks;
        break;
      }
      searchIdx += closeTicks;
    }
    if (closedAt !== -1) {
      i = closedAt;
    } else {
      out += line.slice(i, i + tickCount);
      i += tickCount;
    }
  }
  return out;
}

function stripFencesAndInlineCode(markdown) {
  const lines = markdown.split(/\r?\n/);
  const kept = [];
  let fenceMarker = null;

  for (const line of lines) {
    const trimmed = line.trimStart();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fenceMarker) {
        fenceMarker = marker;
        kept.push("");
        continue;
      }
      if (marker[0] === fenceMarker[0] && marker.length >= fenceMarker.length) {
        fenceMarker = null;
        kept.push("");
        continue;
      }
    }
    if (fenceMarker) {
      kept.push("");
      continue;
    }
    kept.push(stripInlineCodeSpans(line));
  }
  return kept.join("\n");
}

function normalizeLinkDestination(rawSpec) {
  let raw = rawSpec.trim();
  if (!raw) return null;
  if (raw.startsWith("<")) {
    const closeIdx = raw.indexOf(">");
    if (closeIdx < 0) {
      throw new Error(`unclosed angle-bracket link destination: ${rawSpec}`);
    }
    raw = raw.slice(1, closeIdx).trim();
  } else {
    const spaceIdx = raw.search(/\s/);
    if (spaceIdx > 0) {
      raw = raw.slice(0, spaceIdx);
    }
  }
  if (
    !raw ||
    raw.startsWith("#") ||
    /^(?:https?:|mailto:|tel:|data:)/i.test(raw)
  ) {
    return null;
  }
  return raw;
}

function extractMarkdownLinks(markdown) {
  const scrubbed = stripFencesAndInlineCode(markdown);
  const results = [];
  const inlineLinkRe = /!?\[[^\]]*\]\((<[^>\r\n]*>|(?:\([^()]*\)|[^()])+)\)/g;
  for (const match of scrubbed.matchAll(inlineLinkRe)) {
    const normalized = normalizeLinkDestination(match[1]);
    if (normalized) results.push(normalized);
  }
  const refDefRe = /^\s{0,3}\[[^\]]+\]:\s*(.+)$/gm;
  for (const match of scrubbed.matchAll(refDefRe)) {
    const normalized = normalizeLinkDestination(match[1]);
    if (normalized) results.push(normalized);
  }
  return results;
}

async function walkRepoFiles(
  dirPath,
  repoRealPath,
  { skipUntrackedBuildDirs = false, relPrefix = "", visitedDirs = new Set([repoRealPath]) } = {},
) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  const files = [];

  for (const entry of entries) {
    const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    if (entry.name === ".git") continue;
    if (skipUntrackedBuildDirs && UNTRACKED_IGNORED_DIRS.has(entry.name)) continue;
    if (skipUntrackedBuildDirs && relPath === ".grilltrack/work") continue;

    const fullPath = path.join(dirPath, entry.name);
    const lst = await lstat(fullPath);
    let effectiveStat = lst;
    let effectiveRealDir = null;
    let resolvedPath = fullPath;

    if (lst.isSymbolicLink()) {
      const targetReal = await resolveInsideRepo(repoRealPath, dirPath, entry.name, relPath);
      resolvedPath = targetReal;
      effectiveStat = await stat(targetReal);
      if (effectiveStat.isDirectory()) {
        effectiveRealDir = targetReal;
      }
    } else if (lst.isDirectory()) {
      effectiveRealDir = await realpath(fullPath);
    } else if (lst.isFile()) {
      resolvedPath = await realpath(fullPath);
    }

    if (effectiveStat.isDirectory()) {
      if (effectiveRealDir && visitedDirs.has(effectiveRealDir)) {
        continue;
      }
      const nextVisited = new Set(visitedDirs);
      if (effectiveRealDir) nextVisited.add(effectiveRealDir);
      files.push(
        ...(await walkRepoFiles(fullPath, repoRealPath, {
          skipUntrackedBuildDirs,
          relPrefix: relPath,
          visitedDirs: nextVisited,
        })),
      );
    } else if (effectiveStat.isFile()) {
      files.push({
        fullPath,
        resolvedPath,
        relPath,
        skipMarkdownLinks: isIgnoredBuildPath(relPath),
      });
    }
  }
  return files;
}

function assertCleanProjectionText(value, fieldLabel) {
  if (typeof value !== "string") return;
  for (const pattern of SHELL_CORRUPTION_PATTERNS) {
    if (pattern.regex.test(value)) {
      throw new Error(
        `GrillTrack ${fieldLabel} contains suspected shell-expansion corruption (${pattern.name}): ${JSON.stringify(value)}`,
      );
    }
  }
}

async function verifyPackageManifest(repoRealPath) {
  const pkgPath = await resolveInsideRepo(repoRealPath, repoRealPath, "package.json", "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
  if (pkg.name !== "@dinkuskit/books") {
    throw new Error(`package.json name must be "@dinkuskit/books", got ${JSON.stringify(pkg.name)}`);
  }
  if (pkg.type !== "module") {
    throw new Error('package.json type must be "module"');
  }
  if (pkg.license !== "MIT") {
    throw new Error('package.json license must be "MIT"');
  }
  if (pkg.version === "0.0.0" && pkg.private !== true) {
    throw new Error('package.json must stay "private": true while at charter version 0.0.0');
  }
}

async function verifyGrillTrack(repoRealPath) {
  const ledgerPath = await resolveInsideRepo(
    repoRealPath,
    repoRealPath,
    ".grilltrack/ledger.json",
    ".grilltrack/ledger.json",
  );
  const eventsPath = await resolveInsideRepo(
    repoRealPath,
    repoRealPath,
    ".grilltrack/events.jsonl",
    ".grilltrack/events.jsonl",
  );

  const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
  if (ledger.schema_version !== "grilltrack/v0.1") {
    throw new Error(`unexpected GrillTrack schema_version: ${ledger.schema_version}`);
  }
  if (typeof ledger.track_id !== "string" || !ID_RE.test(ledger.track_id)) {
    throw new Error(`invalid GrillTrack track_id: ${ledger.track_id}`);
  }
  if (!TRACK_STATES.has(ledger.status)) {
    throw new Error(`invalid GrillTrack status: ${ledger.status}`);
  }

  assertCleanProjectionText(ledger.title, "title");
  if (ledger.current_focus && typeof ledger.current_focus === "object") {
    assertCleanProjectionText(ledger.current_focus.summary, "current_focus.summary");
  }
  if (ledger.recommendation && typeof ledger.recommendation === "object") {
    assertCleanProjectionText(ledger.recommendation.recommended, "recommendation.recommended");
    assertCleanProjectionText(ledger.recommendation.reason, "recommendation.reason");
    for (const [idx, alt] of (ledger.recommendation.alternatives ?? []).entries()) {
      assertCleanProjectionText(alt, `recommendation.alternatives[${idx}]`);
    }
  }

  if (!Array.isArray(ledger.decisions) || ledger.decisions.length === 0) {
    throw new Error("GrillTrack ledger must contain at least one decision");
  }

  const seenIds = new Set();
  for (const decision of ledger.decisions) {
    if (!decision || typeof decision !== "object" || !ID_RE.test(decision.id ?? "")) {
      throw new Error(`invalid GrillTrack decision id: ${JSON.stringify(decision?.id)}`);
    }
    if (seenIds.has(decision.id)) {
      throw new Error(`duplicate GrillTrack decision id: ${decision.id}`);
    }
    seenIds.add(decision.id);

    if (!DECISION_STATES.has(decision.status)) {
      throw new Error(`invalid status on ${decision.id}: ${decision.status}`);
    }
    if (decision.status === "verified" && decision.repair_required === true) {
      throw new Error(`${decision.id} cannot be verified while repair_required is true`);
    }

    if (decision.status !== "superseded") {
      assertCleanProjectionText(decision.question, `${decision.id}.question`);
      assertCleanProjectionText(decision.choice, `${decision.id}.choice`);
      assertCleanProjectionText(decision.rationale, `${decision.id}.rationale`);
    }

    for (const refField of [
      "context_ref",
      "baseline_ref",
      "implementation_ref",
      "verification_ref",
      "review_ref",
    ]) {
      const refValue = decision[refField];
      if (refValue === null || refValue === undefined) {
        if (
          (refField === "implementation_ref" &&
            (decision.status === "implemented" || decision.status === "verified")) ||
          (refField === "verification_ref" && decision.status === "verified")
        ) {
          throw new Error(`${decision.id}.${refField} is required when status is ${decision.status}`);
        }
        continue;
      }
      if (typeof refValue !== "string" || !refValue.trim()) {
        throw new Error(`${decision.id}.${refField} must be a non-empty string`);
      }
      const normalizedRef = refValue.startsWith("file:")
        ? refValue.slice("file:".length)
        : refValue;
      await resolveInsideRepo(repoRealPath, repoRealPath, normalizedRef, `${decision.id}.${refField}`);
    }

    if (!Array.isArray(decision.candidate_refs)) {
      throw new Error(`${decision.id}.candidate_refs must be an array`);
    }
    for (const [idx, candRef] of decision.candidate_refs.entries()) {
      if (typeof candRef !== "string" || !candRef.trim()) {
        throw new Error(`${decision.id}.candidate_refs[${idx}] must be a non-empty string`);
      }
      const normalizedCand = candRef.startsWith("file:")
        ? candRef.slice("file:".length)
        : candRef;
      await resolveInsideRepo(
        repoRealPath,
        repoRealPath,
        normalizedCand,
        `${decision.id}.candidate_refs[${idx}]`,
      );
    }

    const hasAnyReviewField =
      decision.review_ref !== null ||
      decision.review_source_identity !== null ||
      decision.review_result !== null;
    if (hasAnyReviewField) {
      if (
        typeof decision.review_ref !== "string" ||
        !decision.review_ref.trim() ||
        typeof decision.review_source_identity !== "string" ||
        !SOURCE_IDENTITY_RE.test(decision.review_source_identity) ||
        !REVIEW_RESULTS.has(decision.review_result)
      ) {
        throw new Error(`${decision.id} has incomplete or invalid review metadata`);
      }
      const classifications = decision.review_classifications ?? [];
      if (
        !Array.isArray(classifications) ||
        classifications.some((item) => !REVIEW_CLASSIFICATIONS.has(item))
      ) {
        throw new Error(`${decision.id}.review_classifications contains invalid values`);
      }
      if (decision.review_result === "clean" && classifications.length > 0) {
        throw new Error(`${decision.id} clean review cannot carry classifications`);
      }
      if (decision.review_result === "findings" && classifications.length === 0) {
        throw new Error(`${decision.id} findings review requires classifications`);
      }
    }
  }

  for (const decision of ledger.decisions) {
    if (!Array.isArray(decision.dependencies)) {
      throw new Error(`${decision.id}.dependencies must be an array`);
    }
    for (const depId of decision.dependencies) {
      if (!seenIds.has(depId) || depId === decision.id) {
        throw new Error(`${decision.id} has invalid dependency: ${depId}`);
      }
    }
  }

  const eventsRaw = await readFile(eventsPath, "utf8");
  const eventLines = eventsRaw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (eventLines.length === 0) {
    throw new Error(".grilltrack/events.jsonl must not be empty");
  }
  for (const [index, line] of eventLines.entries()) {
    const parsed = JSON.parse(line);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.event_id !== "string" ||
      typeof parsed.at !== "string" ||
      typeof parsed.action !== "string" ||
      !parsed.data ||
      typeof parsed.data !== "object"
    ) {
      throw new Error(`.grilltrack/events.jsonl line ${index + 1} is malformed`);
    }
  }

  return { decisions: ledger.decisions.length, events: eventLines.length };
}

async function collectFilesForVerification(repoRealPath) {
  const isGitCheckout = await hasGitCheckoutMarker(repoRealPath);
  const walkedFiles = await walkRepoFiles(repoRealPath, repoRealPath, {
    skipUntrackedBuildDirs: isGitCheckout,
  });

  if (!isGitCheckout) {
    return walkedFiles;
  }

  const byRelPath = new Map(walkedFiles.map((entry) => [entry.relPath, entry]));
  const stageEntries = await listGitStageEntries(repoRealPath);
  const { stdout: unstagedDiffOut } = await execFile(
    "git",
    ["-C", repoRealPath, "diff", "--name-only", "-z"],
    { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
  );
  const unstagedModified = new Set(unstagedDiffOut.toString("utf8").split("\0").filter(Boolean));

  for (const { mode, relPath } of stageEntries) {
    if (mode === "160000") {
      throw new Error(`submodules/gitlinks are not allowed: ${relPath}`);
    }
    if (isForbiddenEnvFile(path.basename(relPath))) {
      throw new Error(`forbidden environment file present: ${relPath}`);
    }

    const fullPath = path.resolve(repoRealPath, relPath);
    if (!isWithinRoot(fullPath, repoRealPath)) {
      throw new Error(`${relPath}: path escapes repository root`);
    }

    let diskLstat = null;
    try {
      diskLstat = await lstat(fullPath);
    } catch (err) {
      if (!err || err.code !== "ENOENT") {
        throw err;
      }
    }

    if (mode === "120000") {
      const indexTargetRaw = (await readGitIndexBlob(repoRealPath, relPath)).replace(/\r?\n$/, "");
      const stagedTargetReal = await resolveInsideRepo(
        repoRealPath,
        path.dirname(fullPath),
        indexTargetRaw,
        `${relPath} (staged symlink)`,
      );
      if (isForbiddenEnvFile(path.basename(stagedTargetReal))) {
        throw new Error(`forbidden environment file target: ${relPath}`);
      }
      const stagedTargetStat = await stat(stagedTargetReal);
      if (stagedTargetStat.isDirectory()) {
        const symlinkedFiles = await walkRepoFiles(stagedTargetReal, repoRealPath, {
          skipUntrackedBuildDirs: false,
          relPrefix: relPath,
          visitedDirs: new Set([repoRealPath, stagedTargetReal]),
        });
        for (const entry of symlinkedFiles) {
          byRelPath.set(entry.relPath, entry);
        }
      } else if (stagedTargetStat.isFile() && (!diskLstat || !diskLstat.isSymbolicLink())) {
        byRelPath.set(`${relPath}#staged-symlink-target`, {
          fullPath: stagedTargetReal,
          resolvedPath: stagedTargetReal,
          relPath,
          skipMarkdownLinks: true,
        });
      }
    }

    if (diskLstat) {
      const resolvedPath = await resolveInsideRepo(repoRealPath, repoRealPath, relPath, relPath);
      if (isForbiddenEnvFile(path.basename(resolvedPath))) {
        throw new Error(`forbidden environment file target: ${relPath}`);
      }
      const targetStat = await stat(resolvedPath);
      if (targetStat.isFile()) {
        const extraIndexContent =
          mode !== "120000" && unstagedModified.has(relPath)
            ? await readGitIndexBlob(repoRealPath, relPath)
            : undefined;
        byRelPath.set(relPath, {
          fullPath,
          resolvedPath,
          relPath,
          extraIndexContent,
          skipMarkdownLinks: isIgnoredBuildPath(relPath),
        });
      } else {
        if (targetStat.isDirectory() && diskLstat.isSymbolicLink()) {
          const symlinkedFiles = await walkRepoFiles(resolvedPath, repoRealPath, {
            skipUntrackedBuildDirs: false,
            relPrefix: relPath,
            visitedDirs: new Set([repoRealPath, resolvedPath]),
          });
          for (const entry of symlinkedFiles) {
            byRelPath.set(entry.relPath, entry);
          }
        }
        if (mode !== "120000") {
          const indexContent = await readGitIndexBlob(repoRealPath, relPath);
          byRelPath.set(`${relPath}#git-index`, {
            fullPath,
            resolvedPath: null,
            relPath,
            preloadedContent: indexContent,
            skipMarkdownLinks: true,
          });
        }
      }
    } else if (mode !== "120000") {
      const indexContent = await readGitIndexBlob(repoRealPath, relPath);
      byRelPath.set(relPath, {
        fullPath,
        resolvedPath: null,
        relPath,
        preloadedContent: indexContent,
        skipMarkdownLinks: true,
      });
    }
  }

  return [...byRelPath.values()].sort((a, b) => a.relPath.localeCompare(b.relPath));
}

export async function verifyRepository(
  repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
) {
  const repoRealPath = await realpath(repoDir);
  await verifyPackageManifest(repoRealPath);
  const grilltrackStats = await verifyGrillTrack(repoRealPath);

  const files = await collectFilesForVerification(repoRealPath);
  let checkedLinks = 0;

  for (const {
    fullPath,
    resolvedPath,
    relPath,
    preloadedContent,
    extraIndexContent,
    skipMarkdownLinks,
  } of files) {
    if (
      isForbiddenEnvFile(path.basename(relPath)) ||
      (resolvedPath && isForbiddenEnvFile(path.basename(resolvedPath)))
    ) {
      throw new Error(`forbidden environment file present: ${relPath}`);
    }

    const content =
      preloadedContent !== undefined ? preloadedContent : await readFile(fullPath, "utf8");
    for (const candidateContent of extraIndexContent !== undefined
      ? [content, extraIndexContent]
      : [content]) {
      for (const rule of PUBLIC_SAFETY_PATTERNS) {
        if (rule.regex.test(candidateContent)) {
          throw new Error(`public-safety violation (${rule.name}) in ${relPath}`);
        }
      }
      if (hasForbiddenCoordinateToken(candidateContent)) {
        throw new Error(`public-safety violation (private organization coordinate) in ${relPath}`);
      }
    }

    if (relPath.endsWith(".md") && !skipMarkdownLinks) {
      const links = extractMarkdownLinks(content);
      const mdDir = path.dirname(fullPath);
      for (const rawLink of links) {
        const withoutFragment = rawLink.split("#")[0].split("?")[0];
        if (!withoutFragment) continue;
        let decodedPath;
        try {
          decodedPath = decodeURIComponent(withoutFragment);
        } catch {
          throw new Error(`malformed URI in ${relPath}: ${rawLink}`);
        }
        await resolveInsideRepo(repoRealPath, mdDir, decodedPath, `${relPath} -> ${rawLink}`);
        checkedLinks += 1;
      }
    }
  }

  return {
    filesChecked: files.length,
    markdownLinksChecked: checkedLinks,
    decisionsChecked: grilltrackStats.decisions,
    eventsChecked: grilltrackStats.events,
  };
}

async function safeRealpath(target) {
  if (!target) return null;
  try {
    return await realpath(target);
  } catch {
    return null;
  }
}

const entryReal = await safeRealpath(process.argv[1]);
const moduleReal = await safeRealpath(fileURLToPath(import.meta.url));
if (entryReal && moduleReal && entryReal === moduleReal) {
  const summary = await verifyRepository();
  console.log(
    `verified @dinkuskit/books (${summary.filesChecked} files, ${summary.markdownLinksChecked} links, ${summary.decisionsChecked} GrillTrack decisions)`,
  );
}
