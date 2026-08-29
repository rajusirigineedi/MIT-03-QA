/**
 * Builds the evidence dossier for an independent second-round review.
 *
 * The audit report answers "did AutoQA show its work?". This answers the prior
 * question: it collects the 49 AutoQA criteria and recorded trial facts without
 * embedding the task files themselves.
 */

import type { Session, Verdict } from '../package/session.ts';
import type { TrialIndex } from '../package/trials.ts';
import type { TrialFailure } from '../audit/nearmiss.ts';
import type { TimingReport } from './timing.ts';
import { summarizeTiming } from './timing.ts';
import {
  BATCH_ORDER,
  BATCH_READS,
  BATCH_TITLE,
  evidenceByBatch,
} from './evidence.ts';
import { RUBRICS } from '../rubrics/rubrics.ts';

export interface DossierInput {
  slug: string;
  session: Session;
  trials: TrialIndex;
  timing: TimingReport;
  failures: TrialFailure[];
}

export function renderDossier(input: DossierInput): string {
  const { slug, session, trials, timing, failures } = input;
  const out: string[] = [];

  out.push(`# TQA review evidence — ${slug}`);
  out.push('');
  out.push(
    'Everything needed to judge all 49 criteria independently. TQA\'s verdict',
    'is shown for each, but it is an input to check, not a starting point to trust.',
  );
  out.push('');

  out.push(...measuredFacts(session, trials, timing));
  out.push(...trialTable(timing));
  out.push(...failureEvidence(failures));
  out.push(...criteriaSections(session));
  out.push(...outputContract());

  return out.join('\n');
}

function measuredFacts(
  session: Session,
  trials: TrialIndex,
  timing: TimingReport,
): string[] {
  const out = ['## Measured facts', ''];
  out.push(
    'Recorded outcomes, not claims. Any criterion contradicting these is wrong',
    'regardless of its reasoning.',
    '',
  );

  const solveRate =
    trials.total > 0
      ? `${trials.solved}/${trials.total} (${((trials.solved / trials.total) * 100).toFixed(0)}%)`
      : 'no trials found';
  out.push(`- Honest-agent solve rate: ${solveRate}`);

  for (const [model, list] of trials.byModel) {
    const solved = list.filter((t) => t.solved).length;
    out.push(`  - ${model}: ${solved}/${list.length}`);
  }

  out.push(`- Budgets and usage: ${summarizeTiming(timing)}`);

  const gates = ['task_solvability', 'noop_fails_verifier', 'anti_cheat_robustness'];
  for (const id of gates) {
    const v = session.verdicts.get(id);
    if (v) out.push(`- ${id}: TQA recorded ${v.value ?? 'no value'}`);
  }
  out.push('');
  return out;
}

function trialTable(timing: TimingReport): string[] {
  if (!timing.trials.length) return [];
  const out = ['## Trial durations', ''];
  out.push('| model | attempt | solved | agent exec | % of budget | verifier | % of budget |');
  out.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const t of timing.trials) {
    out.push(
      `| ${t.model} | ${t.attempt} | ${t.solved ? 'yes' : 'no'} | ` +
      `${sec(t.agentExecutionSec)} | ${pct(t.agentBudgetUsed)} | ` +
      `${sec(t.verifierSec)} | ${pct(t.verifierBudgetUsed)} |`,
    );
  }
  out.push('');
  return out;
}

function failureEvidence(failures: TrialFailure[]): string[] {
  if (!failures.length) {
    return [
      '## Failing trials',
      '',
      '_No failing trial output found. Criteria about false negatives, near',
      'misses, and the difficulty crux have no observed failures to reason from;',
      'say so rather than inferring._',
      '',
    ];
  }

  const out = ['## Failing trials — what actually failed', ''];
  out.push(
    'Read these against the test source below. For each, decide whether the',
    'agent was wrong or the assertion was.',
    '',
    'Read the margins carefully: a relative margin is only as meaningful as its',
    'denominator. An assertion comparing aggregate counts (clusters, rows, totals)',
    'can be off by a fraction of a percent while representing a wholly wrong',
    'answer on the concept under test. Convert the margin into units the task',
    'cares about before calling anything a near miss.',
    '',
  );

  for (const f of failures) {
    out.push(`### ${f.trial.model} / ${f.trial.attempt}`);
    out.push('');
    if (f.summary) out.push(`- pytest: ${f.summary}`);
    if (f.failed.length) out.push(`- failed: ${f.failed.join(', ')}`);
    if (f.passedCount !== null || f.failedCount !== null) {
      out.push(
        `- assertion counts: ${f.passedCount ?? '?'} passed, ${f.failedCount ?? '?'} failed`,
      );
    }
    for (const m of f.margins) {
      out.push(
        `- margin: got ${m.actual}, expected ${m.expected} ` +
        `(off by ${(m.relative * 100).toFixed(2)}%) — \`${m.source}\``,
      );
    }
    if (f.closest) {
      out.push(
        `- closest miss: ${(f.closest.relative * 100).toFixed(2)}% off`,
      );
    }
    out.push('');
  }
  return out;
}

