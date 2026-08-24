/**
 * Indexes the per-trial run output.
 *
 * Layout: `<trajectoriesDir>/<model>/attempt_NN/`
 *   result.json             trial metadata, agent_result, verifier_result
 *   config.json             agent and task config
 *   agent/trajectory.json   { schema_version, session_id, agent, steps[], final_metrics }
 *   verifier/test-stdout.txt
 *   verifier/reward.txt
 *
 * Rewards are small and always read; trajectories can be hundreds of KB each and
 * are only read when a rubric actually needs them.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isFile, readJson, safeReaddir } from './load.ts';

export interface Trial {
  /** Model directory name, e.g. `claude-opus-4-8__claude-code`. */
  model: string;
  /** Attempt directory name, e.g. `attempt_01`. */
  attempt: string;
  dir: string;
  /** Parsed from verifier/reward.txt; null when absent or unparseable. */
  reward: number | null;
  solved: boolean;
  paths: {
    result: string | null;
    config: string | null;
    trajectory: string | null;
    testStdout: string | null;
  };
}

export interface TrialIndex {
  trials: Trial[];
  byModel: Map<string, Trial[]>;
  total: number;
  solved: number;
}

export async function indexTrials(
  trajectoriesDir: string | null,
): Promise<TrialIndex> {
  const trials: Trial[] = [];
  if (!trajectoriesDir) {
    return { trials, byModel: new Map(), total: 0, solved: 0 };
  }

  for (const model of (await safeReaddir(trajectoriesDir)).sort()) {
    const modelDir = join(trajectoriesDir, model);
    const attempts = (await safeReaddir(modelDir))
      .filter((a) => a.startsWith('attempt_'))
      .sort();
    for (const attempt of attempts) {
      const dir = join(modelDir, attempt);
      const rewardPath = join(dir, 'verifier', 'reward.txt');
      const reward = await readReward(rewardPath);
      trials.push({
        model,
        attempt,
        dir,
        reward,
        solved: reward === 1,
        paths: {
          result: await orNull(join(dir, 'result.json')),
          config: await orNull(join(dir, 'config.json')),
          trajectory: await orNull(join(dir, 'agent', 'trajectory.json')),
          testStdout: await orNull(join(dir, 'verifier', 'test-stdout.txt')),
        },
      });
    }
  }

  const byModel = new Map<string, Trial[]>();
  for (const t of trials) {
    const list = byModel.get(t.model) ?? [];
    list.push(t);
    byModel.set(t.model, list);
  }

  return {
    trials,
    byModel,
    total: trials.length,
    solved: trials.filter((t) => t.solved).length,
  };
}

async function readReward(path: string): Promise<number | null> {
  try {
    const n = Number.parseFloat((await readFile(path, 'utf8')).trim());
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

async function orNull(p: string): Promise<string | null> {
  return (await isFile(p)) ? p : null;
}

/** Steps an agent took, loaded on demand. */
export interface TrajectoryStep {
  [key: string]: unknown;
}

export interface Trajectory {
  schema_version?: string;
  session_id?: string;
  agent?: Record<string, unknown>;
  steps: TrajectoryStep[];
  final_metrics?: Record<string, unknown>;
}

export async function loadTrajectory(trial: Trial): Promise<Trajectory | null> {
  if (!trial.paths.trajectory) return null;
  const raw = await readJson<Record<string, unknown>>(trial.paths.trajectory);
  return {
    schema_version: raw['schema_version'] as string | undefined,
    session_id: raw['session_id'] as string | undefined,
    agent: raw['agent'] as Record<string, unknown> | undefined,
    steps: Array.isArray(raw['steps']) ? (raw['steps'] as TrajectoryStep[]) : [],
    final_metrics: raw['final_metrics'] as Record<string, unknown> | undefined,
  };
}

export async function loadTestStdout(trial: Trial): Promise<string | null> {
  if (!trial.paths.testStdout) return null;
  return readFile(trial.paths.testStdout, 'utf8');
}

/**
 * The pytest summary line, which is the fastest way to see what broke.
 * Example: `=== 1 failed, 2 passed in 1.21s ===`
 */
export function pytestSummary(stdout: string): string | null {
  const matches = stdout.match(/^=+ .*(passed|failed|error).* =+$/gim);
  return matches?.[matches.length - 1]?.trim() ?? null;
}

/** Names of failing pytest assertions, from `FAILED path::test_name` lines. */
export function failedTests(stdout: string): string[] {
  const out = new Set<string>();
  for (const line of stdout.split('\n')) {
    const m = line.match(/^FAILED\s+(\S+)/);
    if (m?.[1]) out.add(m[1]);
    const m2 = line.match(/^_{5,}\s+(\S+)\s+_{5,}$/);
    if (m2?.[1]) out.add(m2[1]);
  }
  return [...out];
}
