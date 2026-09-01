/**
 * Builds the evidence dossier for an independent second-round review.
 *
 * The audit report answers "did TQA show its work?". This answers the prior
 * question: it collects the 49 TQA criteria and recorded trial facts without
 * embedding the task files themselves. The reviewer first assesses the task,
 * then decides whether each TQA finding is valid.
 */

import type { Session } from '../package/session.ts';
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
import { isFailingValue, RUBRICS } from '../rubrics/rubrics.ts';

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
    'Everything needed to assess all 49 criteria independently, then decide',
    'whether each TQA label and its material reasoning are valid.',
  );
  out.push('');

  out.push(...reviewFocus(session));
  out.push(...measuredFacts(session, trials, timing));
  out.push(...trialTable(timing));
  out.push(...failureEvidence(failures));
  out.push(...criteriaSections(session));

  return out.join('\n');
}

function reviewFocus(session: Session): string[] {
  const nonPassing = RUBRICS.filter((rubric) => {
    const value = session.verdicts.get(rubric.id)?.value;
    return value !== 'PENDING' && isFailingValue(value);
  });

  const out = [
    '## Review focus',
    '',
    'Deep-check the TQA non-passing results and every EXTRA ATTENTION card.',
    'For a normal TQA PASS, check the main requirement and keep it when it holds.',
    'Do not invent a failure for a harmless style, structure, or wording choice.',
    '',
  ];

  if (!nonPassing.length) {
    out.push('- TQA non-passing results: none', '');
    return out;
  }

  out.push('TQA non-passing results:', '');
  for (const rubric of nonPassing) {
    const value = session.verdicts.get(rubric.id)?.value ?? 'no result';
    out.push(`- ${rubric.title} (\`${rubric.id}\`): ${value}`);
  }
  out.push('');
  return out;
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
        `#### ${rubric.title} (\`${rubric.id}\`)` +
        (rubric.extraAttention ? ' — EXTRA ATTENTION' : ''),
      );
      out.push('');
      out.push(`- Intent: ${rubric.intent}`);
      out.push(`- TQA: **${v?.value ?? 'no verdict'}**`);
      if (v?.summary) out.push(`- TQA summary: ${clean(v.summary)}`);
      if (v?.reasoning) out.push(`- TQA reasoning: ${clean(v.reasoning)}`);
      if (v?.findings.length) {
        out.push('- TQA structured findings:');
        out.push('```json');
        out.push(JSON.stringify(v.findings, null, 2));
        out.push('```');
      }
      out.push('');
    }
  }
  return out;
}

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function sec(v: number | null): string {
  return v === null ? '?' : `${v.toFixed(0)}s`;
}

function pct(v: number | null): string {
  return v === null ? '?' : `${(v * 100).toFixed(0)}%`;
}

/** Criteria with no TQA finding at all: there is nothing to validate. */
export function missingVerdicts(session: Session): string[] {
  return RUBRICS.filter((r) => !session.verdicts.has(r.id)).map((r) => r.id);
}
