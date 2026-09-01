/**
 * Locates the parts of a downloaded review package.
 *
 * Expected shape (as produced by the portal's Download menu):
 *
 *   <batch>__<task>/
 *     harbor-view/tasks/<batch>__<task>/   the actual TB3 task files
 *     harbor-view/jobs/                    raw pipeline job output (noise)
 *     review-session/<batch>__<task>.json  verdicts, marks, and job results
 *     review-session/<batch>__<task>.feedback.md  prior review, if rejected
 *     run/, reviewer-working-copy/         duplicates of the task snapshot
 *   <batch>__<task>-trajectories/
 *     <model>/attempt_NN/                  per-trial agent and verifier output
 *
 * Accepts a path to either the package directory, the parent holding it and its
 * `-trajectories` sibling, or the trajectories directory itself.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';

export interface PackagePaths {
  /** Directory named `<batch>__<task>`, if present. */
  packageDir: string | null;
  /** Root of the TB3 task itself: the folder holding instruction.md. */
  taskDir: string | null;
  /** The review-session JSON. */
  sessionFile: string | null;
  /** The prior human review and team-lead feedback, when this is a re-review. */
  feedbackFile: string | null;
  /** Directory holding `<model>/attempt_NN/`. */
  trajectoriesDir: string | null;
  /** Task slug, e.g. `unicode-fold-dedup`. */
  slug: string;
}

const TRAJ_SUFFIX = '-trajectories';

export async function locate(inputPath: string): Promise<PackagePaths> {
  const root = await resolveRoot(inputPath);

  let packageDir: string | null = null;
  let trajectoriesDir: string | null = null;

  if (await isDir(join(root, 'review-session'))) {
    packageDir = root;
  } else if (basename(root).endsWith(TRAJ_SUFFIX)) {
    trajectoriesDir = root;
  } else {
    // A parent directory: find the package and trajectories among its children.
    for (const name of await safeReaddir(root)) {
      const abs = join(root, name);
      if (!(await isDir(abs))) continue;
      if (name.endsWith(TRAJ_SUFFIX)) trajectoriesDir ??= abs;
      else if (await isDir(join(abs, 'review-session'))) packageDir ??= abs;
    }
  }

  // Given one, the other is a predictable sibling.
  if (packageDir && !trajectoriesDir) {
    const guess = packageDir + TRAJ_SUFFIX;
    if (await isDir(guess)) trajectoriesDir = guess;
  }
  if (trajectoriesDir && !packageDir) {
    const guess = trajectoriesDir.slice(0, -TRAJ_SUFFIX.length);
    if (await isDir(guess)) packageDir = guess;
  }

  const sessionFile = packageDir ? await findSessionFile(packageDir) : null;
  const feedbackFile = packageDir
    ? await findFeedbackFile(packageDir, sessionFile)
    : null;
  const taskDir = packageDir ? await findTaskDir(packageDir) : null;
  const name = basename(packageDir ?? trajectoriesDir ?? root).replace(
    TRAJ_SUFFIX,
    '',
  );

  return {
    packageDir,
    taskDir,
    sessionFile,
    feedbackFile,
    trajectoriesDir,
    slug: name.includes('__') ? name.slice(name.lastIndexOf('__') + 2) : name,
  };
}

/** If the path is a lone wrapper directory, step into it. */
async function resolveRoot(inputPath: string): Promise<string> {
  let cur = inputPath;
  for (let i = 0; i < 3; i++) {
    const entries = await safeReaddir(cur);
    const dirs: string[] = [];
    for (const e of entries) {
      if (e === 'README.md' || e.startsWith('.')) continue;
      if (await isDir(join(cur, e))) dirs.push(e);
      else return cur; // a real file here means this is the level we want
    }
    if (dirs.length !== 1) return cur;
    cur = join(cur, dirs[0]!);
  }
  return cur;
}

/**
 * Prefers harbor-view/tasks/*, which is the authoritative task snapshot.
 * `run/` and `reviewer-working-copy/` hold copies at other pipeline stages.
 */
async function findTaskDir(packageDir: string): Promise<string | null> {
  const tasksRoot = join(packageDir, 'harbor-view', 'tasks');
  for (const name of await safeReaddir(tasksRoot)) {
    const abs = join(tasksRoot, name);
    if (await isFile(join(abs, 'instruction.md'))) return abs;
  }
  if (await isFile(join(packageDir, 'reviewer-working-copy', 'instruction.md'))) {
    return join(packageDir, 'reviewer-working-copy');
  }
  return null;
}

async function findSessionFile(packageDir: string): Promise<string | null> {
  const dir = join(packageDir, 'review-session');
  const names = (await safeReaddir(dir)).filter(
    (n) => n.endsWith('.json') && !n.endsWith('.feedback.json'),
  );
  return names.length ? join(dir, names[0]!) : null;
}

async function findFeedbackFile(
  packageDir: string,
  sessionFile: string | null,
): Promise<string | null> {
  const dir = join(packageDir, 'review-session');
  if (sessionFile) {
    const expected = sessionFile.replace(/\.json$/, '.feedback.md');
    if (await isFile(expected)) return expected;
  }

  const names = (await safeReaddir(dir)).filter((n) =>
    n.endsWith('.feedback.md'),
  );
  return names.length ? join(dir, names[0]!) : null;
}

/** Reads and parses the session JSON. ~350 KB, so read on demand. */
export async function readJson<T = unknown>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

export async function isDir(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}

export async function isFile(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}

export async function safeReaddir(p: string): Promise<string[]> {
  try {
    return await readdir(p);
  } catch {
    return [];
  }
}
