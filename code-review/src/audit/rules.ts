/**
 * Audits TQA's 49 findings against its own evidence and the trial outcomes.
 *
 * This is deliberately not a re-implementation of TQA's checks. TQA
 * already runs them. What nothing checks is whether each verdict is actually
 * *supported*. The spec instructs the reviewer to mark a finding invalid when it is
 * "hallucinated, incorrect, unsupported, or stricter than the actual TB3
 * requirement" is the reviewer's job, and most of it is mechanical.
 *
 * Every flag here is a claim about the evidence, not about the task. A flag
 * means "a human should check whether TQA is valid", never
 * "the task is broken".
 */

import {
  EXTRA_GATE_IDS,
  isFailingValue,
  RUBRICS,
  RUBRIC_BY_ID,
} from '../rubrics/rubrics.ts';
import type { Session, Verdict } from '../package/session.ts';
import type { TrialIndex } from '../package/trials.ts';

export type Severity = 'high' | 'medium' | 'low';

export interface AuditFlag {
  /** Stable rule id. */
  rule: string;
  severity: Severity;
  /** Criterion this bears on, when it is criterion-specific. */
  criterionId?: string;
  title: string;
  detail: string;
  /** Concrete pointers a review comment can cite. */
  evidence: string[];
}

export interface AuditContext {
  session: Session;
  trials: TrialIndex;
}

/**
 * Reasoning that describes the pipeline's own control flow rather than the
 * task. A verdict justified only this way has no evidentiary content.
 */
const PROCEDURAL_REASONING: RegExp[] = [
  /non-?blocking/i,
  /\bflagged\s+(yellow|green|red)\b/i,
  /\bnot\s+blocked\b/i,
  /\bblock(ed)?[ _-]?on\b/i,
  /^\s*\w+:\s*(yellow|green|red|pass|fail)\s*$/i,
];

/**
 * Reasoning that asserts only that nothing was flagged. "Not flagged by
 * analyze" is the absence of a finding, which is not the same as having checked
 * and found the property to hold — nothing here distinguishes "verified" from
 * "never looked at".
 */
const ABSENCE_REASONING: RegExp[] = [
  /^\s*not\s+flagged\b/i,
  /\bnot\s+flagged\s+by\b/i,
  /\bno\s+(issues?|problems?|findings?|concerns?)\s+(found|detected|reported|raised)\b/i,
];

/**
 * Reasoning anchored to something measured — a reward, a count of checks — is
 * thin but not unsupported, and should not be flagged merely for being short.
 */
const MEASURED_REASONING: RegExp[] = [
  /\breward\b\s*=?\s*[\d.]/i,
  /\breward\s+[\d.]/i,
  /\b\d+\s+checks?\b/i,
  /\b\d+\s+trial\(?s?\)?\b/i,
];

/** Reasoning short enough that it cannot contain real analysis. */
const THIN_REASONING_CHARS = 180;

export function audit(ctx: AuditContext): AuditFlag[] {
  return [
    ...auditVerdictSupport(ctx),
    ...auditAnalyzeContradictions(ctx),
    ...auditCardCoverage(ctx),
    ...auditReviewerMarks(ctx),
  ].sort(bySeverityThenCriterion);
}

