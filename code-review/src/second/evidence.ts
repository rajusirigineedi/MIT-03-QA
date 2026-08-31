/**
 * What it takes to answer each criterion independently.
 *
 * The audit layer asks "did TQA show its work?". This layer asks the prior
 * question: "what would I have to read to decide this myself?". Batching the 49
 * by the evidence they draw on means each source file gets read once and the
 * reviewer stays in one frame of mind at a time, instead of thrashing between
 * Dockerfiles and trajectories 49 times.
 */

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
  oracle:
    'reviewer-working-copy/solution, verifier tests, TQA-recorded rewards and timing',
  verifier:
    'reviewer-working-copy/tests and environment, TQA-recorded NOP result, selected trial results',
  fairness:
    'reviewer-working-copy/instruction.md read against tests, plus selected failing assertions',
  difficulty:
    'reviewer-working-copy/instruction.md, task.toml difficulty_explanation, selected trial outputs',
  hygiene:
    'reviewer-working-copy/task.toml, Dockerfiles, file listing, TQA-recorded timing',
  docs:
    'reviewer-working-copy/instruction.md, task.toml explanations, README',
};

/** Criteria whose natural batch differs from their cluster's default. */
const BATCH_OVERRIDE: Record<string, Batch> = {
  resources_appropriate: 'hygiene',
  low_timeout: 'hygiene',
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

/**
 * How to reach an independent assessment, for criteria where "use judgement"
 * is not a useful instruction. Everything else falls back to its intent text.
 */
const RECIPE: Record<string, string> = {
  // Verifier strength
  no_false_positives:
    'Check every test and assertion. For each one, ask what incorrect result could still satisfy it. Look for hardcoded expected values, row-count checks without content checks, format checks without computation checks, and samples that ignore the full output. Do not report none until every assertion is checked. Conclude with a concrete passing-but-wrong strategy and exact test lines, or the assertion that blocks each bypass considered.',
  no_false_negatives:
    'Check every test and assertion. For each one, ask what correct result it could reject. Look for exact float equality, ordering, whitespace, trailing-newline sensitivity, and one arbitrary spelling where the instruction permits more than one. Do not report none until every assertion is checked. Cite the exact assertion and instruction line for each concrete correct-but-rejected result.',
  tests_resist_shortcuts:
    'Ask what the cheapest way to satisfy each assertion is. Check whether test files, expected outputs, or the solution are reachable from the agent workspace, and whether any assertion can be satisfied by echoing a constant.',
  anti_cheat_robustness:
    'Given the assertions, name the cheapest bypass you would attempt. Check whether the tests block it and whether the TQA review records a measured anti-cheat result. Do not infer what an unexported trial attempted.',
  reward_hacking:
    'Trace how the reward is produced end to end, and look for a path that raises it without solving the task: writing the reward file directly, influencing the verifier from the agent container, or exiting in a way that skips assertions.',
  noop_fails_verifier:
    'Confirm the measured no-op reward is 0.0, and that it failed for the right reason: on missing work, not on a crash or setup error that would equally mask a weak verifier.',
  task_solvability:
    'Confirm the oracle reward is exactly 1.0 in a real recorded run rather than asserted.',
  reward_file_correct:
    'Read test.sh in execution order. A reward written before pytest is a hard fail because it can hide AgentTimeoutError. If set -e is active at pytest, require set +e or another construct that captures failure so reward.txt is still written. Confirm reward.txt is written before the final exit. Both exit 0 and the captured pytest code are acceptable after the reward write. Cite the pytest, reward-write, and exit lines.',
  separate_verifier_container:
    'Confirm the verifier builds and runs separately from the agent environment, and that it receives only the intended artifacts.',
  solution_derives_answer:
    'Read the oracle solution and decide whether it computes the answer or embeds it. Constants that match expected outputs are the tell.',
  verifier_deterministic_reliable:
    'Look for order dependence, unseeded randomness, wall-clock or network dependence, and state shared between tests. Then check whether repeated trials of the same model agree.',
  deterministic_reproducible:
    'Check for unpinned dependencies, network fetches at build or run time, and unseeded generation. Then compare rewards across repeated attempts of the same model.',

  // Contract and coverage
  test_coverage:
    'List each requirement the instruction states, then map every one to the assertion that enforces it. Report requirements with no assertion, and assertions enforcing things the instruction never asked for. Both directions matter.',
  tests_align_instruction:
    'Compare what the instruction promises about grading with what the tests actually measure. Any assertion the solver had no way to anticipate from the instruction is a misalignment, even when the assertion is reasonable in isolation.',
  instruction_quality:
    'Read the instruction as a solver with no access to the tests. Mark every place two competent readers could produce different, defensible outputs, then check whether the tests accept both readings or silently pick one. Note any solution hints too.',
  task_specification:
    'Check that output paths, formats, schemas, and success conditions are all stated. Anything the tests require but the instruction omits belongs here.',
  tests_grade_outcomes:
    'Decide whether each assertion checks the required result or forces one particular implementation. Assertions on intermediate files, specific library use, or internal structure are process checks.',
  tests_verify_through_execution:
    'Confirm behaviour is exercised by running code and inspecting outputs, rather than inferred by grepping the solution source.',
  no_typos:
    'Cross-check every path, filename, command, and identifier mentioned in the instruction against the ones the tests and environment actually use.',
  failure_is_agent_fault:
    'For each failing trial, separate agent error from infrastructure error. Setup failures, missing dependencies, and container problems are not the agent\'s fault and must not be graded as difficulty.',
  input_artifacts_real:
    'Check names, paths, sizes, and schemas first. Do not load data or input files by default. If a claimed defect or edge case cannot be verified otherwise, state the exact question and inspect the smallest bounded sample or structured query needed to answer it.',

  // Difficulty
  genuinely_difficult:
    'Decide where the difficulty actually lives: reasoning and diagnosis, or clerical volume. Compare the selected failing assertions with the task\'s stated challenge.',
  difficulty_crux:
    'Identify the intended conceptual crux, then read what the failing agents actually got wrong. The criterion holds only when those coincide.',
  near_misses:
    'For each failure, measure how far off it was. A failure that missed by one record or a rounding difference suggests task misalignment rather than genuine difficulty; use the measured margins.',
  non_clericalness:
    'Judge whether the work is hard to reason about or merely long. Volume of repetitive edits is clerical difficulty and does not count.',
  core_challenge_is_problem:
    'Check whether the selected failures occurred on the intended domain problem or on formatting, plumbing, and environment accidents.',
  not_memorizable:
    'Ask whether a model could produce the answer from recall. Well-known problems with fixed published answers fail this.',
  refusals:
    'Check selected verifier output for explicit refusal or bail-out evidence. If the prepared evidence contains none, do not infer unseen agent behaviour.',
  expert_time_estimate_plausible:
    'Compare the declared estimate against the work the solution actually requires and what the trials took.',

  // Budgets
  low_timeout:
    'Compare each failing trial\'s measured phase durations against the configured budgets. A failure counts as timeout-caused only if the trial actually approached its limit.',
  resources_appropriate:
    'Compare peak measured usage against the configured budgets. Generous headroom is fine; the question is whether a competent solver can finish, not whether the number is tidy.',
  solvable_reasonable_time:
    'Confirm the oracle and the successful trials finished well inside the configured budget.',
};

export interface EvidenceSpec {
  rubric: Rubric;
  batch: Batch;
  /** Concrete instructions for reaching an independent assessment. */
  check: string;
  /** True when a bespoke recipe exists rather than a fallback to intent. */
  hasRecipe: boolean;
}

export const EVIDENCE: EvidenceSpec[] = RUBRICS.map((rubric) => {
  const recipe = RECIPE[rubric.id];
  return {
    rubric,
    batch: BATCH_OVERRIDE[rubric.id] ?? CLUSTER_BATCH[rubric.cluster],
    check: recipe ?? rubric.intent,
    hasRecipe: recipe !== undefined,
  };
});

export const EVIDENCE_BY_ID = new Map(EVIDENCE.map((e) => [e.rubric.id, e]));

export function evidenceByBatch(batch: Batch): EvidenceSpec[] {
  return EVIDENCE.filter((e) => e.batch === batch).sort(
    (a, b) => a.rubric.n - b.rubric.n,
  );
}
