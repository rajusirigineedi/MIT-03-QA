/**
 * Builds the second-round dossier for a downloaded review package.
 *
 * Deliberately separate from `analyze`: that pass judges AutoQA's paperwork,
 * this one assembles what is needed to judge the task itself.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { locate, readJson } from '../package/load.ts';
import { parseSession } from '../package/session.ts';
import { indexTrials } from '../package/trials.ts';
import { loadTaskCorpus } from '../package/taskfiles.ts';
import { loadReviewerAgent } from '../package/reviewerAgent.ts';
import { analyzeFailures } from '../audit/nearmiss.ts';
import { measureTiming, readBudgets, summarizeTiming } from './timing.ts';
import { missingVerdicts, renderDossier } from './dossier.ts';
import { RUBRICS } from '../rubrics/rubrics.ts';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function runDossier(inputPath: string): Promise<number> {
  const paths = await locate(resolve(inputPath));

  if (!paths.sessionFile) {
    console.error(
      `No review-session JSON found under ${inputPath}.\n` +
        'Expected <package>/review-session/<batch>__<task>.json',
    );
    return 1;
  }

  const session = parseSession(await readJson(paths.sessionFile));
  const trials = await indexTrials(paths.trajectoriesDir);
  const corpus = paths.taskDir ? await loadTaskCorpus(paths.taskDir) : null;
  const budgets = paths.taskDir
    ? await readBudgets(paths.taskDir)
    : { agentSec: null, verifierSec: null, buildSec: null };
  const timing = await measureTiming(trials, budgets);
  const failures = await analyzeFailures(trials);
  const reviewerAgent = paths.packageDir
    ? await loadReviewerAgent(paths.packageDir)
    : null;

  const dossier = renderDossier({
    slug: paths.slug,
    session,
    trials,
    corpus,
    timing,
    failures,
    reviewerAgent,
  });

  const outDir = join(projectRoot, 'out');
  await mkdir(outDir, { recursive: true });
  const outFile = join(outDir, `${paths.slug}.dossier.md`);
  await writeFile(outFile, dossier, 'utf8');

  const missing = missingVerdicts(session);
  const covered = RUBRICS.length - missing.length;

  console.log(`task:      ${paths.slug}`);
  console.log(
    `criteria:  ${covered}/${RUBRICS.length} rubrics have an AutoQA verdict` +
      (missing.length ? `; none for ${missing.join(', ')}` : ''),
  );
  console.log(`trials:    ${trials.solved}/${trials.total} solved`);
  console.log(`timing:    ${summarizeTiming(timing)}`);
  console.log(
    `task files: ${corpus ? `${corpus.files.size} inlined, ${corpus.testFunctions.size} test functions` : 'not found'}`,
  );
  console.log(`failures:  ${failures.length} with recorded output`);
  console.log('');
  console.log(`dossier: ${rel(outFile)}`);
  console.log(
    `size:    ${(dossier.length / 1024).toFixed(0)} KB, ~${Math.round(dossier.length / 4000)}k tokens`,
  );
  console.log('');
  console.log('Next: read the dossier and produce the 49-row verdict table.');

  return 0;
}

function rel(p: string): string {
  return p.startsWith(projectRoot) ? p.slice(projectRoot.length + 1) : p;
}
