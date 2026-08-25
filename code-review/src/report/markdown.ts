/**
 * Renders a review draft: the 49 criteria, what AutoQA said, what the audit
 * found, and a shortlist of what needs a human decision.
 *
 * The draft is for reading and copying from. Nothing here is submitted.
 */

import { RUBRICS, RUBRIC_BY_ID, isFailingValue } from '../rubrics/rubrics.ts';
import type { Session } from '../package/session.ts';
import type { TrialIndex } from '../package/trials.ts';
import type { AuditFlag, Severity } from '../audit/rules.ts';
import type { ClaimCheck, ReviewerAgent } from '../package/reviewerAgent.ts';
import type { ClaimReport } from '../audit/claims.ts';

export interface ReportInput {
  slug: string;
  session: Session;
  trials: TrialIndex;
  flags: AuditFlag[];
  reviewerAgent: ReviewerAgent | null;
  claimChecks: ClaimCheck[];
  /** Verification of the concrete assertions AutoQA made in its reasoning. */
  autoqaClaims: ClaimReport | null;
}

export function renderReport(input: ReportInput): string {
  const { slug, session, trials, flags, reviewerAgent, claimChecks } = input;
  const byCriterion = groupByCriterion(flags);
  const out: string[] = [];

  out.push(`# Review draft — ${slug}`, '');
  out.push(...renderHeader(session, trials, flags, reviewerAgent), '');
  out.push(...renderAttention(flags, byCriterion), '');
  out.push(...renderReviewerAgent(reviewerAgent, claimChecks), '');
  out.push(...renderTable(session, byCriterion), '');
  out.push(...renderDetails(session, byCriterion), '');
  out.push(...renderVerdictBlock(session, trials, flags, reviewerAgent), '');
  return out.join('\n');
}

