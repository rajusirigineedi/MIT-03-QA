/** Groups the 49 portal rubrics by the task evidence they share. */

import { RUBRICS, type Cluster, type Rubric } from '../rubrics/rubrics.ts';

export type Batch =
  | 'oracle'
  | 'verifier'
  | 'fairness'
  | 'difficulty'
  | 'hygiene'
  | 'docs';

export const BATCH_ORDER: Batch[] = [
  'oracle',
  'verifier',
  'fairness',
  'difficulty',
  'hygiene',
  'docs',
];

export const BATCH_TITLE: Record<Batch, string> = {
  oracle: 'Solvability and oracle honesty',
  verifier: 'Verifier strength',
  fairness: 'Grading fairness',
  difficulty: 'Difficulty and realism',
  hygiene: 'Cleanliness and determinism',
  docs: 'Documentation and safety',
};

export const BATCH_READS: Record<Batch, string> = {
  oracle: 'solution, tests, oracle reward, timing',
  verifier: 'tests, environment, no-op and cheat results',
  fairness: 'instruction, tests, failing assertions',
  difficulty: 'instruction, explanations, honest failures',
  hygiene: 'task.toml, Dockerfiles, file inventory, timing',
  docs: 'instruction, metadata, README, executable files',
};

const CLUSTER_BATCH: Record<Cluster, Batch> = {
  oracle: 'oracle',
  verifier: 'verifier',
  fairness: 'fairness',
  specification: 'fairness',
  difficulty: 'difficulty',
  hygiene: 'hygiene',
  docs: 'docs',
};

const OVERRIDE: Record<string, Batch> = {
  resources_appropriate: 'hygiene',
  low_timeout: 'hygiene',
};

export interface EvidenceSpec {
  rubric: Rubric;
  batch: Batch;
}

const EVIDENCE: EvidenceSpec[] = RUBRICS.map((rubric) => ({
  rubric,
  batch: OVERRIDE[rubric.id] ?? CLUSTER_BATCH[rubric.cluster],
}));

export function evidenceByBatch(batch: Batch): EvidenceSpec[] {
  return EVIDENCE.filter((entry) => entry.batch === batch).sort(
    (a, b) => a.rubric.n - b.rubric.n,
  );
}