/** Verdicts that pass without evidence behind them. */
function auditVerdictSupport({ session }: AuditContext): AuditFlag[] {
  const flags: AuditFlag[] = [];

  for (const verdict of session.verdicts.values()) {
    if (EXTRA_GATE_IDS.has(verdict.criterionId)) continue;

    const label = describe(verdict);
    const rubric = RUBRIC_BY_ID.get(verdict.criterionId);
    const reasoning = verdict.reasoning?.trim() ?? '';
    const hasFindings = verdict.findings.length > 0;
    const passing = !isFailingValue(verdict.value);

    const procedural = PROCEDURAL_REASONING.some((re) => re.test(reasoning));
    const absence = ABSENCE_REASONING.some((re) => re.test(reasoning));
    const measured = MEASURED_REASONING.some((re) => re.test(reasoning));

    if (passing && !hasFindings && procedural) {
      flags.push({
        rule: 'procedural-pass',
        severity: 'high',
        criterionId: verdict.criterionId,
        title: `${label} passed on pipeline mechanics, not evidence`,
        detail:
          'The verdict carries no findings and its reasoning describes only ' +
          'whether the pipeline chose to block, which says nothing about the ' +
          'task. Under the spec this is an unsupported verdict and a ' +
          'candidate for Is TQA finding valid: NO.',
        evidence: [
          `job=${verdict.command}`,
          `value=${verdict.value}`,
          'findings=[]',
          `reasoning=${quote(reasoning)}`,
        ],
      });
      continue;
    }

    if (passing && !hasFindings && absence) {
      flags.push({
        rule: 'absence-based-pass',
        severity: rubric?.extraAttention ? 'high' : 'medium',
        criterionId: verdict.criterionId,
        title: `${label} passed only because nothing flagged it`,
        detail:
          'The rationale records the absence of a finding, not a positive ' +
          'check. Nothing distinguishes "verified and sound" from "never ' +
          'examined", so marking TQA valid means vouching for it yourself' +
          (rubric?.extraAttention
            ? ' — and the spec singles this rubric out for extra attention.'
            : '.'),
        evidence: [
          `job=${verdict.command}`,
          `value=${verdict.value}`,
          'findings=[]',
          `reasoning=${quote(reasoning)}`,
        ],
      });
      continue;
    }

    if (
      passing &&
      !hasFindings &&
      !measured &&
      reasoning.length < THIN_REASONING_CHARS
    ) {
      flags.push({
        rule: 'thin-pass',
        severity: 'low',
        criterionId: verdict.criterionId,
        title: `${label} passed on a one-line rationale with no findings`,
        detail:
          'Short, and not anchored to a measured outcome such as a reward or a ' +
          'check count. Probably fine, but there is nothing here to verify against.',
        evidence: [
          `job=${verdict.command}`,
          `value=${verdict.value}`,
          `reasoning=${quote(reasoning)}`,
        ],
      });
    }

    // Every TQA label needs a human validity decision. A supported non-passing
    // finding receives portal PASS even though the underlying task rubric fails.
    if (!passing && verdict.value !== 'PENDING') {
      const mark = session.marks.get(verdict.criterionId);
      if (!mark) {
        flags.push({
          rule: 'nonpassing-verdict-undecided',
          severity: 'high',
          criterionId: verdict.criterionId,
          title: `${label} is ${verdict.value} and still undecided`,
          detail:
            'This TQA finding still needs a validity decision. If primary ' +
            'evidence supports the label and its material reason, record YES ' +
            'and portal PASS even though the task rubric is non-passing. If it ' +
            'does not, record NO and portal FAIL. TQA supplied ' +
            `${verdict.findings.length} finding(s) to check against the task files.`,
          evidence: [
            `job=${verdict.command}`,
            `value=${verdict.value}`,
            `findings=${verdict.findings.length}`,
            ...(verdict.summary ? [`summary=${quote(verdict.summary)}`] : []),
          ],
        });
      }
    }

    if (verdict.provenance === 'autogen' && !hasFindings) {
      flags.push({
        rule: 'autogen-verdict',
        severity: 'medium',
        criterionId: verdict.criterionId,
        title: `${label} was auto-generated rather than analysed`,
        detail:
          'provenance=autogen means no dedicated analysis produced this ' +
          'verdict. It reflects a default, so it is only as good as the ' +
          'assumption behind it.',
        evidence: [`job=${verdict.command}`, `value=${verdict.value}`],
      });
    }

    if (
      reasoning &&
      verdict.summary &&
      reasoning === verdict.summary.trim() &&
      !hasFindings
    ) {
      flags.push({
        rule: 'reasoning-echoes-summary',
        severity: 'low',
        criterionId: verdict.criterionId,
        title: `${label} reasoning is a copy of its summary`,
        detail: 'No independent justification was recorded beyond the headline.',
        evidence: [`job=${verdict.command}`, `reasoning=${quote(reasoning)}`],
      });
    }
  }

  return flags;
}

/**
 * The `analyze` job records per-model, per-criterion outcomes. Where it recorded
 * a failure but the criterion still reads PASS, the pass came from the
 * blocking policy rather than from the finding being resolved.
 */
