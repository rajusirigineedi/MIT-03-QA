/**
 * What it takes to answer each criterion independently.
 *
 * The audit layer asks "did AutoQA show its work?". This layer asks the prior
 * question: "what would I have to read to decide this myself?". Batching the 49
 * by the evidence they draw on means each source file gets read once and the
 * reviewer stays in one frame of mind at a time, instead of thrashing between
 * Dockerfiles and trajectories 49 times.
 */

import { RUBRICS, type Cluster, type Rubric } from '../rubrics/rubrics.ts';

export type Batch = 'contract' | 'verifier' | 'difficulty' | 'hygiene' | 'budget';

export const BATCH_ORDER: Batch[] = [
  'verifier',
  'contract',
  'difficulty',
  'budget',
  'hygiene',
];

export const BATCH_TITLE: Record<Batch, string> = {
  verifier: 'Oracle and verifier mechanics',
  contract: 'Contract, coverage, and grading fairness',
  difficulty: 'Difficulty and realism',
  budget: 'Time and resource budgets',
  hygiene: 'Hygiene, metadata, and documentation',
};

export const BATCH_READS: Record<Batch, string> = {
  verifier:
    'tests/test_outputs.py, tests/test.sh, solution/, measured rewards per trial',
  contract:
    'instruction.md read against tests/test_outputs.py, plus failing assertions',
  difficulty:
    'instruction.md, task.toml difficulty_explanation, agent trajectories',
  budget: 'task.toml budgets against measured per-phase trial durations',
  hygiene: 'task.toml, Dockerfiles, repository file listing',
};

/** Criteria whose natural batch differs from their cluster's default. */
const BATCH_OVERRIDE: Record<string, Batch> = {
  solvable_reasonable_time: 'budget',
  resources_appropriate: 'budget',
  low_timeout: 'budget',
};

const CLUSTER_BATCH: Record<Cluster, Batch> = {
  oracle: 'verifier',
  verifier: 'verifier',
  fairness: 'contract',
  specification: 'contract',
  difficulty: 'difficulty',
  hygiene: 'hygiene',
  docs: 'hygiene',
};

/**
 * How to reach an independent verdict, for the criteria where "use judgement"
 * is not a useful instruction. Everything else falls back to its intent text.
 */
const RECIPE: Record<string, string> = {
  // Verifier strength
  no_false_positives:
    'Look for a wrong solution the tests would still pass. Walk each assertion and ask what it does NOT constrain: expected values hardcoded where the agent could read them out of the test file, checks on row counts but not row contents, format checks that never verify the computation, assertions on a sample where the whole output matters. Conclude with either a concrete passing-but-wrong strategy, or the specific assertion that blocks each bypass you considered.',
  no_false_negatives:
    'Look for a correct solution the tests would still fail. Check assertions for over-specification: exact float equality, dict or list ordering, whitespace and trailing-newline sensitivity, one arbitrary spelling of an output the instruction leaves open. Then read the actual failing assertions from the trials and decide, per failure, whether the agent was wrong or the test was.',
  tests_resist_shortcuts:
    'Ask what the cheapest way to satisfy each assertion is. Check whether test files, expected outputs, or the solution are reachable from the agent workspace, and whether any assertion can be satisfied by echoing a constant.',
  anti_cheat_robustness:
    'Given the assertions, name the cheapest bypass you would attempt, then confirm the recorded cheat trial actually exercised that bypass. A cheat trial that tried something else does not clear this.',
  reward_hacking:
    'Trace how the reward is produced end to end, and look for a path that raises it without solving the task: writing the reward file directly, influencing the verifier from the agent container, or exiting in a way that skips assertions.',
  noop_fails_verifier:
    'Confirm the measured no-op reward is 0.0, and that it failed for the right reason: on missing work, not on a crash or setup error that would equally mask a weak verifier.',
  task_solvability:
    'Confirm the oracle reward is exactly 1.0 in a real recorded run rather than asserted.',
  reward_file_correct:
    'Check when the reward file is written relative to the assertions. Any write before tests complete, or any default value that survives a test failure, is a defect.',
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
    'Confirm the declared input data actually contains the conditions the task claims. If the instruction promises specific defects or edge cases, verify they are present in the input.',

  // Difficulty
  genuinely_difficult:
    'Decide where the difficulty actually lives: reasoning and diagnosis, or clerical volume. Read a trajectory and see what the agent spent its effort on.',
  difficulty_crux:
    'Identify the intended conceptual crux, then read what the failing agents actually got wrong. The criterion holds only when those coincide.',
  near_misses:
    'For each failure, measure how far off it was. A failure that missed by one record or a rounding difference suggests task misalignment rather than genuine difficulty; use the measured margins.',
  non_clericalness:
    'Judge whether the work is hard to reason about or merely long. Volume of repetitive edits is clerical difficulty and does not count.',
  core_challenge_is_problem:
    'Check whether the agents\' effort went to the intended domain problem or to formatting, plumbing, and environment accidents.',
  not_memorizable:
    'Ask whether a model could produce the answer from recall. Well-known problems with fixed published answers fail this.',
  refusals:
    'Scan trajectories for refusal or bail-out patterns, then decide whether they point to a task or instruction defect rather than model behaviour.',
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
  /** Concrete instructions for reaching an independent verdict. */
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
