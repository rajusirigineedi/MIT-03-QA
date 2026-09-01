/**
 * Quantifies how close failing trials came to passing.
 *
 * Near Misses (`near_misses`) asks whether failures "fail by a clear margin" rather than being
 * near-working solutions rejected over a small discrepancy. That is a numeric
 * question whenever the verifier's assertion compares two numbers, so measure
 * it instead of taking a label's word for it.
 */

import type { AuditFlag } from './rules.ts';
import {
  failedTests,
  loadTestStdout,
  pytestSummary,
  type Trial,
  type TrialIndex,
} from '../package/trials.ts';

/** Relative difference below which a failure counts as a near miss. */
const NEAR_MISS_THRESHOLD = 0.02;

export interface Margin {
  /** Value the agent produced. */
  actual: number;
  /** Value the verifier expected. */
  expected: number;
  /** |actual - expected| / expected */
  relative: number;
  /** The assertion line it came from. */
  source: string;
}

export interface TrialFailure {
  trial: Trial;
  summary: string | null;
  failed: string[];
  passedCount: number | null;
  failedCount: number | null;
  margins: Margin[];
  /** Smallest relative margin observed, if any. */
  closest: Margin | null;
}

export async function analyzeFailures(
  trials: TrialIndex,
): Promise<TrialFailure[]> {
  const out: TrialFailure[] = [];

  for (const trial of trials.trials) {
    if (trial.solved) continue;
    const stdout = await loadTestStdout(trial);
    if (!stdout) continue;

    const margins = extractMargins(stdout);
    const counts = extractCounts(stdout);
    out.push({
      trial,
      summary: pytestSummary(stdout),
      failed: failedTests(stdout),
      passedCount: counts.passed,
      failedCount: counts.failed,
      margins,
      closest: margins.length
        ? margins.reduce((a, b) => (a.relative <= b.relative ? a : b))
        : null,
    });
  }

  return out;
}

/**
 * Numeric equality assertions from pytest output, e.g.
 *   `assert 33565 == 33576`
 */
function extractMargins(stdout: string): Margin[] {
  const out: Margin[] = [];
  const re = /^E?\s*assert\s+([\d.]+)\s*==\s*([\d.]+)\s*$/gim;
  for (const m of stdout.matchAll(re)) {
    const actual = Number.parseFloat(m[1]!);
    const expected = Number.parseFloat(m[2]!);
    if (!Number.isFinite(actual) || !Number.isFinite(expected) || expected === 0) {
      continue;
    }
    if (actual === expected) continue;
    out.push({
      actual,
      expected,
      relative: Math.abs(actual - expected) / Math.abs(expected),
      source: m[0]!.trim(),
    });
  }
  return out;
}

function extractCounts(stdout: string): {
  passed: number | null;
  failed: number | null;
} {
  const line = pytestSummary(stdout) ?? '';
  const passed = /(\d+)\s+passed/.exec(line)?.[1];
  const failed = /(\d+)\s+failed/.exec(line)?.[1];
  return {
    passed: passed ? Number(passed) : null,
    failed: failed ? Number(failed) : null,
  };
}

/** Turns measured margins into audit flags. */
export function nearMissFlags(failures: TrialFailure[]): AuditFlag[] {
  const flags: AuditFlag[] = [];

  const near = failures.filter(
    (f) => f.closest && f.closest.relative <= NEAR_MISS_THRESHOLD,
  );
  if (!near.length) return flags;

  const worst = near.reduce((a, b) =>
    (a.closest?.relative ?? 1) <= (b.closest?.relative ?? 1) ? a : b,
  );
  const pct = (worst.closest!.relative * 100).toFixed(3);

  flags.push({
    rule: 'measured-near-miss',
    severity: 'high',
    criterionId: 'near_misses',
    title:
      `${near.length} failing trial(s) missed by under ` +
      `${(NEAR_MISS_THRESHOLD * 100).toFixed(0)}% — closest was ${pct}%`,
    detail:
      'Near Misses asks whether failures fail by a clear margin. A small relative ' +
      'margin is a reason to look, not a finding on its own: when the assertion ' +
      'compares aggregate counts, a fraction of a percent can still mean the ' +
      'answer is categorically wrong on the concept under test. Convert the ' +
      'margin into units the task cares about — how many records, clusters, or ' +
      'crafted cases — and read the assertion source before deciding whether ' +
      'this is spec misalignment or a real capability gap.',
    evidence: near.flatMap((f) => [
      `${f.trial.model}/${f.trial.attempt}: ${f.closest!.source} ` +
        `(off by ${Math.abs(f.closest!.actual - f.closest!.expected)}, ` +
        `${(f.closest!.relative * 100).toFixed(3)}%)`,
      ...(f.summary ? [`  ${f.summary}`] : []),
      ...(f.failed.length ? [`  failed: ${f.failed.join(', ')}`] : []),
    ]),
  });

  // Identical failures across trials point at the task, not at chance.
  const signatures = new Map<string, TrialFailure[]>();
  for (const f of failures) {
    const key = `${f.failed.slice().sort().join('|')}::${f.closest?.source ?? ''}`;
    signatures.set(key, [...(signatures.get(key) ?? []), f]);
  }
  for (const [, group] of signatures) {
    if (group.length < 2) continue;
    flags.push({
      rule: 'identical-failure-across-trials',
      severity: 'medium',
      criterionId: 'core_challenge_is_problem',
      title: `${group.length} trials failed in exactly the same way`,
      detail:
        'Independent attempts converging on an identical discrepancy suggests ' +
        'a systematic cause — a spec ambiguity or an edge case the contract ' +
        'does not pin down — rather than variance in agent capability. Worth ' +
        'checking against rubrics 13, 41 and 43.',
      evidence: group.map(
        (f) =>
          `${f.trial.model}/${f.trial.attempt}: ${f.closest?.source ?? '(no numeric assert)'}`,
      ),
    });
  }

  return flags;
}
