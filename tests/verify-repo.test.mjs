import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { verifyRepository } from "../scripts/verify-repo.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function createMinimalValidFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "dinkuskit-books-verify-"));
  await mkdir(path.join(root, ".grilltrack"), { recursive: true });
  await mkdir(path.join(root, "docs"), { recursive: true });
  await mkdir(path.join(root, "proof"), { recursive: true });

  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify(
      {
        name: "@dinkuskit/books",
        version: "0.0.0",
        type: "module",
        private: true,
        license: "MIT",
      },
      null,
      2,
    ),
    "utf8",
  );
  await writeFile(
    path.join(root, "docs/CHARTER.md"),
    "# Charter\n\nSee [Proof](../proof/PROOF.md) and [Ref][proof-ref].\n\n[proof-ref]: ../proof/PROOF.md\n",
    "utf8",
  );
  await writeFile(
    path.join(root, "proof/PROOF.md"),
    "# Proof\n\nCharter: [CHARTER](../docs/CHARTER.md).\n",
    "utf8",
  );

  const ledger = {
    schema_version: "grilltrack/v0.1",
    track_id: "gt-20261026000000-abcdef",
    title: "DinkusKit Books — Charter",
    status: "active",
    created_at: "2026-10-26T00:00:00+00:00",
    updated_at: "2026-10-26T00:00:00+00:00",
    current_focus: {
      domain: "charter-and-scope",
      cadence: "frontier-batch",
      confirmed: true,
      status: "inspected",
      summary: "Confirmed $15/yr SimpleFIN and $0.00 clearing tie-outs.",
    },
    decisions: [
      {
        id: "d1-sample",
        domain: "charter-and-scope",
        question: "How do statements reconcile?",
        choice: "Strict $0.00 difference lock with optional $15/yr SimpleFIN feed.",
        rationale: "Saves $35/mo + $6/contractor.",
        dependencies: [],
        context_ref: null,
        baseline_ref: null,
        candidate_refs: [],
        implementation_ref: "docs/CHARTER.md",
        verification_ref: "proof/PROOF.md",
        review_ref: "proof/PROOF.md",
        review_source_identity: "git:0123456789abcdef0123456789abcdef01234567",
        review_result: "clean",
        review_classifications: [],
        review_history: [],
        repair_required: false,
        status: "verified",
        history: [],
      },
    ],
    recommendation: {
      recommended: "Cycle 2A: src/ledger/",
      alternatives: ["Cycle 2B: County Sales-Tax Schedules"],
      reason: "Core double-entry engine comes first.",
    },
    closeout: null,
    pause: null,
    last_pause: null,
  };

  await writeFile(path.join(root, ".grilltrack/ledger.json"), JSON.stringify(ledger, null, 2), "utf8");
  await writeFile(
    path.join(root, ".grilltrack/events.jsonl"),
    `${JSON.stringify({
      event_id: "11111111-1111-1111-1111-111111111111",
      at: "2026-10-26T00:00:00+00:00",
      action: "track_initialized",
      data: { track_id: "gt-20261026000000-abcdef" },
    })}\n`,
    "utf8",
  );
  return { root, ledger };
}

test("real repository passes all contract checks", async () => {
  const result = await verifyRepository(REPO_ROOT);
  assert.ok(result.filesChecked >= 20);
  assert.ok(result.markdownLinksChecked >= 30);
  assert.equal(result.decisionsChecked, 6);
});

