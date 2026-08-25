/** Orchestrates a full offline pass over a downloaded review package. */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { locate, readJson } from '../package/load.ts';
import { parseSession } from '../package/session.ts';
import { indexTrials } from '../package/trials.ts';
import { audit } from '../audit/rules.ts';
import { analyzeFailures, nearMissFlags } from '../audit/nearmiss.ts';
import { loadReviewerAgent, verifyClaims } from '../package/reviewerAgent.ts';
import {
  annotateWithReviewerAgent,
  jobResultContradictions,
  reviewerAgentClaimFlags,
  reviewerAgentDisagreements,
} from '../audit/reconcile.ts';
import { loadTaskCorpus } from '../package/taskfiles.ts';
import { claimFlags, verifyAllClaims } from '../audit/claims.ts';
import { renderReport } from '../report/markdown.ts';
import { RUBRICS } from '../rubrics/rubrics.ts';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function runAnalysis(inputPath: string): Promise<number> {
  const paths = await locate(resolve(inputPath));

  if (!paths.sessionFile) {
    console.error(
      `No review-session JSON found under ${inputPath}.\n` +
        'Expected <package>/review-session/<batch>__<task>.json',
    );
    return 1;
  }

  console.log(`task:         ${paths.slug}`);
  console.log(`session:      ${rel(paths.sessionFile)}`);
  console.log(`task files:   ${paths.taskDir ? rel(paths.taskDir) : 'not found'}`);
  console.log(
    `trajectories: ${paths.trajectoriesDir ? rel(paths.trajectoriesDir) : 'not found'}`,
  );
  console.log('');

  const session = parseSession(await readJson(paths.sessionFile));
  const trials = await indexTrials(paths.trajectoriesDir);
  const failures = await analyzeFailures(trials);

  const reviewerAgent = paths.packageDir
    ? await loadReviewerAgent(paths.packageDir)
    : null;
  const corpus = paths.taskDir ? await loadTaskCorpus(paths.taskDir) : null;
  const claimChecks =
    reviewerAgent && paths.taskDir
      ? await verifyClaims(reviewerAgent, paths.taskDir, corpus?.paths ?? new Set())
      : [];

  const autoqaClaims = corpus ? verifyAllClaims(session, corpus) : null;

  let flags = [
    ...audit({ session, trials }),
    ...nearMissFlags(failures),
    ...jobResultContradictions(session),
    ...(reviewerAgent ? reviewerAgentDisagreements(reviewerAgent, session) : []),
    ...reviewerAgentClaimFlags(claimChecks),
    ...(autoqaClaims ? claimFlags(autoqaClaims) : []),
  ];
  if (reviewerAgent) flags = annotateWithReviewerAgent(flags, reviewerAgent);
  flags.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  const high = flags.filter((f) => f.severity === 'high');
  const medium = flags.filter((f) => f.severity === 'medium');

  console.log(
    `verdicts=${session.verdicts.size}  marked=${session.marks.size}/${RUBRICS.length}  ` +
      `trials=${trials.solved}/${trials.total} solved`,
  );
  console.log(
    `reviewer agent: ${
      reviewerAgent
        ? `${reviewerAgent.verdict} (${reviewerAgent.verdictTable.length} signals, ` +
          `${reviewerAgent.annotations.length} annotation(s))`
        : 'not found'
    }`,
  );
  if (autoqaClaims) {
    const failed = autoqaClaims.results.filter((r) => !r.holds).length;
    console.log(
      `autoqa claims verified: ${autoqaClaims.results.length} checked, ` +
        `${failed} did not hold`,
    );
  }
  console.log(
    `flags: ${high.length} high, ${medium.length} medium, ` +
      `${flags.length - high.length - medium.length} low`,
  );
  console.log('');

  for (const flag of [...high, ...medium]) {
    const where = flag.criterionId ? ` [${flag.criterionId}]` : '';
    console.log(`  ${flag.severity === 'high' ? '●' : '◐'} ${flag.title}${where}`);
  }

  const report = renderReport({
    slug: paths.slug,
    session,
    trials,
    flags,
    reviewerAgent,
    claimChecks,
    autoqaClaims,
  });

  const outDir = join(projectRoot, 'out');
  await mkdir(outDir, { recursive: true });
  const outFile = join(outDir, `${paths.slug}.review.md`);
  await writeFile(outFile, report, 'utf8');

  console.log(`\nfull draft: ${rel(outFile)}`);
  return 0;
}

function rel(p: string): string {
  return p.startsWith(projectRoot) ? p.slice(projectRoot.length + 1) : p;
}

function severityRank(s: 'high' | 'medium' | 'low'): number {
  return s === 'high' ? 0 : s === 'medium' ? 1 : 2;
}
