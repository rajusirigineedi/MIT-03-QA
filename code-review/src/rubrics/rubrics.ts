/**
 * The 49 TB3 review rubrics.
 *
 * Source order and intent text come from the "Terminal Bench 3.0 - Task Review
 * Process" spec. The `id` values are the stable names used by the portal. Show
 * reviewers the title and id, never the generated source-order number.
 *
 * One extra id shows up in the pipeline's own output but is not one of the 49
 * reviewable cards — see EXTRA_GATE_IDS.
 */

/** Which of the spec's grouping questions a rubric belongs to. */
export type Cluster =
  | 'oracle' // solvable, and is the oracle honest?
  | 'verifier' // is the verifier strong?
  | 'fairness' // is the grading fair?
  | 'specification' // is the contract sufficient?
  | 'difficulty' // is the difficulty the right kind?
  | 'hygiene' // clean and deterministic?
  | 'docs'; // documented and safe?

/**
 * How a verdict can be reached:
 * - `static`  decidable from task files and the pipeline's own reports
 * - `hybrid`  static facts exist, but the call needs judgement
 * - `llm`     needs reading and reasoning over task and trajectories
 */
export type Decidable = 'static' | 'hybrid' | 'llm';

export interface Rubric {
  /** Source order only. Never use this as a reviewer-facing rubric name. */
  n: number;
  /** Portal criterion id. */
  id: string;
  title: string;
  cluster: Cluster;
  decidable: Decidable;
  /** Listed in spec section 5, "Rubrics that need extra attention". */
  extraAttention: boolean;
  /** The "Review intent" column, near-verbatim. */
  intent: string;
}

/** Columns: n, id, title, cluster, decidable, extraAttention, intent. */
type Row = [number, string, string, Cluster, Decidable, boolean, string];

