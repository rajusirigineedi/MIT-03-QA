/**
 * Loads the Reviewer Agent verdict from `run/<task>/<ts>/conclude/`.
 *
 *   claude_skill_review.md                the written review
 *   claude_skill_review.annotations.json  applied test-fairness annotations
 *
 * The markdown embeds two fenced JSON blocks that carry the structured parts:
 * ```reviewer-verdict-table``` (one row per signal, with a stance) and
 * ```annotations``` (per-test fairness notes).
 *
 * The spec requires this verdict to be validated independently rather than
 * taken on trust, so claims it makes about files are checked where they are
 * precise enough to check.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isDir, isFile, safeReaddir } from './load.ts';

/** How the Reviewer Agent positioned itself against a pipeline signal. */
export type Stance = 'agree' | 'caveat' | 'disagree' | 'unevaluated' | string;

export interface VerdictRow {
  signal: string;
  /** What TQA reported for this signal, as the agent recorded it. */
  tqa: string;
  stance: Stance;
  take: string;
  confidence?: string;
}

export interface TestAnnotation {
  file: string;
  anchor?: string;
  anchor_type?: string;
  test?: string;
  failed_in?: number;
  of?: number;
  why_fair?: string;
  derivation?: string;
  comment?: string;
}

export interface ReviewerAgent {
  /** `ship`, `fix-then-ship`, `reject`, … */
  verdict: string;
  markdownPath: string;
  markdown: string;
  verdictTable: VerdictRow[];
  annotations: TestAnnotation[];
  /** Section headings, useful for pointing a reviewer at the right part. */
  sections: string[];
}

