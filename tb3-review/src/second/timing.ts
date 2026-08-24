/**
 * Measures how much of the configured time budget each trial actually used.
 *
 * Rubrics 27 (timeouts and resources appropriate) and 48 (failures caused by
 * low timeout) are usually answered by assertion. They don't need to be: every
 * trial records phase timestamps and task.toml declares the budgets, so the
 * headroom is arithmetic.
 */

import { parse as parseToml } from 'smol-toml';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readJson } from '../package/load.ts';
import type { Trial, TrialIndex } from '../package/trials.ts';

export interface Budgets {
  /** `[agent].timeout_sec` — wall clock the agent is given. */
  agentSec: number | null;
  /** `[verifier].timeout_sec` — wall clock the verifier is given. */
  verifierSec: number | null;
  /** `build_timeout_sec`, wherever it is declared. */
  buildSec: number | null;
}

export interface TrialTiming {
  model: string;
  attempt: string;
  solved: boolean;
  /** Seconds spent in each phase, where recorded. */
  environmentSetupSec: number | null;
  agentSetupSec: number | null;
  agentExecutionSec: number | null;
  verifierSec: number | null;
  totalSec: number | null;
  /** agentExecutionSec / budget.agentSec */
  agentBudgetUsed: number | null;
  verifierBudgetUsed: number | null;
}

export interface TimingReport {
  budgets: Budgets;
  trials: TrialTiming[];
  /** Highest fraction of the agent budget any trial consumed. */
  maxAgentBudgetUsed: number | null;
  maxVerifierBudgetUsed: number | null;
  /** Trials that ran right up against the budget. */
  nearBudget: TrialTiming[];
  /** Whether any failing trial plausibly ran out of time. */
  timeoutSuspects: TrialTiming[];
}

/** Anything above this fraction of budget is worth a reviewer's attention. */
const NEAR_BUDGET = 0.8;

export async function readBudgets(taskDir: string): Promise<Budgets> {
  let toml: Record<string, unknown> = {};
  try {
    toml = parseToml(
      await readFile(join(taskDir, 'task.toml'), 'utf8'),
    ) as Record<string, unknown>;
  } catch {
    return { agentSec: null, verifierSec: null, buildSec: null };
  }

  return {
    agentSec: num(dig(toml, 'agent.timeout_sec')),
    verifierSec: num(dig(toml, 'verifier.timeout_sec')),
    buildSec:
      num(dig(toml, 'environment.build_timeout_sec')) ??
      num(dig(toml, 'verifier.build_timeout_sec')) ??
      num(dig(toml, 'build_timeout_sec')),
  };
}

export async function measureTiming(
  trials: TrialIndex,
  budgets: Budgets,
): Promise<TimingReport> {
  const rows: TrialTiming[] = [];

  for (const trial of trials.trials) {
    rows.push(await measureTrial(trial, budgets));
  }

  const agentUsed = rows
    .map((r) => r.agentBudgetUsed)
    .filter((v): v is number => v !== null);
  const verifierUsed = rows
    .map((r) => r.verifierBudgetUsed)
    .filter((v): v is number => v !== null);

  return {
    budgets,
    trials: rows,
    maxAgentBudgetUsed: agentUsed.length ? Math.max(...agentUsed) : null,
    maxVerifierBudgetUsed: verifierUsed.length ? Math.max(...verifierUsed) : null,
    nearBudget: rows.filter(
      (r) =>
        (r.agentBudgetUsed ?? 0) >= NEAR_BUDGET ||
        (r.verifierBudgetUsed ?? 0) >= NEAR_BUDGET,
    ),
    timeoutSuspects: rows.filter(
      (r) => !r.solved && (r.agentBudgetUsed ?? 0) >= NEAR_BUDGET,
    ),
  };
}

async function measureTrial(
  trial: Trial,
  budgets: Budgets,
): Promise<TrialTiming> {
  const base: TrialTiming = {
    model: trial.model,
    attempt: trial.attempt,
    solved: trial.solved,
    environmentSetupSec: null,
    agentSetupSec: null,
    agentExecutionSec: null,
    verifierSec: null,
    totalSec: null,
    agentBudgetUsed: null,
    verifierBudgetUsed: null,
  };
  if (!trial.paths.result) return base;

  let result: Record<string, unknown>;
  try {
    result = await readJson<Record<string, unknown>>(trial.paths.result);
  } catch {
    return base;
  }

  const phase = (key: string) => span(dig(result, key));

  const agentExecutionSec = phase('agent_execution');
  const verifierSec = phase('verifier');

  return {
    ...base,
    environmentSetupSec: phase('environment_setup'),
    agentSetupSec: phase('agent_setup'),
    agentExecutionSec,
    verifierSec,
    totalSec: spanOf(result['started_at'], result['finished_at']),
    agentBudgetUsed:
      agentExecutionSec !== null && budgets.agentSec
        ? agentExecutionSec / budgets.agentSec
        : null,
    verifierBudgetUsed:
      verifierSec !== null && budgets.verifierSec
        ? verifierSec / budgets.verifierSec
        : null,
  };
}

function span(phase: unknown): number | null {
  if (typeof phase !== 'object' || phase === null) return null;
  const o = phase as Record<string, unknown>;
  return spanOf(o['started_at'], o['finished_at']);
}

function spanOf(from: unknown, to: unknown): number | null {
  if (typeof from !== 'string' || typeof to !== 'string') return null;
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return (b - a) / 1000;
}

function dig(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split('.')) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** One-line factual summary for the two timeout rubrics. */
export function summarizeTiming(t: TimingReport): string {
  const parts: string[] = [];
  const pct = (v: number | null) =>
    v === null ? 'unknown' : `${(v * 100).toFixed(0)}%`;

  parts.push(
    `agent budget ${t.budgets.agentSec ?? '?'}s, peak use ${pct(t.maxAgentBudgetUsed)}`,
  );
  parts.push(
    `verifier budget ${t.budgets.verifierSec ?? '?'}s, peak use ${pct(t.maxVerifierBudgetUsed)}`,
  );
  if (t.timeoutSuspects.length) {
    parts.push(
      `${t.timeoutSuspects.length} failing trial(s) ran past ${NEAR_BUDGET * 100}% of budget`,
    );
  } else {
    parts.push('no failing trial came close to its budget');
  }
  return parts.join('; ');
}