test("minimal valid fixture passes including dot-prefixed in-repo files", async () => {
  const { root } = await createMinimalValidFixture();
  try {
    await writeFile(path.join(root, "docs/..note.md"), "# Dot-prefixed\n", "utf8");
    await writeFile(
      path.join(root, "docs/CHARTER.md"),
      "# Charter\n\nSee [Dot](./..note.md) and [Proof](../proof/PROOF.md).\n",
      "utf8",
    );
    const result = await verifyRepository(root);
    assert.equal(result.decisionsChecked, 1);
    assert.equal(result.markdownLinksChecked, 3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects unquoted shell-expansion corruption in active GrillTrack fields while allowing $+/mo rates", async () => {
  for (const corruptedText of [
    "Reconcile with zsh.00 difference lock",
    "Optional /yr user-owned SimpleFIN feed",
    "Saves 1099-only businesses /mo + /contractor",
    "Applies ,000 federal threshold",
  ]) {
    const { root, ledger } = await createMinimalValidFixture();
    try {
      ledger.decisions[0].choice = corruptedText;
      await writeFile(path.join(root, ".grilltrack/ledger.json"), JSON.stringify(ledger, null, 2), "utf8");
      await assert.rejects(() => verifyRepository(root), /shell-expansion corruption/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  const { root, ledger } = await createMinimalValidFixture();
  try {
    ledger.decisions[0].choice = "Replaces $245+/mo closed SaaS and $15k–$50k+/yr enterprise contracts.";
    await writeFile(path.join(root, ".grilltrack/ledger.json"), JSON.stringify(ledger, null, 2), "utf8");
    await verifyRepository(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects broken or escaping Markdown relative links while ignoring fenced and multi-backtick code spans", async () => {
  const { root } = await createMinimalValidFixture();
  try {
    await writeFile(
      path.join(root, "docs/CHARTER.md"),
      "# Charter\n\n```md\n[ignored](missing-in-fence.md)\n```\n\n`[ignored](missing-inline.md)`\n\nSee [Proof](../proof/PROOF.md).\n",
      "utf8",
    );
    await verifyRepository(root);

    // Multi-backtick CommonMark code span containing a single backtick must not swallow subsequent broken links
    await writeFile(
      path.join(root, "docs/CHARTER.md"),
      "# Charter\n\nUse ``foo ` bar`` then [Missing](./does-not-exist.md) and `baz`.\n",
      "utf8",
    );
    await assert.rejects(() => verifyRepository(root), /target does not exist/);

    // Angle-bracket link with unbalanced parens or unclosed '<' must be checked/rejected
    await writeFile(
      path.join(root, "docs/CHARTER.md"),
      "# Charter\n\nSee [Missing](<./missing (1.md>).\n",
      "utf8",
    );
    await assert.rejects(() => verifyRepository(root), /target does not exist/);

    await writeFile(
      path.join(root, "docs/CHARTER.md"),
      "# Charter\n\nSee [Unclosed](<./missing.md).\n",
      "utf8",
    );
    await assert.rejects(() => verifyRepository(root), /unclosed angle-bracket link destination/);

    await writeFile(
      path.join(root, "docs/CHARTER.md"),
      "# Charter\n\nSee [Escape](../../outside.md).\n",
      "utf8",
    );
    await assert.rejects(() => verifyRepository(root), /escapes repository root/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects external symlinks and still scans internal symlinks", async () => {
  const { root } = await createMinimalValidFixture();
  const outsideDir = await mkdtemp(path.join(os.tmpdir(), "dinkuskit-books-outside-"));
  try {
    const outsideFile = path.join(outsideDir, "secret.md");
    await writeFile(outsideFile, "# Outside\n", "utf8");
    await symlink(outsideFile, path.join(root, "docs/escaped.md"));
    await assert.rejects(() => verifyRepository(root), /symlink escapes repository root/);
    await rm(path.join(root, "docs/escaped.md"));

    await writeFile(path.join(root, "proof/broken.txt"), "See [bad](./missing.md)\n", "utf8");
    await symlink(path.join(root, "proof/broken.txt"), path.join(root, "docs/linked.md"));
    await assert.rejects(() => verifyRepository(root), /target does not exist/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outsideDir, { recursive: true, force: true });
  }
});

test("rejects public-safety leaks, SHA-256 coordinate blocklist tokens without trailing slash, and .env files", async () => {
  const { root } = await createMinimalValidFixture();
  try {
    await writeFile(path.join(root, ".env"), "PLACEHOLDER=1\n", "utf8");
    await assert.rejects(() => verifyRepository(root), /forbidden environment file/);
    await rm(path.join(root, ".env"));

    const leakedPath = "/Users" + "/example/private.txt";
    await writeFile(path.join(root, "docs/CHARTER.md"), `# Charter\n\nPath: ${leakedPath}\n`, "utf8");
    await assert.rejects(() => verifyRepository(root), /public-safety violation/);

    const sentinelCoord = "https://github.com/example-private-org-" + "sentinel";
    await writeFile(path.join(root, "docs/CHARTER.md"), `# Charter\n\nCoord: ${sentinelCoord}\n`, "utf8");
    await assert.rejects(() => verifyRepository(root), /private organization coordinate/);

    await writeFile(path.join(root, "docs/CHARTER.md"), "# Charter\n\nSee [Proof](../proof/PROOF.md).\n", "utf8");
    await mkdir(path.join(root, "dist"), { recursive: true });
    await writeFile(path.join(root, "dist/.ENV"), "PLACEHOLDER=1\n", "utf8");
    await assert.rejects(() => verifyRepository(root), /forbidden environment file/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("scans Git-tracked files, staged type-swapped blobs, and symlinks inside ignored directories", async () => {
  const { execFile: execFileCb } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFile = promisify(execFileCb);

  const { root } = await createMinimalValidFixture();
  try {
    await writeFile(
      path.join(root, ".gitignore"),
      "node_modules/\ndist/\n.astro/\ncoverage/\n.grilltrack/work/\n.env\n.env.*\n!.env.example\n",
      "utf8",
    );
    await execFile("git", ["init", "-q"], { cwd: root });
    await execFile("git", ["add", "."], { cwd: root });

    // Untracked local build/dependency artifacts should not trip link or env checks
    await mkdir(path.join(root, "node_modules/pkg"), { recursive: true });
    await writeFile(path.join(root, "node_modules/pkg/README.md"), "See [Missing](./missing.md)\n", "utf8");
    await mkdir(path.join(root, "dist"), { recursive: true });
    await writeFile(path.join(root, "dist/untracked.md"), "See [Missing](./missing.md)\n", "utf8");
    await verifyRepository(root);

    // Force-tracked .env inside dist/ must fail verification
    await writeFile(path.join(root, "dist/.env"), "PLACEHOLDER=1\n", "utf8");
    await execFile("git", ["add", "-f", "dist/.env"], { cwd: root });
    await assert.rejects(() => verifyRepository(root), /forbidden environment file/);
    await execFile("git", ["rm", "-f", "-q", "dist/.env"], { cwd: root });

    // Force-tracked public-safety violation inside node_modules/ and .grilltrack/work/ must fail
    const fakeToken = "ghp_" + "A".repeat(36);
    for (const ignoredRel of [
      "node_modules/pkg/leak.txt",
      ".astro/leak.txt",
      "coverage/leak.txt",
      ".grilltrack/work/leak.txt",
    ]) {
      const target = path.join(root, ignoredRel);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, `token=${fakeToken}\n`, "utf8");
      await execFile("git", ["add", "-f", ignoredRel], { cwd: root });
      await assert.rejects(() => verifyRepository(root), /public-safety violation/);
      await execFile("git", ["rm", "-f", "-q", ignoredRel], { cwd: root });
    }

    // Staged secret deleted from working tree without git rm must still fail
    await writeFile(path.join(root, "dist/staged-only.txt"), `token=${fakeToken}\n`, "utf8");
    await execFile("git", ["add", "-f", "dist/staged-only.txt"], { cwd: root });
    await rm(path.join(root, "dist/staged-only.txt"));
    await assert.rejects(() => verifyRepository(root), /public-safety violation/);
    await execFile("git", ["rm", "--cached", "-q", "dist/staged-only.txt"], { cwd: root });

    // Staged secret replaced on disk by a directory without git add must still fail
    await writeFile(path.join(root, "docs/type-swapped.txt"), `token=${fakeToken}\n`, "utf8");
    await execFile("git", ["add", "docs/type-swapped.txt"], { cwd: root });
    await rm(path.join(root, "docs/type-swapped.txt"));
    await mkdir(path.join(root, "docs/type-swapped.txt"));
    await assert.rejects(() => verifyRepository(root), /public-safety violation/);
    await rm(path.join(root, "docs/type-swapped.txt"), { recursive: true, force: true });
    await execFile("git", ["rm", "--cached", "-q", "docs/type-swapped.txt"], { cwd: root });

    // Staged external symlink masked on disk by a harmless regular file without git add must still fail
    await symlink("/etc/passwd", path.join(root, "docs/staged-escape"));
    await execFile("git", ["add", "docs/staged-escape"], { cwd: root });
    await rm(path.join(root, "docs/staged-escape"));
    await writeFile(path.join(root, "docs/staged-escape"), "harmless\n", "utf8");
    await assert.rejects(() => verifyRepository(root), /escapes repository root/);
    await rm(path.join(root, "docs/staged-escape"));
    await execFile("git", ["rm", "--cached", "-q", "docs/staged-escape"], { cwd: root });

    // Force-tracked directory symlink inside dist/ pointing into .grilltrack/work/ must still scan target contents
    await mkdir(path.join(root, ".grilltrack/work/hidden"), { recursive: true });
    await writeFile(path.join(root, ".grilltrack/work/hidden/leak.txt"), `token=${fakeToken}\n`, "utf8");
    await symlink("../.grilltrack/work/hidden", path.join(root, "dist/hidden-link"));
    await execFile("git", ["add", "-f", "dist/hidden-link"], { cwd: root });
    await assert.rejects(() => verifyRepository(root), /public-safety violation/);
    await execFile("git", ["rm", "-f", "-q", "dist/hidden-link"], { cwd: root });
    await rm(path.join(root, ".grilltrack/work/hidden"), { recursive: true, force: true });

    // Clean force-tracked markdown inside dist/ skips relative link check but passes public-safety scan
    await writeFile(path.join(root, "dist/BUILD_NOTES.md"), "Generated output: [Bundle](./missing-bundle.js)\n", "utf8");
    await execFile("git", ["add", "-f", "dist/BUILD_NOTES.md"], { cwd: root });
    await verifyRepository(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