export async function loadReviewerAgent(
  packageDir: string,
): Promise<ReviewerAgent | null> {
  const markdownPath = await findReviewerAgentMarkdown(packageDir);
  if (!markdownPath) return null;
  const markdown = await readFile(markdownPath, 'utf8');

  const annotationsPath = markdownPath.replace(/\.md$/, '.annotations.json');
  let verdict = '';
  let annotations: TestAnnotation[] = [];

  if (await isFile(annotationsPath)) {
    try {
      const parsed = JSON.parse(await readFile(annotationsPath, 'utf8')) as {
        verdict?: string;
        applied?: TestAnnotation[];
      };
      verdict = parsed.verdict ?? '';
      annotations = parsed.applied ?? [];
    } catch {
      // fall through to the markdown-embedded copies
    }
  }

  const embedded = extractFencedJson<TestAnnotation[]>(markdown, 'annotations');
  if (embedded) {
    // The embedded block carries the prose fields the JSON sidecar omits.
    annotations = mergeAnnotations(annotations, embedded);
  }

  return {
    verdict: verdict || inferVerdict(markdown),
    markdownPath,
    markdown,
    verdictTable:
      extractFencedJson<VerdictRow[]>(markdown, 'reviewer-verdict-table') ?? [],
    annotations,
    sections: [...markdown.matchAll(/^#{1,4}\s+(.+)$/gm)].map((m) =>
      m[1]!.trim(),
    ),
  };
}

export async function findReviewerAgentMarkdown(
  packageDir: string,
): Promise<string | null> {
  const concludeDir = await findConcludeDir(packageDir);
  if (!concludeDir) return null;

  const markdownPath = join(concludeDir, 'claude_skill_review.md');
  return (await isFile(markdownPath)) ? markdownPath : null;
}

/** run/<task>/<timestamp>/conclude/ */
async function findConcludeDir(packageDir: string): Promise<string | null> {
  const runDir = join(packageDir, 'run');
  for (const task of await safeReaddir(runDir)) {
    const taskDir = join(runDir, task);
    for (const ts of (await safeReaddir(taskDir)).sort().reverse()) {
      const candidate = join(taskDir, ts, 'conclude');
      if (await isDir(candidate)) return candidate;
    }
  }
  return null;
}

function extractFencedJson<T>(markdown: string, tag: string): T | null {
  const re = new RegExp('```' + tag + '\\s*\\n([\\s\\S]*?)```', 'm');
  const body = re.exec(markdown)?.[1];
  if (!body) return null;
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

function mergeAnnotations(
  base: TestAnnotation[],
  extra: TestAnnotation[],
): TestAnnotation[] {
  const key = (a: TestAnnotation) => `${a.file}::${a.anchor ?? a.test ?? ''}`;
  const merged = new Map<string, TestAnnotation>();
  for (const a of base) merged.set(key(a), a);
  for (const a of extra) {
    merged.set(key(a), { ...(merged.get(key(a)) ?? {}), ...a });
  }
  return [...merged.values()];
}

function inferVerdict(markdown: string): string {
  if (/\bSHIP\b/.test(markdown) && !/\bREJECT\b/.test(markdown)) return 'ship';
  if (/\bREJECT\b/.test(markdown)) return 'reject';
  return 'unknown';
}

/* ------------------------------------------------------------------ *
 * Claim verification
 * ------------------------------------------------------------------ */

export interface ClaimCheck {
  kind: 'shebang' | 'path';
  claim: string;
  /** Task-relative file the claim is about. */
  file: string;
  expected: string;
  actual: string | null;
  holds: boolean;
}

/**
 * Checks the narrow class of Reviewer Agent claims that are precisely
 * falsifiable: an asserted shebang, and an asserted file path.
 *
 * Kept deliberately narrow. Broader prose claims ("grading is partition-based")
 * are judgement and belong to the reviewer, not to a regex.
 */
export async function verifyClaims(
  ra: ReviewerAgent,
  taskDir: string,
  taskFiles: Set<string>,
): Promise<ClaimCheck[]> {
  const checks: ClaimCheck[] = [];

  for (const sentence of splitSentences(ra.markdown)) {
    // Only claims of the form "<file> carries/has a `#!...` shebang".
    if (!/shebang/i.test(sentence)) continue;
    const shebangs = [...sentence.matchAll(/`(#![^`]+)`/g)].map((m) => m[1]!);
    if (!shebangs.length) continue;

    const file = findTaskPath(sentence, taskFiles);
    if (!file) continue;

    const firstLine = (await firstLineOf(join(taskDir, file))) ?? null;

    // A sentence may mention both the asserted shebang and a suggested fix, so
    // the claim holds if any quoted shebang matches the file.
    const holds = shebangs.some((s) => firstLine?.trim() === s.trim());
    if (holds) continue;

    checks.push({
      kind: 'shebang',
      claim: condense(sentence),
      file,
      expected: shebangs.join(' or '),
      actual: firstLine,
      holds: false,
    });
  }

  // Asserted paths that do not exist in the task.
  for (const m of ra.markdown.matchAll(/`((?:tests|solution|environment)\/[\w./-]+)`/g)) {
    const p = m[1]!;
    if (taskFiles.has(p)) continue;
    if (checks.some((c) => c.file === p)) continue;
    checks.push({
      kind: 'path',
      claim: `references \`${p}\``,
      file: p,
      expected: 'file exists in the task',
      actual: null,
      holds: false,
    });
  }

  return checks;
}

function findTaskPath(sentence: string, taskFiles: Set<string>): string | null {
  for (const m of sentence.matchAll(/`([\w./-]+)`/g)) {
    const candidate = m[1]!;
    if (taskFiles.has(candidate)) return candidate;
    const match = [...taskFiles].find((f) => f.endsWith(`/${candidate}`));
    if (match) return match;
  }
  return null;
}

async function firstLineOf(path: string): Promise<string | undefined> {
  try {
    const text = await readFile(path, 'utf8');
    return text.split('\n', 1)[0];
  } catch {
    return undefined;
  }
}

function splitSentences(markdown: string): string[] {
  return markdown
    .split(/\n{2,}|\n[-*]\s+/)
    .flatMap((block) => block.split(/(?<=[.;])\s+(?=[A-Z`])/))
    .map((s) => s.trim())
    .filter(Boolean);
}

function condense(s: string, max = 240): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}