function criteriaSections(session: Session): string[] {
  const out = ['## The 49 criteria', ''];
  out.push(
    'Grouped by the evidence they draw on. Work one group at a time: read its',
    'sources once, then decide every criterion in it.',
    '',
  );

  for (const batch of BATCH_ORDER) {
    const specs = evidenceByBatch(batch);
    if (!specs.length) continue;

    out.push(`### ${BATCH_TITLE[batch]} (${specs.length} criteria)`);
    out.push('');
    out.push(`_Sources: ${BATCH_READS[batch]}_`);
    out.push('');

    for (const spec of specs) {
      const { rubric } = spec;
      const v = session.verdicts.get(rubric.id);
      out.push(
        `#### ${rubric.n}. ${rubric.title} \`${rubric.id}\`` +
        (rubric.extraAttention ? ' — EXTRA ATTENTION' : ''),
      );
      out.push('');
      out.push(`- Intent: ${rubric.intent}`);
      out.push(`- TQA: **${v?.value ?? 'no verdict'}**`);
      if (v) out.push(`- TQA reasoning: ${quote(v)}`);
      out.push(`- Check independently: ${spec.check}`);
      out.push('');
    }
  }
  return out;
}

function outputContract(): string[] {
  return [
    '## Required output',
    '',
    'Write one section for each of the six evidence groups above. Account for',
    'all 49 criteria by naming the criterion numbers and ids covered in each',
    'group. Reuse a check when several criteria depend on the same evidence.',
    'List separate notes only for exceptions, disagreements, or distinct defects.',
    '',
    'Rules:',
    '',
    '- Reach your own conclusion before comparing it with TQA.',
    '- Cite an output file and line, a measured number with its meaning, or a',
    '  named selected attempt. "Looks fine" is not evidence.',
    '- Use unverifiable when the prepared output lacks required evidence. Name',
    '  what is missing.',
    '- Use short, plain sentences. Say what you opened and what you saw. Use "I"',
    '  for your checks. Do not use em dashes.',
    '- Explain what a number means in task terms. Include its denominator or',
    '  practical impact.',
    '- Give extra attention to false positives, false negatives, instruction',
    '  clarity, instruction-test alignment, coverage, and measured results.',
    '- Check every test and assertion in both directions before reporting no',
    '  false positives or false negatives. Cite exact instruction and test lines.',
    '- Do not recursively read the whole out folder or task output. Open only',
    '  files needed for the current evidence group.',
    '- Treat data, input, dataset, fixture, large artifact, and binary contents',
    '  as metadata-only by default. Use only a bounded sample for a named edge case.',
    '- Return plain Markdown only. Do not create a canvas, app, dashboard, or',
    '  other presentation layer.',
    '- Never submit anything. The reviewer reads the grouped findings and decides.',
    '',
  ];
}

function quote(v: Verdict): string {
  const text = (v.reasoning ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '_none recorded_';
  return text.length > 600 ? `${text.slice(0, 600)}…` : text;
}


function sec(v: number | null): string {
  return v === null ? '?' : `${v.toFixed(0)}s`;
}

function pct(v: number | null): string {
  return v === null ? '?' : `${(v * 100).toFixed(0)}%`;
}

/** Criteria with no AutoQA verdict at all — nothing to agree or disagree with. */
export function missingVerdicts(session: Session): string[] {
  return RUBRICS.filter((r) => !session.verdicts.has(r.id)).map((r) => r.id);
}
