/**
 * Builds the second-round dossier for a downloaded review package.
 *
 * Deliberately separate from `analyze`: that pass checks TQA's evidence,
 * this one assembles what is needed to assess the task before validating TQA.
 */

import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { locate, readJson } from '../package/load.ts';
import { parseSession } from '../package/session.ts';
import { indexTrials } from '../package/trials.ts';
import { findReviewerAgentMarkdown } from '../package/reviewerAgent.ts';
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
  const budgets = paths.taskDir
    ? await readBudgets(paths.taskDir)
    : { agentSec: null, verifierSec: null, buildSec: null };
  const timing = await measureTiming(trials, budgets);
  const failures = await analyzeFailures(trials);
  const reviewerAgentSource = paths.packageDir
    ? await findReviewerAgentMarkdown(paths.packageDir)
    : null;

  const dossier = renderDossier({
    slug: paths.slug,
    session,
    trials,
    timing,
    failures,
  });

  const outDir = join(projectRoot, 'out');
  await mkdir(outDir, { recursive: true });
  const outFile = join(outDir, `${paths.slug}.tqa-review.md`);
  const reviewerAgentOutFile = join(
    outDir,
    `${paths.slug}.reviewer_agent.md`,
  );
  await writeFile(outFile, dossier, 'utf8');
  if (reviewerAgentSource) {
    await copyFile(reviewerAgentSource, reviewerAgentOutFile);
  }

  const missing = missingVerdicts(session);
  const covered = RUBRICS.length - missing.length;

  console.log(`task:      ${paths.slug}`);
  console.log(
    `criteria:  ${covered}/${RUBRICS.length} rubrics have a TQA verdict` +
    (missing.length ? `; none for ${missing.join(', ')}` : ''),
  );
  console.log(`trials:    ${trials.solved}/${trials.total} solved`);
  console.log(`timing:    ${summarizeTiming(timing)}`);
  console.log(`failures:  ${failures.length} with recorded output`);
  console.log('');
  console.log(`tqa-review: ${rel(outFile)}`);
  console.log(
    `reviewer agent: ${reviewerAgentSource ? rel(reviewerAgentOutFile) : 'not found'}`,
  );
  console.log(
    `size:    ${(dossier.length / 1024).toFixed(0)} KB, ~${Math.round(dossier.length / 4000)}k tokens`,
  );
  console.log('');
  console.log(
    'Next: assess all 49 criteria, then mark each TQA finding YES/PASS or NO/FAIL.',
  );

  return 0;
}

function rel(p: string): string {
  return p.startsWith(projectRoot) ? p.slice(projectRoot.length + 1) : p;
}
