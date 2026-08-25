#!/usr/bin/env node
/**
 * tb3 — offline review pipeline for Terminal Bench 3.0 tasks.
 *
 * Input is a task package downloaded from the reviewer portal's Download menu:
 * task files, the 49 AutoQA criterion verdicts, and the model run reports.
 *
 * This tool analyses evidence and drafts a review. It never submits anything —
 * marks and the final verdict stay manual in the portal.
 */

import { RUBRICS } from './rubrics/rubrics.ts';

const USAGE = `tb3 — TB3 review pipeline (offline, read-only)

Usage:
  npm run tb3 -- <command> [args]

Commands:
  rubrics [--cluster=x]   List the 49 rubrics and how each one is decided
  analyze <path>          Audit whether AutoQA's 49 verdicts are supported
  dossier <path>          Assemble the evidence to judge all 49 independently
  help

Clusters: oracle, verifier, fairness, specification, difficulty, hygiene, docs
`;

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;

  switch (command) {
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      console.log(USAGE);
      return 0;

    case 'rubrics': {
      const cluster = rest
        .find((a) => a.startsWith('--cluster='))
        ?.split('=')[1];
      const rows = cluster
        ? RUBRICS.filter((r) => r.cluster === cluster)
        : RUBRICS;
      for (const r of rows) {
        console.log(
          `${String(r.n).padStart(2)}. ${r.title}${r.extraAttention ? ' *' : ''}\n` +
            `    id=${r.id}  cluster=${r.cluster}  decided-by=${r.decidable}`,
        );
      }
      const counts = tally(rows.map((r) => r.decidable));
      console.log(
        `\n${rows.length} rubrics — ` +
          Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ') +
          `; ${rows.filter((r) => r.extraAttention).length} need extra attention (*)`,
      );
      return 0;
    }

    case 'analyze': {
      const path = rest.find((a) => !a.startsWith('-'));
      if (!path) {
        console.error('analyze needs a path to a downloaded task package.');
        return 1;
      }
      const { runAnalysis } = await import('./analyze/run.ts');
      return runAnalysis(path);
    }

    case 'dossier': {
      const path = rest.find((a) => !a.startsWith('-'));
      if (!path) {
        console.error('dossier needs a path to a downloaded task package.');
        return 1;
      }
      const { runDossier } = await import('./second/run.ts');
      return runDossier(path);
    }

    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(USAGE);
      return 1;
  }
}

function tally(values: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return out;
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.stack ?? err.message : String(err));
    process.exit(1);
  });