const ROWS: Row[] = [
  [1, 'task_solvability', 'Task Solvability (Oracle)', 'oracle', 'static', false,
    'The reference solution must solve the task end to end and score a reward of 1.0.'],
  [2, 'noop_fails_verifier', 'Empty solve.sh Fails Verifier', 'verifier', 'static', false,
    'A trivial no-op/empty reference should not pass; the test must require actual work. It should score 0.0.'],
  [3, 'anti_cheat_robustness', 'Verifier Resists Adversarial Agent', 'verifier', 'hybrid', false,
    'The verifier should not be bypassable through obvious shortcuts or leaked information.'],
  [4, 'verifier_deterministic_reliable', 'Verifier is Deterministic and Reliable', 'hygiene', 'hybrid', false,
    'Repeated verification should be stable and not depend on flaky behaviour.'],
  [5, 'solvable_reasonable_time', 'Task is Solvable in Reasonable Time', 'oracle', 'static', false,
    'The task should fit the configured resources/time for a competent solver, and the oracle should solve it in the given time.'],
  [6, 'genuinely_difficult', 'Task is Genuinely Difficult', 'difficulty', 'llm', false,
    'Difficulty should come from the problem, reasoning, diagnosis, or environment and not artificial clerical burden.'],
  [7, 'interesting_real_world', 'Task is Interesting / Real-world', 'difficulty', 'llm', false,
    'The task should represent useful, plausible engineering/research work.'],
  [8, 'tests_grade_outcomes', 'Tests Grade Outcomes Not Process', 'fairness', 'llm', false,
    'Tests should validate the required result, not force an unnecessary or a single implementation method.'],
  [9, 'tests_resist_shortcuts', 'Tests Resist Adversarial Shortcuts', 'verifier', 'hybrid', false,
    'The test suite should not be easy to satisfy by copying, hardcoding, or exploiting a test gap.'],
  [10, 'no_malicious_content', 'No Malicious or Unsafe Content', 'docs', 'llm', false,
    'Task content must not introduce prohibited or unsafe material.'],
  [11, 'tests_verify_through_execution', 'Tests Verify Behavior Through Execution', 'fairness', 'hybrid', false,
    'Behaviour should be exercised by running code and checking outputs, not inferred from source text via grep/string matching.'],
  [12, 'deterministic_reproducible', 'Deterministic and Reproducible', 'hygiene', 'hybrid', false,
    'The task, oracle, and verifier should behave predictably across repeated runs.'],
  [13, 'core_challenge_is_problem', 'Core Challenge is the Actual Problem', 'difficulty', 'llm', true,
    'Task difficulty should reflect the intended domain challenge in the agent trials, not formatting or infrastructure accidents.'],
  [14, 'tests_align_instruction', 'Tests Align with the Instruction', 'fairness', 'hybrid', true,
    'Every tested requirement should be stated or unambiguously defined in the task contract.'],
  [15, 'not_memorizable', 'Not Memorizable from Training Data', 'difficulty', 'llm', false,
    'Success should require solving/exploration rather than recalling a fixed answer.'],
  [16, 'requires_real_agent_interaction', 'Requires Real Agent Interaction', 'difficulty', 'llm', false,
    'The task should require meaningful environment interaction, reasoning, or iteration.'],
  [17, 'reviewable_by_non_specialists', 'Reviewable by Non-specialists', 'docs', 'llm', false,
    'A reviewer with the task context should be able to understand the decision and evidence.'],
  [18, 'instruction_concise_human', 'Instruction is Concise and Human-written', 'docs', 'llm', false,
    'The instruction should be direct, sufficient, and free of unnecessary tutorial content.'],
  [19, 'solution_derives_answer', 'Solution Derives the Answer (No Hardcoding)', 'oracle', 'hybrid', false,
    'The oracle solution demonstrates genuine problem solving rather than a pasted answer.'],
  [20, 'structured_output_when_appropriate', 'Uses Structured Output When Appropriate', 'docs', 'llm', false,
    'Structured outputs should be used where the task genuinely benefits, with a clearly specified schema.'],
  [21, 'no_typos', 'No Typos in Identifiers / Paths / Commands', 'fairness', 'static', false,
    'Names, paths, commands, and technical identifiers should be internally consistent.'],
  [22, 'difficulty_explanation_clear', 'Difficulty Explanation is Clear', 'docs', 'hybrid', false,
    "task.toml's difficulty_explanation should explain intrinsic difficulty and real-world context."],
  [23, 'solution_explanation_summarizes', 'Solution Explanation Summarizes Approach', 'docs', 'hybrid', false,
    "task.toml's solution_explanation should describe high-level strategy and insight, not a line-by-line script dump."],
  [24, 'verification_explanation_clear', 'Verification Explanation is Clear', 'docs', 'hybrid', false,
    "task.toml's verification_explanation should explain what the tests check, why, and any tolerance choices."],
  [25, 'category_tags_meaningful', 'Category and Tags are Meaningful', 'docs', 'hybrid', false,
    "task.toml's metadata should accurately describe the task domain, tags and skills involved."],
  [26, 'task_name_descriptive', 'Task Folder Name is Descriptive', 'docs', 'static', false,
    'The slug/name should clearly describe the task and follow the naming constraint of 3 words.'],
  [27, 'resources_appropriate', 'Timeouts and Resources are Appropriate', 'fairness', 'static', false,
    'Verifier/agent timeouts should give a competent solver realistic headroom without creating artificial difficulty.'],
  [28, 'readme_provides_context', 'README Provides Context', 'docs', 'hybrid', false,
    'When a README is present, it should give useful context without leaking the solution.'],
  [29, 'expert_time_estimate_plausible', 'Expert Time Estimate is Plausible', 'difficulty', 'llm', false,
    'The estimate should reflect best-case expert time consistent with the difficulty of the task.'],
  [30, 'task_toml_schema', 'task.toml Follows Harbor Schema', 'hygiene', 'static', false,
    'Configuration should follow the TB3 contract, using only required fields and in the correct sections.'],
  [31, 'separate_verifier_container', 'Separate Verifier Container', 'verifier', 'static', false,
    'The verifier is isolated from the agent environment and receives only intended artifacts/inputs.'],
  [32, 'no_extraneous_files', 'No Extraneous Files', 'hygiene', 'static', false,
    'The task should contain only required inputs and files; generated artifacts should not be pre-baked unnecessarily.'],
  [33, 'instruction_quality', 'Instruction Quality', 'specification', 'llm', true,
    'The instruction is complete, precise, non-ambiguous, and avoids solution hints.'],
  [34, 'test_coverage', 'Test Coverage', 'fairness', 'llm', true,
    'The test suite covers all essential instructed behaviours and meaningful edge cases.'],
  [35, 'solution_verifiability', 'Solution Verifiability', 'oracle', 'hybrid', false,
    'The solution produces an outcome that the verifier can deterministically validate.'],
  [36, 'input_artifacts_real', 'Input Artifacts are Real', 'hygiene', 'hybrid', false,
    'Declared inputs actually contain the conditions or defects the task expects the agent to handle.'],
  [37, 'task_directory_structure', 'Task Directory Structure', 'hygiene', 'static', false,
    'Folder and file organization follows the TB3 task layout.'],
  [38, 'reward_file_correct', 'Reward File Written Correctly', 'verifier', 'static', true,
    'Reward is created at the correct point during verification and reflects the test result. No pre-emptive reward writing.'],
  [39, 'docker_environment_hygiene', 'Docker / Environment Hygiene', 'hygiene', 'static', false,
    'Builds, dependencies, cleanup, and runtime setup are clean and appropriate.'],
  [40, 'no_false_positives', 'No False Positives', 'verifier', 'llm', true,
    'Incorrect solutions should not pass because of missing, weak, or vacuous tests.'],
  [41, 'no_false_negatives', 'No False Negatives', 'fairness', 'llm', true,
    'Correct solutions should not fail because of mismatched names, brittle assertions, or specification/test defects.'],
  [42, 'failure_is_agent_fault', 'Failure is Agent Fault (Not Infra)', 'fairness', 'llm', false,
    'Observed agent trial failures should be attributable to the agent/task interaction rather than infrastructure issues.'],
  [43, 'task_specification', 'Task Specification', 'specification', 'llm', true,
    'The instruction/spec should be sufficient for a capable agent to succeed.'],
  [44, 'reward_hacking', 'Reward Hacking', 'verifier', 'hybrid', false,
    'A check for exploitable verifier/reward paths. The agent should not be able to game the reward instead of solving the task.'],
  [45, 'difficulty_crux', 'Difficulty Crux', 'difficulty', 'llm', true,
    "The intended difficulty is conceptual and central. When an honest agent fails, it should fail on the task's intended difficulty."],
  [46, 'near_misses', 'Near Misses', 'difficulty', 'llm', true,
    "Failures should fail by a clear margin, not be near-working solutions falling short because of the task's misalignment."],
  [47, 'refusals', 'Refusals', 'docs', 'hybrid', false,
    'Check for unexpected agent refusal patterns and whether they indicate task/instruction issues.'],
  [48, 'low_timeout', 'Low Timeout', 'fairness', 'hybrid', false,
    'Check for failures caused by insufficient runtime headroom rather than task difficulty.'],
  [49, 'non_clericalness', 'Non-Clerical Difficulty', 'difficulty', 'llm', true,
    'Confirm the task is difficult because of reasoning and problem structure, not formatting or repetitive work.'],
];

export const RUBRICS: Rubric[] = ROWS.map(
  ([n, id, title, cluster, decidable, extraAttention, intent]) => ({
    n, id, title, cluster, decidable, extraAttention, intent,
  }),
);

export const RUBRIC_BY_ID = new Map(RUBRICS.map((r) => [r.id, r]));
/**
 * Verdict ids the pipeline emits that are not reviewable rubric cards.
 *
 * `honest_agent_trial` is the frontier-trial gate: it reports whether strong
 * agents solved the task at all. It carries real signal for Task is Genuinely
 * Difficult (`genuinely_difficult`) but is not itself a reviewable card.
 */
export const EXTRA_GATE_IDS = new Set(['honest_agent_trial']);

/** Values the portal treats as passing; anything else owes a "why". */
export const GOOD_VALUES = new Set(['PASS', 'HIGH', 'NA']);

export function isFailingValue(value: string | null | undefined): boolean {
  if (!value) return false;
  return !GOOD_VALUES.has(value.toUpperCase());
}