/** The Reviewer Agent's own position, and whether its claims check out. */
function renderReviewerAgent(
  ra: ReviewerAgent | null,
  claimChecks: ClaimCheck[],
): string[] {
  if (!ra) {
    return [
      '## Reviewer Agent',
      '',
      'Not found in this package. The spec expects its verdict to be evaluated',
      'independently, so read it in the portal and fold it into the write-up.',
    ];
  }

  const out = [
    '## Reviewer Agent',
    '',
    `Verdict: **${ra.verdict}**`,
    '',
    `Source: \`${ra.markdownPath.split('/').slice(-3).join('/')}\``,
    '',
  ];

  if (ra.verdictTable.length) {
    out.push(
      '| Signal | TQA | Stance | Confidence |',
      '| --- | --- | --- | --- |',
      ...ra.verdictTable.map(
        (r) =>
          `| ${r.signal} | ${r.tqa.replace(/\|/g, '\\|')} | ${r.stance} | ${r.confidence ?? '—'} |`,
      ),
      '',
    );
  }

  const failed = claimChecks.filter((c) => !c.holds);
  if (failed.length) {
    out.push(
      `### Claims that do not check out (${failed.length})`,
      '',
      'The spec requires unsupported Reviewer Agent statements to be called out',
      'explicitly. Each of these was compared against the shipped task files.',
      '',
    );
    for (const c of failed) {
      out.push(
        `- \`${c.file}\` — claimed ${c.expected}, actual ` +
          `${c.actual === null ? '**file not found**' : `\`${c.actual}\``}`,
        `  > ${c.claim}`,
      );
    }
    out.push('');
  } else if (claimChecks.length === 0) {
    out.push('No precisely falsifiable file claims were found to check.', '');
  }

  return out;
}

function renderHeader(
  session: Session,
  trials: TrialIndex,
  flags: AuditFlag[],
  reviewerAgent: ReviewerAgent | null,
): string[] {
  const perModel = [...trials.byModel.entries()]
    .map(([m, ts]) => `${m} ${ts.filter((t) => t.solved).length}/${ts.length}`)
    .join(', ');
  const counts = countSeverities(flags);

  return [
    '## At a glance',
    '',
    `- Task id: \`${session.taskId}\``,
    `- Portal status: ${session.status}` +
      (session.decision ? ` (decision: ${session.decision})` : ''),
    `- Criteria marked: ${session.marks.size}/${RUBRICS.length}`,
    `- AutoQA verdicts present: ${session.verdicts.size}`,
    `- Reviewer Agent verdict: ${reviewerAgent ? `**${reviewerAgent.verdict}**` : 'not in package'}`,
    `- Trials solved: ${trials.solved}/${trials.total}` +
      (perModel ? ` — ${perModel}` : ''),
    `- Audit flags: ${counts.high} high, ${counts.medium} medium, ${counts.low} low`,
    `- Reviewer focus time recorded: ${formatDuration(session.focusSeconds)}`,
  ];
}

/** The shortlist: what a human actually has to decide. */
function renderAttention(
  flags: AuditFlag[],
  byCriterion: Map<string, AuditFlag[]>,
): string[] {
  const out = ['## Needs your attention', ''];
  const notable = flags.filter((f) => f.severity !== 'low');

  if (notable.length === 0) {
    out.push(
      'No high or medium flags. Every verdict carried findings or substantive',
      'reasoning, and nothing contradicted the trial outcomes.',
    );
    return out;
  }

  out.push(
    `${notable.length} item(s) below are where the evidence does not support`,
    'the label, or where the label rests on something other than the task.',
    '',
  );

  for (const flag of notable) {
    const where = flag.criterionId
      ? `\`${flag.criterionId}\``
      : '_task-wide_';
    out.push(
      `### [${flag.severity.toUpperCase()}] ${flag.title}`,
      '',
      `- Criterion: ${where}`,
      `- Rule: \`${flag.rule}\``,
      '',
      flag.detail,
      '',
      '```',
      ...flag.evidence,
      '```',
      '',
    );
  }

  void byCriterion;
  return out;
}

function renderTable(
  session: Session,
  byCriterion: Map<string, AuditFlag[]>,
): string[] {
  const out = [
    '## All 49 criteria',
    '',
    '| # | Criterion | AutoQA | Your mark | Evidence | Flags |',
    '| --: | --- | --- | --- | --- | --- |',
  ];

  for (const rubric of RUBRICS) {
    const verdict = session.verdicts.get(rubric.id);
    const mark = session.marks.get(rubric.id);
    const flags = byCriterion.get(rubric.id) ?? [];

    const auto = verdict
      ? isFailingValue(verdict.value)
        ? `**${verdict.value}**`
        : verdict.value
      : '—';
    const marked = mark
      ? mark.decision + (mark.comment.trim() ? ' +note' : '')
      : '_unmarked_';
    const evidence = verdict
      ? verdict.findings.length
        ? `${verdict.findings.length} finding(s)`
        : verdict.provenance === 'autogen'
          ? 'autogen'
          : 'none'
      : '—';
    const flagCell = flags.length
      ? flags.map((f) => severityMark(f.severity)).join('')
      : '';

    out.push(
      `| ${rubric.n} | ${rubric.title}${rubric.extraAttention ? ' \\*' : ''} ` +
        `| ${auto} | ${marked} | ${evidence} | ${flagCell} |`,
    );
  }

  out.push(
    '',
    '`\\*` = the spec singles this rubric out for extra attention. ' +
      'Flags: ● high, ◐ medium, ○ low.',
  );
  return out;
}

/** AutoQA's own reasoning per flagged criterion, so it can be checked. */
function renderDetails(
  session: Session,
  byCriterion: Map<string, AuditFlag[]>,
): string[] {
  // Anything flagged above `low`, plus every non-passing verdict — those carry
  // AutoQA's structured evidence and always need a decision.
  const ids = [
    ...new Set([
      ...[...byCriterion.keys()].filter((id) =>
        byCriterion.get(id)?.some((f) => f.severity !== 'low'),
      ),
      ...[...session.verdicts.values()]
        .filter((v) => isFailingValue(v.value) && v.value !== 'PENDING')
        .map((v) => v.criterionId),
    ]),
  ].sort((a, b) => (RUBRIC_BY_ID.get(a)?.n ?? 99) - (RUBRIC_BY_ID.get(b)?.n ?? 99));

  if (!ids.length) return [];

  const out = [
    '## What AutoQA said, for the flagged criteria',
    '',
    'Verify each claim against the task files before accepting or contesting it.',
    '',
  ];

  for (const id of ids) {
    const verdict = session.verdicts.get(id);
    const rubric = RUBRIC_BY_ID.get(id);
    const title = rubric ? `${rubric.n}. ${rubric.title}` : id;

    out.push(`### ${title}`, '');
    if (rubric) out.push(`_Rubric intent:_ ${rubric.intent}`, '');
    if (!verdict) {
      out.push('No AutoQA verdict exists for this criterion.', '');
      continue;
    }

    out.push(
      `- Value: **${verdict.value}** (job \`${verdict.command}\`` +
        `${verdict.provenance ? `, provenance ${verdict.provenance}` : ''})`,
    );
    if (verdict.summary) out.push(`- Summary: ${verdict.summary}`);
    if (verdict.reasoning && verdict.reasoning !== verdict.summary) {
      out.push(`- Reasoning: ${verdict.reasoning}`);
    }
    out.push('');

    for (const finding of verdict.findings) {
      out.push(
        `**Finding: ${finding.title ?? finding.id ?? '(untitled)'}**` +
          (finding.severity ? ` — severity ${finding.severity}` : ''),
        '',
      );
      if (finding.summary) out.push(finding.summary, '');
      const passages = extractPassages(finding.details);
      for (const p of passages) {
        out.push(
          `- \`${p.where}\` — ${p.why}`,
          p.quote ? `  > ${p.quote}` : '',
        );
      }
      if (passages.length) out.push('');
    }
  }

  return out;
}

interface Passage {
  where: string;
  why: string;
  quote: string;
}

/**
 * AutoQA's structured findings vary by check, but the useful ones consistently
 * carry quoted passages with a reason. Pull those out where present.
 */
function extractPassages(details: Record<string, unknown> | undefined): Passage[] {
  if (!details) return [];
  const raw = details['offending_passages'];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((p) => {
    if (typeof p !== 'object' || p === null) return [];
    const o = p as Record<string, unknown>;
    return [
      {
        where: String(o['line_hint'] ?? o['sub_criterion'] ?? 'unspecified'),
        why: String(o['why'] ?? ''),
        quote: String(o['quoted_text'] ?? '').replace(/\s+/g, ' ').trim(),
      },
    ];
  });
}

/** A starting point in the spec's required comment format. */
function renderVerdictBlock(
  session: Session,
  trials: TrialIndex,
  flags: AuditFlag[],
  reviewerAgent: ReviewerAgent | null,
): string[] {
  const high = flags.filter((f) => f.severity === 'high');
  const contest = high
    .filter((f) => f.criterionId)
    .map((f) => `  - ${f.criterionId}: ${f.title}`);
  const raClaims = high.filter((f) =>
    f.rule.startsWith('reviewer-agent-'),
  );

  return [
    '## Draft review comment',
    '',
    'Skeleton in the format the spec requires. Fill in your own analysis —',
    'the evidence lines are generated, the judgement is not.',
    '',
    '```',
    'Review:',
    `TQA Status: ${session.verdicts.size} verdicts, ` +
      `${[...session.verdicts.values()].filter((v) => isFailingValue(v.value)).length}` +
      ' non-passing. <your feedback on the TQA outcome>',
    `Reviewer Agent Status: ${
      reviewerAgent
        ? `verdict "${reviewerAgent.verdict}"` +
          (raClaims.length
            ? `. ${raClaims.length} statement(s) do not hold against the shipped ` +
              'files — see below. <your feedback>'
            : '. <your feedback>')
        : '<not in the package — read it in the portal>'
    }`,
    ...raClaims.map((f) => `  - ${f.title}`),
    'My Analysis: <accept or fail, and why>',
    'Evidence for your analysis:',
    ...(contest.length ? contest : ['  - <cite test case, line range, trajectory>']),
    `  - Trials: ${trials.solved}/${trials.total} solved` +
      [...trials.byModel.entries()]
        .map(([m, ts]) => `, ${m} ${ts.filter((t) => t.solved).length}/${ts.length}`)
        .join(''),
    'Final Verdict: <...>',
    'Fixes:',
    '  - <what would make this task shippable>',
    '```',
  ];
}

function groupByCriterion(flags: AuditFlag[]): Map<string, AuditFlag[]> {
  const out = new Map<string, AuditFlag[]>();
  for (const f of flags) {
    if (!f.criterionId) continue;
    const list = out.get(f.criterionId) ?? [];
    list.push(f);
    out.set(f.criterionId, list);
  }
  return out;
}

function countSeverities(flags: AuditFlag[]): Record<Severity, number> {
  const out: Record<Severity, number> = { high: 0, medium: 0, low: 0 };
  for (const f of flags) out[f.severity]++;
  return out;
}

function severityMark(s: Severity): string {
  return s === 'high' ? '●' : s === 'medium' ? '◐' : '○';
}

function formatDuration(seconds: number): string {
  if (!seconds) return 'none';
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
}
