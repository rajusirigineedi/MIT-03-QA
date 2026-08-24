/**
 * Builds the evidence dossier for an independent second-round review.
 *
 * The audit report answers "did AutoQA show its work?". This answers the prior
 * question: it puts everything needed to decide all 49 criteria from scratch
 * into one document, grouped so each source is read once, with AutoQA's claim
 * placed next to the evidence that would confirm or refute it.
 *
 * Data files are sampled rather than inlined; a 40k-row fixture contributes
 * nothing to a judgement that its head and row count do not.
 */

import type { Session, Verdict } from '../package/session.ts';
import type { TrialIndex } from '../package/trials.ts';
import type { TaskCorpus } from '../package/taskfiles.ts';
import type { ReviewerAgent } from '../package/reviewerAgent.ts';
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

/** Source files worth reading in full, in the order a reviewer wants them. */
const SOURCE_ORDER = [
  'instruction.md',
  'task.toml',
  'tests/test_outputs.py',
  'tests/test.sh',
  'tests/run-tests.sh',
  'tests/Dockerfile',
  'solution/solve.sh',
  'environment/Dockerfile',
  'README.md',
];

const DATA_EXT = /\.(jsonl|json|csv|tsv|txt|ndjson|parquet|db|sqlite)$/i;

/** Per-file inline cap. Beyond this a file is sampled. */
const MAX_LINES = 500;
/** Rows shown from a data file. */
const SAMPLE_ROWS = 6;

export interface DossierInput {
  slug: string;
  session: Session;
  trials: TrialIndex;
  corpus: TaskCorpus | null;
  timing: TimingReport;
  failures: TrialFailure[];
  reviewerAgent: ReviewerAgent | null;
}

export function renderDossier(input: DossierInput): string {
  const { slug, session, trials, corpus, timing, failures, reviewerAgent } =
    input;
  const out: string[] = [];

  out.push(`# Second-round review dossier — ${slug}`);
  out.push('');
  out.push(
    'Everything needed to judge all 49 criteria independently. AutoQA\'s verdict',
    'is shown for each, but it is an input to check, not a starting point to trust.',
  );
  out.push('');

  out.push(...measuredFacts(session, trials, timing));
  out.push(...trialTable(timing));
  out.push(...failureEvidence(failures));
  out.push(...taskFiles(corpus));
  out.push(...criteriaSections(session));
  out.push(...reviewerAgentSection(reviewerAgent));
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
    if (v) out.push(`- ${id}: AutoQA recorded ${v.value ?? 'no value'}`);
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

function taskFiles(corpus: TaskCorpus | null): string[] {
  if (!corpus) return ['## Task files', '', '_Task directory not found._', ''];

  const out = ['## Task files', ''];
  const seen = new Set<string>();

  const ordered = [
    ...SOURCE_ORDER.filter((p) => corpus.files.has(p)),
    ...[...corpus.files.keys()]
      .filter((p) => !SOURCE_ORDER.includes(p))
      .sort(),
  ];

  for (const path of ordered) {
    if (seen.has(path)) continue;
    seen.add(path);
    const content = corpus.files.get(path);
    if (content === undefined) continue;

    const lines = content.split('\n');
    const isData = DATA_EXT.test(path) && lines.length > MAX_LINES;

    const shown = isData
      ? lines.slice(0, SAMPLE_ROWS)
      : lines.slice(0, MAX_LINES);
    const fence = fenceFor(content);

    out.push(`### \`${path}\``);
    out.push('');
    if (isData) {
      out.push(`_${lines.length} lines; first ${SAMPLE_ROWS} shown._`);
      out.push('');
    } else if (lines.length > MAX_LINES) {
      out.push(`_${lines.length} lines; first ${MAX_LINES} shown._`);
      out.push('');
    }
    out.push(fence + (isData ? '' : lang(path)));
    out.push(...trimTrailing(shown));
    out.push(fence);
    out.push('');
  }

  const unread = [...corpus.paths].filter((p) => !corpus.files.has(p));
  if (unread.length) {
    out.push('### Files present but not inlined (binary or oversized)');
    out.push('');
    for (const p of unread.sort()) out.push(`- \`${p}\``);
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
      out.push(`- AutoQA: **${v?.value ?? 'no verdict'}**`);
      if (v) out.push(`- AutoQA reasoning: ${quote(v)}`);
      out.push(`- Check independently: ${spec.check}`);
      out.push('');
    }
  }
  return out;
}

function reviewerAgentSection(ra: ReviewerAgent | null): string[] {
  if (!ra) return [];
  const out = ['## Reviewer Agent (third opinion, also unverified)', ''];
  out.push(`- Overall verdict: **${ra.verdict}**`);
  out.push(`- Signals: ${ra.verdictTable.length}`);
  out.push('');
  if (ra.annotations.length) {
    out.push('Annotations:');
    out.push('');
    for (const a of ra.annotations) {
      const body = [a.why_fair, a.derivation, a.comment]
        .filter((s): s is string => Boolean(s))
        .join(' — ');
      out.push(`- ${a.test ?? a.file}: ${body || '_no detail_'}`);
    }
    out.push('');
  }
  return out;
}

function outputContract(): string[] {
  return [
    '## Required output',
    '',
    'Produce one row per criterion, all 49, in this shape:',
    '',
    '| # | id | AutoQA | My verdict | Agree? | Evidence | Note |',
    '',
    'Rules:',
    '',
    '- `My verdict` is reached from the evidence above, independently. Reaching',
    '  the same conclusion as AutoQA is fine; adopting it without checking is not.',
    '- `Evidence` cites a file and line, a measured number, or a named trial.',
    '  "Looks fine" is not evidence.',
    '- `Agree?` is agree / disagree / unverifiable. Use unverifiable when the',
    '  package genuinely lacks what the criterion needs, and say what is missing.',
    '- `Note` is the text to paste into the portal: one or two sentences stating',
    '  what was checked and what was found.',
    '- Never submit anything. The reviewer reads these rows and decides.',
    '',
  ];
}

function quote(v: Verdict): string {
  const text = (v.reasoning ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '_none recorded_';
  return text.length > 600 ? `${text.slice(0, 600)}…` : text;
}

/** A fence longer than any backtick run in the content, so markdown survives. */
function fenceFor(content: string): string {
  let longest = 0;
  for (const m of content.matchAll(/`+/g)) longest = Math.max(longest, m[0].length);
  return '`'.repeat(Math.max(3, longest + 1));
}

function trimTrailing(lines: string[]): string[] {
  const out = [...lines];
  while (out.length && out[out.length - 1]!.trim() === '') out.pop();
  return out;
}

function lang(path: string): string {
  if (path.endsWith('.py')) return 'python';
  if (path.endsWith('.sh')) return 'bash';
  if (path.endsWith('.toml')) return 'toml';
  if (path.endsWith('.md')) return 'markdown';
  if (path.endsWith('.json')) return 'json';
  if (path.toLowerCase().includes('dockerfile')) return 'dockerfile';
  return '';
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
