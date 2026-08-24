/**
 * Loads the shipped task's files into a corpus that claims can be checked
 * against: contents, the set of test functions that actually exist, and the
 * numeric scalars declared in task.toml.
 */

import { readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { isDir, safeReaddir } from './load.ts';

const SKIP = new Set(['__pycache__', '.pytest_cache', '.git']);

const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.pdf', '.zip', '.gz', '.so', '.pyc',
]);

/** Files above this size are indexed by path but not by content. */
const MAX_BYTES = 4_000_000;

export interface TaskCorpus {
  root: string;
  /** Task-relative path -> contents. */
  files: Map<string, string>;
  /** Every path, including ones too large or binary to read. */
  paths: Set<string>;
  /** Test functions that genuinely exist, e.g. `test_master_exact`. */
  testFunctions: Set<string>;
  /** Where each test function is defined: name -> `file:line`. */
  testLocations: Map<string, string>;
  /** Numeric scalars from task.toml, e.g. `timeout_sec` -> [1800, 600]. */
  tomlNumbers: Map<string, number[]>;
}

export async function loadTaskCorpus(root: string): Promise<TaskCorpus> {
  const files = new Map<string, string>();
  const paths = new Set<string>();
  await walk(root, root, files, paths);

  const testFunctions = new Set<string>();
  const testLocations = new Map<string, string>();
  for (const [path, content] of files) {
    if (!path.endsWith('.py')) continue;
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      const m = /^\s*def\s+(test_[A-Za-z0-9_]+)\s*\(/.exec(line);
      if (m?.[1]) {
        testFunctions.add(m[1]);
        if (!testLocations.has(m[1])) {
          testLocations.set(m[1], `${path}:${i + 1}`);
        }
      }
    });
  }

  return {
    root,
    files,
    paths,
    testFunctions,
    testLocations,
    tomlNumbers: parseTomlNumbers(files.get('task.toml') ?? ''),
  };
}

/**
 * Collects `key = <number>` pairs from task.toml without needing the section
 * context — claims tend to name the key ("verifier timeout of 600s") rather
 * than its full path, so a key-to-values map is what verification needs.
 */
function parseTomlNumbers(toml: string): Map<string, number[]> {
  const out = new Map<string, number[]>();
  for (const line of toml.split('\n')) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(-?\d+(?:\.\d+)?)\s*(?:#.*)?$/.exec(
      line,
    );
    if (!m?.[1] || !m[2]) continue;
    const key = m[1];
    const value = Number.parseFloat(m[2]);
    out.set(key, [...(out.get(key) ?? []), value]);
  }
  return out;
}

/** Every number declared anywhere in task.toml, for loose containment checks. */
export function allTomlNumbers(corpus: TaskCorpus): Set<number> {
  const out = new Set<number>();
  for (const values of corpus.tomlNumbers.values()) {
    for (const v of values) out.add(v);
  }
  return out;
}

/** Locate a literal string in the corpus. Returns `file:line`, or null. */
export function findLiteral(
  corpus: TaskCorpus,
  needle: string,
  preferFile?: string,
): string | null {
  const trimmed = needle.trim();
  if (trimmed.length < 8) return null;

  const order = preferFile && corpus.files.has(preferFile)
    ? [preferFile, ...[...corpus.files.keys()].filter((f) => f !== preferFile)]
    : [...corpus.files.keys()];

  for (const path of order) {
    const content = corpus.files.get(path)!;
    const idx = content.indexOf(trimmed);
    if (idx === -1) continue;
    const line = content.slice(0, idx).split('\n').length;
    return `${path}:${line}`;
  }
  return null;
}

/**
 * Whitespace-insensitive fallback, for quotes that were reflowed when they were
 * copied into a report.
 */
export function findLiteralLoose(
  corpus: TaskCorpus,
  needle: string,
): string | null {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  const target = norm(needle);
  if (target.length < 12) return null;

  for (const [path, content] of corpus.files) {
    if (norm(content).includes(target)) return path;
  }
  return null;
}

async function walk(
  root: string,
  dir: string,
  files: Map<string, string>,
  paths: Set<string>,
): Promise<void> {
  for (const name of await safeReaddir(dir)) {
    if (SKIP.has(name)) continue;
    const abs = join(dir, name);
    if (await isDir(abs)) {
      await walk(root, abs, files, paths);
      continue;
    }
    const rel = relative(root, abs).split(sep).join('/');
    paths.add(rel);

    const ext = rel.slice(rel.lastIndexOf('.')).toLowerCase();
    if (BINARY_EXT.has(ext)) continue;
    try {
      const buf = await readFile(abs);
      if (buf.byteLength > MAX_BYTES) continue;
      if (buf.subarray(0, 4096).includes(0)) continue;
      files.set(rel, buf.toString('utf8'));
    } catch {
      // unreadable; the path is still recorded
    }
  }
}

/** Back-compat helper used by Reviewer Agent claim checking. */
export async function listTaskFiles(taskDir: string): Promise<Set<string>> {
  return (await loadTaskCorpus(taskDir)).paths;
}