function auditAnalyzeContradictions({ session }: AuditContext): AuditFlag[] {
  const flags: AuditFlag[] = [];
  const analyze = session.jobs.get('analyze');
  if (!analyze?.result) return flags;

  const result = analyze.result;
  const blockOn = String(result['block_on'] ?? '');
  const yellow = toStringArray(result['yellow']);
  const red = toStringArray(result['red']);
  const failCounts = isRecord(result['fail_counts']) ? result['fail_counts'] : {};

  for (const [rawId, count] of Object.entries(failCounts)) {
    const verdict = resolveVerdict(session, rawId);
    const label = verdict ? describe(verdict) : rawId;
    const value = verdict?.value ?? '(no verdict)';

    if (verdict && !isFailingValue(verdict.value)) {
      const tier = yellow.includes(rawId)
        ? 'yellow'
        : red.includes(rawId)
          ? 'red'
          : 'untiered';
      flags.push({
        rule: 'analyze-contradiction',
        severity: 'high',
        criterionId: verdict.criterionId,
        title: `${label} reads ${value} although analyze recorded ${count} failure(s)`,
        detail:
          `The analyze job counted a failure for \`${rawId}\` and placed it in ` +
          `the ${tier} tier, but the gate only blocks on \`${blockOn}\`, so the ` +
          'criterion still reports a pass. The underlying finding was never ' +
          'refuted — only deemed non-blocking. This is the clearest kind of ' +
          'candidate for Is TQA finding valid: NO.',
        evidence: [
          `analyze.fail_counts.${rawId}=${String(count)}`,
          `analyze.block_on=${blockOn}`,
          `tier=${tier}`,
          `verdict.value=${value}`,
        ],
      });
    }
  }

  // Per-model findings, which are more granular than fail_counts.
  const analyzed = Array.isArray(result['analyzed']) ? result['analyzed'] : [];
  const totalModels = Number(result['total_models'] ?? NaN);
  if (Number.isFinite(totalModels) && analyzed.length < totalModels) {
    flags.push({
      rule: 'incomplete-model-analysis',
      severity: 'medium',
      title: `analyze covered ${analyzed.length} of ${totalModels} models`,
      detail:
        'Criteria derived from the analyze job rest on a partial view of the ' +
        'trials. Any per-model conclusion is weaker than it looks.',
      evidence: [
        `analyze.total_models=${totalModels}`,
        `analyze.analyzed.length=${analyzed.length}`,
        ...analyzed.flatMap((a) =>
          isRecord(a) ? [`analysed: ${String(a['model'] ?? a['agent'] ?? '?')}`] : [],
        ),
      ],
    });
  }

  for (const entry of analyzed) {
    if (!isRecord(entry)) continue;
    const model = String(entry['model'] ?? entry['agent'] ?? '?');
    const findings = isRecord(entry['findings']) ? entry['findings'] : {};
    for (const [rawId, outcome] of Object.entries(findings)) {
      if (String(outcome).toLowerCase() !== 'failed') continue;
      const verdict = resolveVerdict(session, rawId);
      if (!verdict || isFailingValue(verdict.value)) continue;
      flags.push({
        rule: 'analyze-model-contradiction',
        severity: 'medium',
        criterionId: verdict.criterionId,
        title: `${describe(verdict)} reads ${verdict.value} but failed for ${model}`,
        detail:
          `The analyze job recorded \`${rawId}: failed\` for ${model}. Confirm ` +
          'against that trial\'s test-stdout before marking TQA valid.',
        evidence: [
          `model=${model}`,
          `analyze.findings.${rawId}=failed`,
          `verdict.value=${verdict.value}`,
        ],
      });
    }
  }

  return flags;
}

