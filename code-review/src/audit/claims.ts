/**
 * Verifies the factual content of every TQA finding against the shipped task.
 *
 * The rest of the audit asks whether a rationale is *well-formed*. This asks
 * whether it is *true*. A verdict can read as a confident, detailed pass and
 * still cite a test that does not exist — which is exactly the second-round
 * check the review process is asking for.
 *
 * Only precisely falsifiable claims are checked:
 *
 *   test names     `test_clusters_exact` — does that function exist?
 *   file paths     `tests/helper.py` — is it in the task?
 *   quoted text    offending_passages[].quoted_text — is it really in the file?
 *   timeout values "verifier timeout of 600s" — does task.toml say 600?
 *   coverage       which existing tests the reasoning never mentions
 *
 * Everything else is judgement and belongs to the reviewer.
 */

import type { AuditFlag } from './rules.ts';
import type { Session, Verdict } from '../package/session.ts';
import {
  allTomlNumbers,
  findLiteral,
  findLiteralLoose,
  type TaskCorpus,
} from '../package/taskfiles.ts';
import { RUBRIC_BY_ID } from '../rubrics/rubrics.ts';

export type ClaimKind =
  | 'test-name'
  | 'file-path'
  | 'quoted-text'
  | 'timeout-value'
  | 'coverage';

export interface ClaimResult {
  criterionId: string;
  kind: ClaimKind;
  /** The claimed thing, verbatim. */
  claimed: string;
  holds: boolean;
  /** Where it was found, or why it was not. */
  note: string;
}

export interface ClaimReport {
  results: ClaimResult[];
  /** criterionId -> {checked, failed} */
  byCriterion: Map<string, { checked: number; failed: number }>;
}

export function verifyAllClaims(
  session: Session,
  corpus: TaskCorpus,
): ClaimReport {
  const results: ClaimResult[] = [];

  for (const verdict of session.verdicts.values()) {
    results.push(...verifyVerdict(verdict, corpus));
  }

  const byCriterion = new Map<string, { checked: number; failed: number }>();
  for (const r of results) {
    const cur = byCriterion.get(r.criterionId) ?? { checked: 0, failed: 0 };
    cur.checked++;
    if (!r.holds) cur.failed++;
    byCriterion.set(r.criterionId, cur);
  }

  return { results, byCriterion };
}

function verifyVerdict(verdict: Verdict, corpus: TaskCorpus): ClaimResult[] {
  const out: ClaimResult[] = [];
  const prose = proseOf(verdict);

  out.push(...checkTestNames(verdict, prose, corpus));
  out.push(...checkFilePaths(verdict, prose, corpus));
  out.push(...checkQuotedPassages(verdict, corpus));
  out.push(...checkTimeoutValues(verdict, prose, corpus));
  out.push(...checkCoverage(verdict, prose, corpus));

  return out;
}

/** All free text a verdict carries, concatenated. */
function proseOf(verdict: Verdict): string {
  const parts = [verdict.summary, verdict.reasoning, verdict.detail];
  for (const f of verdict.findings) {
    parts.push(f.title, f.summary);
    if (f.details) parts.push(JSON.stringify(f.details));
  }
  return parts.filter(Boolean).join('\n');
}

/**
 * A cited test function that does not exist means the reasoning was not derived
 * from the test file it claims to describe.
 */
function checkTestNames(
  verdict: Verdict,
  prose: string,
  corpus: TaskCorpus,
): ClaimResult[] {
  if (corpus.testFunctions.size === 0) return [];

  const cited = new Set(
    [...prose.matchAll(/\btest_[A-Za-z0-9_]{3,}\b/g)].map((m) => m[0]),
  );
  const out: ClaimResult[] = [];

  for (const name of cited) {
    // pytest node ids and file names are not function claims
    if (name.endsWith('_py') || name === 'test_outputs') continue;

    if (corpus.testFunctions.has(name)) {
      out.push({
        criterionId: verdict.criterionId,
        kind: 'test-name',
        claimed: name,
        holds: true,
        note: corpus.testLocations.get(name) ?? 'exists',
      });
      continue;
    }

    const near = nearest(name, corpus.testFunctions);
    out.push({
      criterionId: verdict.criterionId,
      kind: 'test-name',
      claimed: name,
      holds: false,
      note: near
        ? `no such test; closest existing is \`${near}\``
        : 'no such test in the task',
    });
  }

  return out;
}

function checkFilePaths(
  verdict: Verdict,
  prose: string,
  corpus: TaskCorpus,
): ClaimResult[] {
  const out: ClaimResult[] = [];
  const seen = new Set<string>();

  const re = /\b((?:tests|solution|environment)\/[A-Za-z0-9_.\-/]+\.[A-Za-z0-9]+)/g;
  for (const m of prose.matchAll(re)) {
    const path = m[1]!;
    if (seen.has(path)) continue;
    seen.add(path);

    const holds = corpus.paths.has(path);
    out.push({
      criterionId: verdict.criterionId,
      kind: 'file-path',
      claimed: path,
      holds,
      note: holds ? 'exists' : 'not present in the shipped task',
    });
  }

  return out;
}

/**
 * TQA's structured findings quote the passage they object to. If the quote is
 * not in the file, the objection is not about this task.
 */
