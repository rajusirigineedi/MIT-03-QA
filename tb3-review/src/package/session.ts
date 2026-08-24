/**
 * Parses the review-session JSON.
 *
 * Two things live in here and must not be conflated:
 *
 *   `jobsByCommand[cmd].verdicts[]`  what AutoQA concluded, with its reasoning
 *   `rubric[criterionId]`            what the human reviewer marked
 *
 * A criterion can appear in one and not the other: `honest_agent_trial` has a
 * verdict but is not a reviewable card, and `readme_provides_context` is a card
 * with no AutoQA verdict at all.
 */

export interface Finding {
  id?: string;
  title?: string;
  summary?: string;
  severity?: string | null;
  details?: Record<string, unknown>;
}

export interface Verdict {
  criterionId: string;
  /** PASS | FAIL | HIGH | MOD | LOW | NA | PENDING */
  value: string;
  summary?: string;
  /** The rubric definition text shown on the card. */
  detail?: string;
  reasoning?: string;
  findings: Finding[];
  /** `autogen` marks a verdict generated without a dedicated analysis. */
  provenance?: string;
  /** Which job produced it. */
  command: string;
}

export interface Mark {
  criterionId: string;
  /** `accept` | `reject` */
  decision: string;
  comment: string;
  /** The AutoQA value the portal showed when the mark was made. */
  autoValue: string;
}

export interface Job {
  command: string;
  status?: string;
  reward?: number | null;
  cached?: boolean;
  feedback?: string | null;
  error?: unknown;
  result?: Record<string, unknown>;
  logs?: unknown[];
  verdicts: Verdict[];
}

export interface Session {
  taskId: string;
  status: string;
  decision: string | null;
  overallVerdict: string | null;
  /** Seconds the portal recorded the reviewer as focused on this task. */
  focusSeconds: number;
  updatedAt?: string;
  prefilledFromReport?: boolean;
  prefillVersion?: string;

  verdicts: Map<string, Verdict>;
  marks: Map<string, Mark>;
  jobs: Map<string, Job>;
}

export function parseSession(raw: unknown): Session {
  const o = asObject(raw);

  const jobs = new Map<string, Job>();
  const verdicts = new Map<string, Verdict>();

  for (const [command, jobRaw] of Object.entries(
    asObject(o['jobsByCommand'] ?? {}),
  )) {
    const j = asObject(jobRaw);
    const jobVerdicts = asArray(j['verdicts']).map((v) =>
      parseVerdict(v, command),
    );
    jobs.set(command, {
      command,
      status: str(j['status']),
      reward: typeof j['reward'] === 'number' ? j['reward'] : null,
      cached: j['cached'] === true,
      feedback: str(j['feedback']) ?? null,
      error: j['error'],
      result: isObject(j['result']) ? j['result'] : undefined,
      logs: asArray(j['logs']),
      verdicts: jobVerdicts,
    });
    for (const v of jobVerdicts) verdicts.set(v.criterionId, v);
  }

  const marks = new Map<string, Mark>();
  for (const [criterionId, markRaw] of Object.entries(
    asObject(o['rubric'] ?? {}),
  )) {
    const m = asObject(markRaw);
    marks.set(criterionId, {
      criterionId,
      decision: str(m['decision']) ?? '',
      comment: str(m['comment']) ?? '',
      autoValue: str(m['autoValue']) ?? '',
    });
  }

  return {
    taskId: str(o['taskId']) ?? str(o['reviewTaskId']) ?? '',
    status: str(o['status']) ?? '',
    decision: str(o['decision']) ?? null,
    overallVerdict: str(o['overallVerdict']) ?? null,
    focusSeconds: typeof o['focusSeconds'] === 'number' ? o['focusSeconds'] : 0,
    updatedAt: str(o['updatedAt']),
    prefilledFromReport: o['prefilledFromReport'] === true,
    prefillVersion: str(o['prefillVersion']),
    verdicts,
    marks,
    jobs,
  };
}

function parseVerdict(raw: unknown, command: string): Verdict {
  const o = asObject(raw);
  return {
    criterionId: str(o['criterionId']) ?? '(unknown)',
    value: (str(o['value']) ?? '').toUpperCase(),
    summary: str(o['summary']),
    detail: str(o['detail']),
    reasoning: str(o['reasoning']),
    findings: asArray(o['findings']).map((f) => {
      const fo = asObject(f);
      return {
        id: str(fo['id']),
        title: str(fo['title']),
        summary: str(fo['summary']),
        severity: str(fo['severity']) ?? null,
        details: isObject(fo['details']) ? fo['details'] : undefined,
      };
    }),
    provenance: str(o['provenance']),
    command,
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asObject(v: unknown): Record<string, unknown> {
  return isObject(v) ? v : {};
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