/** Cards with no verdict, and verdicts with no card. */
function auditCardCoverage({ session }: AuditContext): AuditFlag[] {
  const flags: AuditFlag[] = [];

  for (const rubric of RUBRICS) {
    if (session.verdicts.has(rubric.id)) continue;
    flags.push({
      rule: 'no-autoqa-verdict',
      severity: rubric.extraAttention ? 'high' : 'medium',
      criterionId: rubric.id,
      title: `${rubric.n}. ${rubric.title} has no TQA finding`,
      detail:
        'TQA did not run this criterion. Record N/A for TQA validity rather than ' +
        'inventing a label, but still assess the task rubric for the final decision.',
      evidence: ['absent from every jobsByCommand[*].verdicts'],
    });
  }

  for (const verdict of session.verdicts.values()) {
    if (RUBRIC_BY_ID.has(verdict.criterionId)) continue;
    if (EXTRA_GATE_IDS.has(verdict.criterionId)) continue;
    flags.push({
      rule: 'unknown-criterion',
      severity: 'low',
      criterionId: verdict.criterionId,
      title: `Verdict \`${verdict.criterionId}\` maps to no known rubric`,
      detail:
        'Either the rubric set has changed or this is a gate rather than a ' +
        'reviewable card. Worth confirming against the portal.',
      evidence: [`job=${verdict.command}`, `value=${verdict.value}`],
    });
  }

  return flags;
}

/** Gaps in the reviewer's own marks, judged against the spec's requirements. */
function auditReviewerMarks({ session }: AuditContext): AuditFlag[] {
  const flags: AuditFlag[] = [];

  const unmarked = RUBRICS.filter((r) => !session.marks.has(r.id));
  if (unmarked.length) {
    flags.push({
      rule: 'unmarked-criteria',
      severity: 'low',
      title: `${unmarked.length} of ${RUBRICS.length} criteria are unmarked`,
      detail: unmarked.map((r) => `${r.n}. ${r.title}`).join('; '),
      evidence: unmarked.map((r) => r.id),
    });
  }

  for (const mark of session.marks.values()) {
    const rubric = RUBRIC_BY_ID.get(mark.criterionId);
    const label = rubric
      ? `${rubric.n}. ${rubric.title}`
      : mark.criterionId;

    // Portal accept means the reviewer judged the TQA finding valid. A comment
    // should explain why, even when TQA's underlying rubric label is non-passing.
    if (
      mark.decision === 'accept' &&
      isFailingValue(mark.autoValue) &&
      mark.autoValue !== 'PENDING' &&
      !mark.comment.trim()
    ) {
      flags.push({
        rule: 'accepted-nonpass-without-comment',
        severity: 'high',
        criterionId: mark.criterionId,
        title: `${label} marked portal PASS for TQA ${mark.autoValue} with no comment`,
        detail:
          'Portal PASS says the human found TQA valid. The comment is empty, so ' +
          'the evidence supporting TQA\'s label and material reason is missing.',
        evidence: [`autoValue=${mark.autoValue}`, 'comment=""'],
      });
    }

    if (mark.autoValue === 'PENDING') {
      flags.push({
        rule: 'marked-while-pending',
        severity: 'medium',
        criterionId: mark.criterionId,
        title: `${label} was marked while TQA was still PENDING`,
        detail:
          'The label was not final when the mark was made, so the mark may ' +
          'not reflect the finished analysis.',
        evidence: [`decision=${mark.decision}`, 'autoValue=PENDING'],
      });
    }
  }

  return flags;
}

/** `analyze` uses slightly different ids than the criterion set (near_miss vs near_misses). */
function resolveVerdict(session: Session, rawId: string): Verdict | undefined {
  return (
    session.verdicts.get(rawId) ??
    session.verdicts.get(`${rawId}es`) ??
    session.verdicts.get(`${rawId}s`) ??
    session.verdicts.get(rawId.replace(/e?s$/, ''))
  );
}

function describe(verdict: Verdict): string {
  const rubric = RUBRIC_BY_ID.get(verdict.criterionId);
  return rubric ? `${rubric.n}. ${rubric.title}` : verdict.criterionId;
}

function quote(s: string, max = 200): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return JSON.stringify(t.length > max ? `${t.slice(0, max)}…` : t);
}

function toStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String) : [];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

function bySeverityThenCriterion(a: AuditFlag, b: AuditFlag): number {
  const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
  if (s !== 0) return s;
  const an = a.criterionId ? RUBRIC_BY_ID.get(a.criterionId)?.n ?? 99 : 0;
  const bn = b.criterionId ? RUBRIC_BY_ID.get(b.criterionId)?.n ?? 99 : 0;
  return an - bn;
}