function checkQuotedPassages(
  verdict: Verdict,
  corpus: TaskCorpus,
): ClaimResult[] {
  const out: ClaimResult[] = [];

  for (const finding of verdict.findings) {
    const passages = finding.details?.['offending_passages'];
    if (!Array.isArray(passages)) continue;

    for (const p of passages) {
      if (typeof p !== 'object' || p === null) continue;
      const quoted = String(
        (p as Record<string, unknown>)['quoted_text'] ?? '',
      ).trim();
      if (quoted.length < 8) continue;

      const exact = findLiteral(corpus, quoted);
      const loose = exact ? null : findLiteralLoose(corpus, quoted);

      out.push({
        criterionId: verdict.criterionId,
        kind: 'quoted-text',
        claimed: quoted.length > 90 ? `${quoted.slice(0, 90)}…` : quoted,
        holds: Boolean(exact ?? loose),
        note: exact
          ? `found at ${exact}`
          : loose
            ? `found in ${loose} after whitespace normalisation`
            : 'not found in any task file',
      });
    }
  }

  return out;
}

/**
 * Claims of the form "<something> timeout of 600s". Only numbers tied to
 * timeout wording are checked — resource figures are often quoted as platform
 * defaults rather than as file contents, and flagging those is noise.
 */
function checkTimeoutValues(
  verdict: Verdict,
  prose: string,
  corpus: TaskCorpus,
): ClaimResult[] {
  const declared = allTomlNumbers(corpus);
  if (declared.size === 0) return [];

  const out: ClaimResult[] = [];
  const seen = new Set<number>();

  const re = /timeout[^.;]{0,40}?(\d{2,6})\s*s(?:ec|econds)?\b|(\d{2,6})\s*s(?:ec|econds)?\b[^.;]{0,20}?timeout/gi;
  for (const m of prose.matchAll(re)) {
    const raw = m[1] ?? m[2];
    if (!raw) continue;
    const value = Number.parseInt(raw, 10);
    if (seen.has(value)) continue;
    seen.add(value);

    const holds = declared.has(value);
    out.push({
      criterionId: verdict.criterionId,
      kind: 'timeout-value',
      claimed: `${value}s`,
      holds,
      note: holds
        ? 'matches a value declared in task.toml'
        : `not declared in task.toml (declared: ${[...declared].sort((a, b) => a - b).join(', ')})`,
    });
  }

  return out;
}

/**
 * For the two rubrics that assert the tests cover the contract, list the tests
 * the reasoning never mentions. An untraced test is an untested claim.
 */
const COVERAGE_CRITERIA = new Set(['tests_align_instruction', 'test_coverage']);

function checkCoverage(
  verdict: Verdict,
  prose: string,
  corpus: TaskCorpus,
): ClaimResult[] {
  if (!COVERAGE_CRITERIA.has(verdict.criterionId)) return [];
  if (corpus.testFunctions.size === 0) return [];

  const untraced = [...corpus.testFunctions].filter(
    (name) => !prose.includes(name),
  );
  if (untraced.length === 0) {
    return [
      {
        criterionId: verdict.criterionId,
        kind: 'coverage',
        claimed: `all ${corpus.testFunctions.size} tests traced`,
        holds: true,
        note: 'every test function is mentioned in the reasoning',
      },
    ];
  }

  return [
    {
      criterionId: verdict.criterionId,
      kind: 'coverage',
      claimed: `${corpus.testFunctions.size - untraced.length} of ${corpus.testFunctions.size} tests traced`,
      holds: false,
      note: `never mentioned: ${untraced
        .map((n) => `${n} (${corpus.testLocations.get(n) ?? '?'})`)
        .join(', ')}`,
    },
  ];
}

/** Turns failed claim checks into audit flags. */
export function claimFlags(report: ClaimReport): AuditFlag[] {
  const failedByCriterion = new Map<string, ClaimResult[]>();
  for (const r of report.results) {
    if (r.holds) continue;
    failedByCriterion.set(r.criterionId, [
      ...(failedByCriterion.get(r.criterionId) ?? []),
      r,
    ]);
  }

  const flags: AuditFlag[] = [];

  for (const [criterionId, failures] of failedByCriterion) {
    const rubric = RUBRIC_BY_ID.get(criterionId);
    const label = rubric ? `${rubric.title} (${rubric.id})` : criterionId;

    const hard = failures.filter((f) => f.kind !== 'coverage');
    const coverage = failures.filter((f) => f.kind === 'coverage');

    if (hard.length) {
      const kinds = [...new Set(hard.map((f) => f.kind))].join(', ');
      flags.push({
        rule: 'autoqa-false-claim',
        severity: 'high',
        criterionId,
        title: `${label} cites ${hard.length} thing(s) that do not check out (${kinds})`,
        detail:
          'The reasoning reads as a confident assessment, but these specifics ' +
          'do not match the shipped task. A verdict that misdescribes what it ' +
          'examined is unsupported regardless of how detailed it sounds, and ' +
          'the finding should be marked invalid.',
        evidence: hard.map(
          (f) => `${f.kind}: ${JSON.stringify(f.claimed)} — ${f.note}`,
        ),
      });
    }

    if (coverage.length) {
      flags.push({
        rule: 'autoqa-incomplete-coverage-claim',
        severity: 'medium',
        criterionId,
        title: `${label} does not account for every test in the suite`,
        detail:
          'This rubric asserts the tests trace to the contract, but the ' +
          'reasoning never mentions some of the tests that exist. Those ' +
          'assertions were not shown to trace to anything — check them ' +
          'yourself before marking TQA valid.',
        evidence: coverage.map((f) => `${f.claimed} — ${f.note}`),
      });
    }
  }

  return flags;
}

/** Levenshtein-nearest candidate, for "did you mean" notes. */
function nearest(name: string, candidates: Set<string>): string | null {
  let best: string | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    const d = distance(name, c);
    if (d < bestScore) {
      bestScore = d;
      best = c;
    }
  }
  // Only useful if it is genuinely close.
  return bestScore <= Math.max(4, name.length * 0.4) ? best : null;
}

function distance(a: string, b: string): number {
  const prev = new Array<number>(b.length + 1);
  const cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j]!;
  }
  return prev[b.length]!;
}
