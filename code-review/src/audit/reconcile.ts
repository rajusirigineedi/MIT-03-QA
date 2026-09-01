/**
 * Reconciles the three independent signals in a package: TQA's 49 findings,
 * the Reviewer Agent's verdict, and the raw trial facts.
 *
 * The spec asks for both automated signals to be treated as claims to verify,
 * and for the Reviewer Agent's verdict to be validated independently:
 *
 *   > Any invalid or unsupported verdict by the Reviewer Agent must be
 *   > explicitly mentioned in your review.
 *
 * Disagreement between two signals is a useful inspection lead. It is not proof
 * that either finding is wrong; primary task evidence still decides.
 */

import type { AuditFlag } from './rules.ts';
import type { Session } from '../package/session.ts';
import type { ClaimCheck, ReviewerAgent } from '../package/reviewerAgent.ts';
import { RUBRIC_BY_ID, isFailingValue } from '../rubrics/rubrics.ts';

/**
 * A job whose own result says it did not pass, while the criterion it produced
 * reads as passing. The label and the measurement disagree.
 */
export function jobResultContradictions(session: Session): AuditFlag[] {
  const flags: AuditFlag[] = [];

  for (const job of session.jobs.values()) {
    const passed = job.result?.['passed'];
    if (passed !== false) continue;

    for (const verdict of job.verdicts) {
      if (isFailingValue(verdict.value)) continue;
      const rubric = RUBRIC_BY_ID.get(verdict.criterionId);
      const label = rubric
        ? `${rubric.title} (${rubric.id})`
        : verdict.criterionId;

      flags.push({
        rule: 'job-result-contradiction',
        severity: 'high',
        criterionId: verdict.criterionId,
        title: `${label} reads ${verdict.value} but its job reported passed=false`,
        detail:
          `The \`${job.command}\` job's own result records \`passed: false\`, ` +
          'yet the criterion it produced is labelled as passing. One of the two ' +
          'is wrong, and the raw result is the harder evidence.',
        evidence: [
          `job=${job.command}`,
          `result.passed=false`,
          ...Object.entries(job.result ?? {})
            .filter(([k]) => k !== 'trials' && k !== 'analyzed')
            .map(([k, v]) => `result.${k}=${JSON.stringify(v)}`)
            .slice(0, 6),
          `verdict.value=${verdict.value}`,
          ...(job.feedback ? [`feedback=${JSON.stringify(job.feedback)}`] : []),
        ],
      });
    }
  }

  return flags;
}

/** Where the Reviewer Agent recorded a TQA failure but the session calls it a pass. */
export function reviewerAgentDisagreements(
  ra: ReviewerAgent,
  session: Session,
): AuditFlag[] {
  const flags: AuditFlag[] = [];

  for (const row of ra.verdictTable) {
    const tqaFailed = /\bFAIL\b/i.test(row.tqa);
    const unevaluated =
      row.stance === 'unevaluated' || /UNEVALUATED/i.test(row.tqa);

    if (unevaluated) {
      flags.push({
        rule: 'gate-never-evaluated',
        severity: 'medium',
        title: `Reviewer Agent: \`${row.signal}\` was never evaluated on the shipped task`,
        detail:
          'A gate that only ran against superseded versions of the task tells ' +
          'you nothing about the bytes being shipped. The Reviewer Agent judged ' +
          'this non-blocking; decide whether you agree.' +
          (row.take ? ` Its reasoning: ${row.take}` : ''),
        evidence: [
          `signal=${row.signal}`,
          `tqa=${row.tqa}`,
          `stance=${row.stance}`,
          ...(row.confidence ? [`confidence=${row.confidence}`] : []),
        ],
      });
      continue;
    }

    if (!tqaFailed) continue;

    flags.push({
      rule: 'reviewer-agent-records-tqa-failure',
      severity: 'high',
      title: `Reviewer Agent recorded a TQA FAIL on \`${row.signal}\``,
      detail:
        'The Reviewer Agent logged this signal as a TQA failure' +
        (row.stance === 'caveat' || row.stance === 'agree'
          ? ` and took the stance "${row.stance}", arguing it should not block.`
          : '.') +
        ' Check whether the corresponding criteria in the rubric reflect that, ' +
        'and whether you accept the argument for discounting it.' +
        (row.take ? ` Its reasoning: ${row.take}` : ''),
      evidence: [
        `signal=${row.signal}`,
        `tqa=${row.tqa}`,
        `stance=${row.stance}`,
        ...(row.confidence ? [`confidence=${row.confidence}`] : []),
      ],
    });
  }

  void session;
  return flags;
}

/** Reviewer Agent statements that are checkably false. */
export function reviewerAgentClaimFlags(checks: ClaimCheck[]): AuditFlag[] {
  return checks
    .filter((c) => !c.holds)
    .map((check) => ({
      rule:
        check.kind === 'shebang'
          ? 'reviewer-agent-false-claim'
          : 'reviewer-agent-missing-path',
      severity: 'high' as const,
      title:
        check.kind === 'shebang'
          ? `Reviewer Agent misstates the contents of \`${check.file}\``
          : `Reviewer Agent references \`${check.file}\`, which is not in the task`,
      detail:
        check.kind === 'shebang'
          ? 'The claim does not match the file. The spec requires an invalid or ' +
            'unsupported Reviewer Agent statement to be called out explicitly in ' +
            'your review, so this belongs in the write-up even though it is minor ' +
            'in itself — it bears on how much the rest of the verdict is worth.'
          : 'The path does not exist in the shipped task, so any conclusion ' +
            'resting on it is unsupported.',
      evidence: [
        `claim=${JSON.stringify(check.claim)}`,
        `file=${check.file}`,
        `claimed=${check.expected}`,
        `actual=${check.actual === null ? '(file not found)' : JSON.stringify(check.actual)}`,
      ],
    }));
}

/**
 * Where the Reviewer Agent already addressed something the audit flagged, note
 * the counter-argument on the flag so both sides are visible.
 */
export function annotateWithReviewerAgent(
  flags: AuditFlag[],
  ra: ReviewerAgent,
): AuditFlag[] {
  const nearMissNote = ra.annotations.find((a) => a.why_fair);

  return flags.map((flag) => {
    if (
      nearMissNote?.why_fair &&
      (flag.rule === 'measured-near-miss' ||
        flag.rule === 'identical-failure-across-trials')
    ) {
      return withCounter(
        flag,
        `Reviewer Agent judged the failing tests fair: ${nearMissNote.why_fair}`,
      );
    }
    return flag;
  });
}

function withCounter(flag: AuditFlag, counter: string): AuditFlag {
  return {
    ...flag,
    detail: `${flag.detail}\n\nCounter-argument on record — ${counter}`,
  };
}
