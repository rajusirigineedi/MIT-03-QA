# Human review: payout-reconciliation

## Evidence-group conclusions

### Solvability and oracle honesty

Criteria 1 `task_solvability`, 5 `solvable_reasonable_time`, 19 `solution_derives_answer`, and 35 `solution_verifiability` pass. The oracle earned reward 1, and `solution/reconcile.py` derives all four artifacts from the six input files rather than embedding expected artifacts. All 16 honest trials also finished within the 1,800-second agent budget.

### Verifier strength

Criteria 2 `noop_fails_verifier`, 31 `separate_verifier_container`, 38 `reward_file_correct`, and 44 `reward_hacking` pass. Criteria 3 `anti_cheat_robustness`, 9 `tests_resist_shortcuts`, and 40 `no_false_positives` fail. The separate verifier and reward flow are sound, but the assertions accept static artifacts without `/app/reconcile` and accept equal unexplained adjustments on both sides of the reconciliation.

### Grading fairness

Criteria 8 `tests_grade_outcomes`, 14 `tests_align_instruction`, 21 `no_typos`, 33 `instruction_quality`, 41 `no_false_negatives`, 42 `failure_is_agent_fault`, and 43 `task_specification` pass. Criterion 11 `tests_verify_through_execution` fails, and criterion 34 `test_coverage` is MOD. The tested assertions are stated in the instruction and are tolerant of harmless output variation, but the required executable is never run and several instructed semantics are only partly enforced.

### Difficulty and realism

Criteria 7 `interesting_real_world`, 13 `core_challenge_is_problem`, 15 `not_memorizable`, 16 `requires_real_agent_interaction`, 29 `expert_time_estimate_plausible`, 46 `near_misses`, and 49 `non_clericalness` pass. Criterion 6 `genuinely_difficult` fails, and criterion 45 `difficulty_crux` is LOW. The accounting work is realistic and conceptual, but both model families solved all eight trials and no failure demonstrates the claimed crux.

### Cleanliness and determinism

Criteria 4 `verifier_deterministic_reliable`, 12 `deterministic_reproducible`, 27 `resources_appropriate`, 30 `task_toml_schema`, 32 `no_extraneous_files`, 36 `input_artifacts_real`, 37 `task_directory_structure`, 39 `docker_environment_hygiene`, and 48 `low_timeout` pass. Both images use fixed inputs and pinned Python packages, and the selected controls each produced seven passing tests in 0.04 seconds. The agent image exposes only the task inputs under `/data`; no solution or verifier file is copied into it.

### Documentation and safety

Criteria 10 `no_malicious_content`, 17 `reviewable_by_non_specialists`, 18 `instruction_concise_human`, 20 `structured_output_when_appropriate`, 22 `difficulty_explanation_clear`, 23 `solution_explanation_summarizes`, 25 `category_tags_meaningful`, 26 `task_name_descriptive`, 28 `readme_provides_context`, and 47 `refusals` pass. Criterion 24 `verification_explanation_clear` is LOW because its claim that ending-balance checks prevent plugs is false. The instruction otherwise states the paths, schemas, signs, edge cases, and safety constraints clearly.

## Criterion decisions

### 1. Task Solvability (Oracle) (`task_solvability`)
TQA review: PASS. TQA recorded an oracle reward of 1.0.
Human rating: PASS
Reason: The recorded oracle run earned reward 1. `solution/solve.sh` invokes the deterministic reconciliation program, which emits every artifact consumed by the seven verifier tests.
Evidence:
  - The dossier records `task_solvability` as PASS and the oracle reward as 1.0.
  - `/solution/solve.sh` runs `/solution/reconcile.py` after creating `/logs/artifacts`.

### 2. Empty solve.sh Fails Verifier (`noop_fails_verifier`)
TQA review: PASS. TQA recorded a no-op reward of 0.
Human rating: PASS
Reason: Missing artifacts cause the pytest fixtures to fail when they open the four required paths. The measured no-op reward was 0, so an empty submission cannot receive credit.
Evidence:
  - The dossier records `noop_fails_verifier` as PASS with reward 0.
  - `/tests/test_outputs.py` opens all four declared artifacts before evaluating their contents.

### 3. Verifier Resists Adversarial Agent (`anti_cheat_robustness`)
TQA review: PASS. TQA cited a cheat-trial reward of 0.
Human rating: FAIL
Reason: The measured cheat trial did not find a bypass, but source inspection proves two simple ones. The verifier accepts fixed artifacts without the required `/app/reconcile`, and criterion 40 describes an unexplained-plug construction that passes all assertions. A single unsuccessful cheat attempt does not close either path.
Evidence:
  - `/tests/test.sh` runs only `pytest test_outputs.py -q`; it never invokes `/app/reconcile`.
  - `test_a_proof_balances_and_categories` accepts any equal increase to book-side and bank-side totals.
  - The dossier records cheat reward 0 but provides no attempted strategy.
Required fix: Run `/app/reconcile` in a clean artifact directory and validate exact permitted adjustment semantics, including rejection of unlinked plug rows.

### 4. Verifier is Deterministic and Reliable (`verifier_deterministic_reliable`)
TQA review: PASS. TQA found fixed fixtures, no runtime network use, and deterministic cent-tolerant assertions.
Human rating: PASS
Reason: The verifier reads static local fixtures and artifacts with no clock, randomness, or network dependency. Both selected passing controls produced the same seven-test result in 0.04 seconds.
Evidence:
  - `/tests/Dockerfile` pins `pytest==8.3.2` and copies the fixtures and tests into the verifier image.
  - Both selected controls report `7 passed in 0.04s` and reward 1.

### 5. Task is Solvable in Reasonable Time (`solvable_reasonable_time`)
TQA review: PASS. TQA found the reference implementation complete and the three-hour expert estimate plausible.
Human rating: PASS
Reason: Every honest attempt solved the task within the configured budget. The slowest attempt used 586 of 1,800 seconds, leaving substantial headroom.
Evidence:
  - The dossier records 16/16 solves and peak agent use of 33%.
  - `/task.toml` sets `agent.timeout_sec = 1800` and estimates three expert hours.

### 6. Task is Genuinely Difficult (`genuinely_difficult`)
TQA review: PASS. TQA based its result on the accounting concepts and multi-file integration.
Human rating: FAIL
Reason: The concepts are specialized, but the measured benchmark outcome does not support genuine difficulty for the target agents. Claude Opus solved 8/8 trials and GPT-5.4 solved 8/8 trials, with no errors or failed assertions. The fastest solve took 142 seconds and the slowest used one-third of the budget.
Evidence:
  - The dossier records a 16/16 honest-agent solve rate across two model families.
  - Trial durations range from 142 to 586 seconds against a 1,800-second budget.
Required fix: Add unseen cases or larger varied inputs that require general reconciliation logic and produce meaningful honest-agent failures.

### 7. Task is Interesting / Real-world (`interesting_real_world`)
TQA review: PASS. TQA identified merchant month-end cash reconciliation as a real accounting workflow.
Human rating: PASS
Reason: Reconciling bank, ledger, and processor data is a plausible finance operations task. Payout fees, chargebacks, reserves, NSF reversals, and prior-period items are coherent parts of that workflow.
Evidence:
  - `/instruction.md` defines a January close across bank, GL, and payout records.
  - `/task.toml` names staff accountants and payment operations analysts as the real-world users.

### 8. Tests Grade Outcomes Not Process (`tests_grade_outcomes`)
TQA review: PASS. TQA found that tests inspect required output artifacts without prescribing a language or implementation.
Human rating: PASS
Reason: The assertions judge CSV and JSON results rather than source layout, library choice, or algorithm. Failure to execute the required command is a coverage defect, not an over-prescriptive process check.
Evidence:
  - `/tests/test_outputs.py` reads only `matches.csv`, `reconciling_items.csv`, `reconciliation.json`, and `carryforward.json`.
  - No test scans agent source or requires a particular programming language.

### 9. Tests Resist Adversarial Shortcuts (`tests_resist_shortcuts`)
TQA review: PASS. TQA cited verifier isolation, hidden test fixtures, and checks for the main accounting cases.
Human rating: FAIL
Reason: The fixed input data is visible to the agent, so hidden duplicate fixtures do not prevent hardcoded artifacts. A submission can omit `/app/reconcile` and leave four precomputed files in `/logs/artifacts`. It can also add equal, unlinked `timing_difference` rows to the book and bank sides because `test_a_proof_balances_and_categories` checks only the adjusted tie and category allowlist. Both shortcuts violate the executable and no-unexplained-plug requirements while preserving all seven test results.
Evidence:
  - `/environment/Dockerfile` copies the complete fixed dataset to `/data`.
  - `/tests/test.sh` never runs `/app/reconcile`.
  - `test_a_proof_balances_and_categories` does not reject unlinked or offsetting `timing_difference` rows.
Required fix: Execute the submitted command on varied hidden inputs and reject reconciling items that lack a documented source and exact expected accounting effect.

### 10. No Malicious or Unsafe Content (`no_malicious_content`)
TQA review: PASS. TQA found no credential access, external calls, obfuscation, or host escape.
Human rating: PASS
Reason: The task reads local financial fixtures and writes local artifacts. Its Dockerfiles and scripts contain no unsafe host operations, secret access, or runtime network calls.
Evidence:
  - `/instruction.md` prohibits network access.
  - `/tests/test.sh` runs only local pytest and writes verifier logs and reward.

### 11. Tests Verify Behavior Through Execution (`tests_verify_through_execution`)
TQA review: PASS. TQA treated pytest's semantic inspection of generated files as execution-based verification.
Human rating: FAIL
Reason: Pytest executes, but the submitted behavior does not. The instruction requires `/app/reconcile` to run non-interactively and produce the artifacts, while `test.sh` only reads whatever files already exist. Correct static files with no executable receive the same reward as a working implementation.
Evidence:
  - `/instruction.md` requires an executable at `/app/reconcile` that produces all four files.
  - `/tests/test.sh` runs `pytest test_outputs.py -q` without clearing artifacts or invoking the command.
Required fix: Clear `/logs/artifacts`, execute `/app/reconcile`, require a successful exit, and then run pytest.

### 12. Deterministic and Reproducible (`deterministic_reproducible`)
TQA review: PASS. TQA cited static inputs, pinned Python dependencies, and deterministic logic.
Human rating: PASS
Reason: Task inputs are bundled CSV and JSON files, and no run-time service affects the result. The oracle uses fixed transformations and writes stable structured outputs.
Evidence:
  - `/environment/Dockerfile` uses `python:3.11-slim` and pins `pandas==2.2.2`.
  - `/solution/reconcile.py` has no random, time, or network-dependent code.

### 13. Core Challenge is the Actual Problem (`core_challenge_is_problem`)
TQA review: PASS. TQA identified payout decomposition, signs, NSF treatment, partial settlement, and prior carryforward as the intended challenge.
Human rating: PASS
Reason: The work encoded by the instruction and oracle is accounting reconciliation rather than formatting or infrastructure repair. The verifier shortcuts reduce its enforcement, but the task itself still centers on the stated domain problem.
Evidence:
  - `/solution/reconcile.py` implements payout bridges, prior-item consumption, NSF reopening, and the four-column proof.
  - `/instruction.md` defines those same accounting requirements.

### 14. Tests Align with the Instruction (`tests_align_instruction`)
TQA review: PASS. TQA mapped tests a through g to the instruction's stated requirements.
Human rating: PASS
Reason: Each assertion imposes a requirement that is stated directly or derivable from the visible records. The hardcoded identifiers in tests d through g name cases present in `/data`; they do not introduce hidden business rules. Missing enforcement of other requirements is addressed under coverage.
Evidence:
  - `test_e_partial_settlement_remainder` enforces the instruction's explicit `INV-1007` positive 300 carryforward example.
  - `test_g_partition_of_all_ids` enforces the stated exactly-once GL and bank partition.

### 15. Not Memorizable from Training Data (`not_memorizable`)
TQA review: PASS. TQA found the combined dataset and reconciliation cases task-specific.
Human rating: PASS
Reason: The answer depends on synthetic IDs, dates, and amounts supplied in six local files. General accounting knowledge helps, but recall cannot supply the required partition and balances without using those inputs.
Evidence:
  - `/environment/data` contains task-specific bank, GL, payout, line-item, opening, and prior-reconciliation records.
  - `test_g_partition_of_all_ids` requires the task-specific IDs exactly once.

### 16. Requires Real Agent Interaction (`requires_real_agent_interaction`)
TQA review: PASS. TQA found that agents must inspect inputs, implement a program, run it, and debug the tie-out.
Human rating: PASS
Reason: A solver must at least inspect several local files and create structured outputs. A compliant solution also requires creating and running `/app/reconcile`; the verifier's failure to enforce that command does not remove it from the written task.
Evidence:
  - `/instruction.md` requires reading six `/data` inputs and creating an executable plus four artifacts.
  - Selected trials took 142 to 586 seconds rather than returning an immediate answer.

### 17. Reviewable by Non-specialists (`reviewable_by_non_specialists`)
TQA review: PASS. TQA cited detailed explanations and small human-readable fixtures.
Human rating: PASS
Reason: The instruction explains the adjustment directions, output schemas, and edge cases with a worked partial-settlement example. The task metadata maps each accounting step to the reference and tests.
Evidence:
  - `/instruction.md` explains the four-column proof and carryforward sign convention.
  - `/task.toml` includes specific solution and verification explanations.

### 18. Instruction is Concise and Human-written (`instruction_concise_human`)
TQA review: PASS. TQA found the detail justified by the structured accounting contract.
Human rating: PASS
Reason: The instruction is long because it defines four schemas and several accounting cases, but the content is operational rather than filler. It states paths, rules, and examples in direct language.
Evidence:
  - `/instruction.md` organizes inputs, core logic, four outputs, and rules in separate sections.
  - The repeated partial-settlement sign explanation resolves a known ambiguity in a load-bearing value.

### 19. Solution Derives the Answer (No Hardcoding) (`solution_derives_answer`)
TQA review: PASS. TQA found that the oracle reads inputs and computes the reconciliation rather than emitting prebaked output.
Human rating: PASS
Reason: The oracle builds lookups from the input records, calculates payout nets and balances, and classifies each record. Domain literals identify the fixed month and known record patterns, but expected artifact contents are not pasted into the solution.
Evidence:
  - `/solution/reconcile.py` reads every declared input from `/data`.
  - Its four output writers serialize the computed `matches`, `items`, `recon`, and `carry` collections.

### 20. Uses Structured Output When Appropriate (`structured_output_when_appropriate`)
TQA review: PASS. TQA found exact CSV headers, JSON keys, enums, and sign rules.
Human rating: PASS
Reason: Reconciliation results benefit from machine-readable tables and a proof object. The instruction defines both CSV headers, the reconciliation JSON keys, and the carryforward object fields.
Evidence:
  - `/instruction.md` gives normative schemas for all four artifacts.
  - `test_a_proof_balances_and_categories` validates the proof fields and enumerated labels.

### 21. No Typos in Identifiers / Paths / Commands (`no_typos`)
TQA review: PASS. TQA cross-checked paths, file names, fields, and identifiers.
Human rating: PASS
Reason: The instruction, Dockerfiles, oracle, and tests use the same `/data` and `/logs/artifacts` paths and the same schema names. The fixed bank, invoice, payout, and prior-item IDs in the tests exist in the prepared inputs.
Evidence:
  - `/environment/data/bank_statement.csv` contains `BK-001` through `BK-008` used by the tests.
  - `/instruction.md` and `/tests/test_outputs.py` agree on every output filename.

### 22. Difficulty Explanation is Clear (`difficulty_explanation_clear`)
TQA review: PASS. TQA found that the metadata explains the payout bridge and interacting accounting cases.
Human rating: PASS
Reason: The explanation names the net-to-gross mismatch, timing differences, NSF reversal, partial settlement, and stateful prior items. It also identifies the month-end accounting roles that perform this work.
Evidence:
  - `/task.toml` `difficulty_explanation` states the core formula and the common wrong approaches.

### 23. Solution Explanation Summarizes Approach (`solution_explanation_summarizes`)
TQA review: PASS. TQA matched the stated strategy and amounts to the reference implementation.
Human rating: PASS
Reason: The explanation summarizes the payout, exception, carryforward, and balance logic at a useful level. Its stated totals and treatment match `solution/reconcile.py`.
Evidence:
  - `/task.toml` `solution_explanation` gives the final book and bank adjustment totals.
  - `/solution/reconcile.py` computes those totals from categorized items.

### 24. Verification Explanation is Clear (`verification_explanation_clear`)
TQA review: PASS. TQA found a test-by-test map and a detailed tolerance rationale.
Human rating: LOW
Reason: The explanation accurately describes tests a through g and the one-cent tolerance. It incorrectly says hardcoded ending balances prevent plugs. Equal unlinked adjustments on both sides preserve the checked ending balances and tie, so the explanation overstates verifier strength and omits the unexecuted `/app/reconcile` requirement.
Evidence:
  - `/task.toml` `verification_explanation` says hardcoded ending balances prevent plugs.
  - `test_a_proof_balances_and_categories` permits equal added book-side and bank-side adjustments.
  - `/tests/test.sh` does not execute `/app/reconcile`.
Required fix: State the verifier's actual limits, then add tests for the executable and for the exact allowed adjustment set before claiming plug resistance.

### 25. Category and Tags are Meaningful (`category_tags_meaningful`)
TQA review: PASS. TQA called `data_processing` defensible and found the finance tags specific.
Human rating: PASS
Reason: The prepared task actually uses category `business`, not the `data_processing` value quoted by TQA. `business`, `finance_accounting_workflows`, and the five accounting and data-processing tags accurately describe the work.
Evidence:
  - `/task.toml` sets `category = "business"` and `sub_category = "finance_accounting_workflows"`.
  - Tags include accounting, reconciliation, payment processing, and finance.

### 26. Task Folder Name is Descriptive (`task_name_descriptive`)
TQA review: PASS. TQA inferred a descriptive slug from the instruction title because it did not identify the repository folder.
Human rating: PASS
Reason: The prepared task name is `payout-reconciliation`, which directly names its subject and action. It is concise and not a generic batch or task number.
Evidence:
  - The prepared dossier and working-copy directory identify the task as `payout-reconciliation`.

### 27. Timeouts and Resources are Appropriate (`resources_appropriate`)
TQA review: PASS. TQA found the 1,800-second agent and 300-second verifier limits ample.
Human rating: PASS
Reason: The slowest agent run consumed 33% of its budget, and verifier use peaked at 9%. No trial approached a resource limit.
Evidence:
  - The dossier records peak agent use of 33% and verifier use of 9%.
  - `/task.toml` configures 1,800 and 300 seconds respectively.

### 28. README Provides Context (`readme_provides_context`)
TQA review: No verdict. TQA requested inspection only if a README exists.
Human rating: PASS
Reason: No README is present in the task working copy, so this conditional criterion does not impose a missing-document requirement. Context is supplied by `instruction.md` and the metadata explanations.
Evidence:
  - The complete prepared file inventory contains no README.

### 29. Expert Time Estimate is Plausible (`expert_time_estimate_plausible`)
TQA review: PASS. TQA considered three hours plausible for an expert to inspect, implement, and validate the workflow.
Human rating: PASS
Reason: A human expert could reasonably spend three hours understanding six inputs, implementing four output formats, and checking the accounting tie. Faster agent trials do not make the human estimate implausible.
Evidence:
  - `/task.toml` estimates 3.0 hours and names relevant payout-reconciliation experience.
  - The oracle implementation is about 260 lines plus structured output handling.

### 30. task.toml Follows Harbor Schema (`task_toml_schema`)
TQA review: PASS. TQA found only recognized root, metadata, agent, verifier, and environment fields.
Human rating: PASS
Reason: The configuration has schema version 1.2, four declared artifacts, and properly separated runtime sections. No unknown or misplaced field appears in the prepared file.
Evidence:
  - `/task.toml` defines `[metadata]`, `[agent]`, `[verifier]`, and `[environment]` with the expected settings.

### 31. Separate Verifier Container (`separate_verifier_container`)
TQA review: PASS. TQA found `environment_mode = "separate"` and verifier-local fixtures and tests.
Human rating: PASS
Reason: The verifier image contains pytest, fixture copies, and test scripts, while agent artifacts cross the boundary through the declared paths. Agent-visible files do not include the verifier or oracle.
Evidence:
  - `/task.toml` sets verifier `environment_mode = "separate"`.
  - `/tests/Dockerfile` copies fixtures and tests only into `/tests`.
  - `/environment/Dockerfile` copies only `environment/data` into `/data`.

### 32. No Extraneous Files (`no_extraneous_files`)
TQA review: PASS. TQA accounted for every task file as an input, solution, verifier, or required scaffold.
Human rating: PASS
Reason: The prepared working copy contains only the instruction, task metadata, two Dockerfiles, six inputs with six verifier copies, the oracle, and the test harness. No notes, generated answers, editor files, or unused helpers are present.
Evidence:
  - The complete prepared inventory contains 20 files, all referenced by the task or build configuration.
  - `/solution/reconcile.py` is invoked directly by `/solution/solve.sh`.

### 33. Instruction Quality (`instruction_quality`)
TQA review: HIGH. TQA found the contract complete, precise, unambiguous, and free of implementation prescriptions.
Human rating: PASS
Reason: The instruction defines all input and output paths, exact schemas, category sets, the balancing equation, and the treatment of each edge case. Its worked `INV-1007` example removes the partial-settlement sign ambiguity without prescribing an implementation.
Evidence:
  - `/instruction.md` defines the carryforward and reconciling-item sign conventions separately.
  - It states the executable, determinism, network, and exactly-once partition requirements.

### 34. Test Coverage (`test_coverage`)
TQA review: MOD. TQA found strong artifact checks but noted that the suite never invokes `/app/reconcile`.
Human rating: MOD
Reason: The seven tests cover balances, payout decomposition, category totals, NSF linkage, partial settlement, prior items, and the GL and bank partition. They never run the required executable. They also permit unexplained offsetting `timing_difference` rows, accept NSF reopening in either reconciling items or carryforward instead of requiring carryforward, and check fee component magnitudes without enforcing their book-side directions. These gaps leave material instructed behavior ungraded.
Evidence:
  - `/tests/test.sh` runs pytest without invoking `/app/reconcile`.
  - `test_d_nsf_reopens_receivable` uses `reopened or reopened_cf` although the instruction requires carryforward.
  - `test_c_category_totals_not_lumped` compares absolute totals without checking direction or sign.
Required fix: Execute the command and add exact semantic checks for allowed items, directions, carryforward presence, and rejection of unexplained rows.

### 35. Solution Verifiability (`solution_verifiability`)
TQA review: PASS. TQA found that the oracle computes deterministic artifacts from every declared input.
Human rating: PASS
Reason: The oracle produces concrete CSV and JSON files that pytest can parse and compare with fixture-derived values. Its own balance assertion catches a failure before output serialization.
Evidence:
  - `/solution/reconcile.py` asserts adjusted book and bank balances differ by no more than 0.01.
  - Both selected controls pass all seven artifact tests.

### 36. Input Artifacts are Real (`input_artifacts_real`)
TQA review: PASS. TQA classified the task as greenfield and found no missing defect-state artifact.
Human rating: PASS
Reason: The six small input files contain the stated bank, GL, payout, line-item, prior-item, and opening-balance conditions. The processor payout and partial-wire cases appear in the records rather than only in prose.
Evidence:
  - `/environment/data/processor_payouts.csv` contains P1, P2, and after-month-end P3.
  - `/environment/data/bank_statement.csv` contains the NSF pair, partial wire, prior clearings, and bank fee.

### 37. Task Directory Structure (`task_directory_structure`)
TQA review: PASS. TQA dismissed the soft extra-solution-file warning because `solve.sh` invokes `reconcile.py`.
Human rating: PASS
Reason: The task uses the expected `environment`, `solution`, and `tests` directories plus root instruction and metadata files. The helper under `solution` is part of the executable oracle, not an orphaned file.
Evidence:
  - `/solution/solve.sh` calls `python3 "$(dirname "$0")/reconcile.py"`.
  - Both Dockerfiles and `test.sh` occupy their expected task locations.

### 38. Reward File Written Correctly (`reward_file_correct`)
TQA review: PASS. TQA traced pytest, `PIPESTATUS`, conditional reward writing, and normal script completion.
Human rating: PASS
Reason: `test.sh` runs pytest before writing any reward and captures pytest's status from the tee pipeline. It writes 1 only for status zero and 0 otherwise, then reaches the end of the script after the reward exists.
Evidence:
  - `/tests/test.sh` runs `pytest test_outputs.py -q 2>&1 | tee /logs/verifier/pytest.log`.
  - It assigns `rc=${PIPESTATUS[0]}` before the conditional reward write.
  - The script uses `set -u`, not `set -e`, so a failed pytest still reaches the reward branch.

### 39. Docker / Environment Hygiene (`docker_environment_hygiene`)
TQA review: PASS. TQA found no test leakage or embedded artifact creation in either Dockerfile.
Human rating: PASS
Reason: The agent image installs its declared tools, cleans apt metadata, and copies only input data. The verifier image pins pytest and copies its fixtures and harness without runtime installation.
Evidence:
  - `/environment/Dockerfile` removes `/var/lib/apt/lists` and copies only `data/`.
  - `/tests/Dockerfile` pins `pytest==8.3.2` and marks `test.sh` executable.

### 40. No False Positives (`no_false_positives`)
TQA review: PASS. TQA cited the no-op and cheat rewards plus coverage of the main reconciliation outcomes.
Human rating: FAIL
Reason: The instruction forbids unexplained plugs. Add a `timing_difference` row of +100 with direction `book` and another +100 row with direction `bank`, both with empty ID fields, then raise both reported adjustment totals and adjusted balances by 100. `test_a_proof_balances_and_categories` accepts the category, recomputes both sums, and sees equal adjusted balances; tests b through g are unchanged because the rows carry no IDs or case-specific categories. No recorded trial used this path, so the false positive is source-proven rather than trial-confirmed. Static correct artifacts with no `/app/reconcile` form a second passing-but-noncompliant submission.
Evidence:
  - `/instruction.md` requires every dollar of difference to be explained with no plug.
  - `test_a_proof_balances_and_categories` allows `timing_difference` and validates only sums and equality.
  - `/tests/test.sh` neither clears artifacts nor invokes `/app/reconcile`.
Required fix: Validate the exact expected adjustment set and provenance, reject unlinked rows, and run the required executable in a clean artifact directory.

### 41. No False Negatives (`no_false_negatives`)
TQA review: PASS. TQA found semantic checks, documented conventions, and no brittle ordering or exact-float requirements.
Human rating: PASS
Reason: Assertions use a one-cent bound, semicolon-delimited sets, and order-insensitive searches. The instruction pins the positive 300 partial carryforward and the allowed labels, so the exact checks do not reject a compliant alternative. All 16 independent trials passed, and no failing trial exposes another path.
Evidence:
  - `TOL = 0.01`, `_split`, and set comparisons avoid float and ordering brittleness.
  - The dossier records 16/16 passing honest trials and no failed assertions.

### 42. Failure is Agent Fault (Not Infra) (`failure_is_agent_fault`)
TQA review: PASS. TQA described a reward-0 run with clean Harbor completion and no infrastructure error.
Human rating: PASS
Reason: The prepared evidence contains no honest-agent failure, so TQA's claimed reward-0 agent failure is not part of the selected trial record. Both model families solved 8/8 trials, no run errored, and measured resource use stayed well below limits. There is no infrastructure-caused failure to charge to the task.
Evidence:
  - The dossier states that no failing trial output was found.
  - Honest-agent solve rate is 16/16 with zero reported errors.

### 43. Task Specification (`task_specification`)
TQA review: No verdict. TQA requested a check of paths, formats, schemas, and success conditions.
Human rating: PASS
Reason: The specification states the input location, executable path, artifact directory, exact file formats, allowed enums, balance proof, sign conventions, and treatment of all special cases. The verifier's incomplete enforcement does not make the written contract insufficient.
Evidence:
  - `/instruction.md` supplies exact headers for both CSVs and an exact key template for `reconciliation.json`.
  - Its rules define deterministic execution, partial settlement, and NSF behavior.

### 44. Reward Hacking (`reward_hacking`)
TQA review: No verdict. TQA requested an end-to-end reward-path audit.
Human rating: PASS
Reason: The separate verifier owns `/logs/verifier/reward.txt`, and the agent can supply only declared artifacts. `test.sh` derives reward from pytest's captured exit status after the tests finish. The false-positive artifact strategies affect test adequacy, but they do not let the agent write or bypass the reward mechanism itself.
Evidence:
  - `/task.toml` configures a separate, no-network verifier.
  - `/tests/test.sh` writes reward only after reading `${PIPESTATUS[0]}`.

### 45. Difficulty Crux (`difficulty_crux`)
TQA review: No verdict. TQA requested comparison of the intended conceptual crux with honest-agent failures.
Human rating: LOW
Reason: The intended crux is payout bridge decomposition combined with NSF, partial settlement, and prior-item state. No honest agent failed: both model families solved all eight trials. The source establishes a conceptual center, but the required trial evidence that failures occur there does not exist.
Evidence:
  - `/task.toml` `difficulty_explanation` names payout decomposition and interacting exceptions as the crux.
  - The dossier records 16/16 solves and no failing output.
Required fix: Add cases that reliably expose mistakes in the intended accounting logic, then confirm failed trials break on those cases rather than formatting or plumbing.

### 46. Near Misses (`near_misses`)
TQA review: No verdict. TQA requested measured failure margins.
Human rating: PASS
Reason: There are no failed honest trials and therefore no near-working solution rejected by a brittle assertion. The evidence supports no near-miss fairness defect.
Evidence:
  - The dossier records no failing trial output among 16 attempts.

### 47. Refusals (`refusals`)
TQA review: No verdict. TQA requested evidence of explicit refusal or bail-out behavior.
Human rating: PASS
Reason: Both selected controls completed the task and received reward 1. The prepared outputs contain no refusal, early bailout, or task-induced inability to proceed.
Evidence:
  - Both selected `result.json` files report verifier reward 1.
  - Both selected verifier outputs report seven passing tests.

### 48. Low Timeout (`low_timeout`)
TQA review: No verdict. TQA requested comparison of failed-trial duration with configured limits.
Human rating: PASS
Reason: No trial failed or approached its timeout. Peak agent use was 33% and peak verifier use was 9%, so the limits did not create artificial failures.
Evidence:
  - The dossier records 586 seconds as the maximum agent time against 1,800 seconds.
  - Verifier runs peaked at 28 seconds against 300 seconds.

### 49. Non-Clerical Difficulty (`non_clericalness`)
TQA review: No verdict. TQA requested a judgment on reasoning difficulty versus repetitive volume.
Human rating: PASS
Reason: The task requires reasoning about net and gross cash, timing, signs, and state carried between periods. The fixture volume is small, so difficulty does not come from repetitive edits or data entry.
Evidence:
  - The largest input tables contain eight records each.
  - `/solution/reconcile.py` branches by accounting event rather than repeating mechanical transformations.

## Reviewer Agent notes

- Too-easy trial signal: confirmed; the dossier records 16/16 solves with no errors.
- Partial-settlement sign ambiguity resolved in the shipped instruction: confirmed by the explicit positive 300 carryforward example.
- One-cent tolerance is not over-strict: confirmed by `TOL = 0.01`, cent-valued fixtures, and 16/16 solves.
- No solution or verifier leakage into the agent image: confirmed by `/environment/Dockerfile`, which copies only `/data`.
- Shipped fairness gate was stale or absent: not checked because prepared primary evidence was sufficient for each rating.
- Verifier fully enforces the instruction: refuted because it never runs `/app/reconcile` and permits unexplained plug rows.

These notes did not decide any human rating.

Review:

TQA Status: TQA marked 41 of 49 rubrics and generally passed the task, with Test Coverage at MOD. Claude Opus solved 8/8 and GPT-5.4 solved 8/8; oracle reward was 1, no-op and cheat rewards were 0, no infrastructure errors occurred, and no honest trial failed.
Reviewer Agent Status: The Reviewer Agent recommended shipping. It treated 16/16 solves as informational difficulty evidence and concluded that the instruction fully determined the verifier.

My Analysis:

Verifier Resists Adversarial Agent: FAIL

The measured cheat trial did not find a bypass, but source inspection proves two simple ones. The verifier accepts fixed artifacts without the required `/app/reconcile`, and criterion 40 describes an unexplained-plug construction that passes all assertions. A single unsuccessful cheat attempt does not close either path.

Task is Genuinely Difficult: FAIL

The concepts are specialized, but the measured benchmark outcome does not support genuine difficulty for the target agents. Claude Opus solved 8/8 trials and GPT-5.4 solved 8/8 trials, with no errors or failed assertions. The fastest solve took 142 seconds and the slowest used one-third of the budget.

Tests Resist Adversarial Shortcuts: FAIL

The fixed input data is visible to the agent, so hidden duplicate fixtures do not prevent hardcoded artifacts. A submission can omit `/app/reconcile` and leave four precomputed files in `/logs/artifacts`. It can also add equal, unlinked `timing_difference` rows to the book and bank sides because `test_a_proof_balances_and_categories` checks only the adjusted tie and category allowlist. Both shortcuts violate the executable and no-unexplained-plug requirements while preserving all seven test results.

Tests Verify Behavior Through Execution: FAIL

Pytest executes, but the submitted behavior does not. The instruction requires `/app/reconcile` to run non-interactively and produce the artifacts, while `test.sh` only reads whatever files already exist. Correct static files with no executable receive the same reward as a working implementation.

Verification Explanation is Clear: LOW

The explanation accurately describes tests a through g and the one-cent tolerance. It incorrectly says hardcoded ending balances prevent plugs. Equal unlinked adjustments on both sides preserve the checked ending balances and tie, so the explanation overstates verifier strength and omits the unexecuted `/app/reconcile` requirement.

Test Coverage: MOD

The seven tests cover balances, payout decomposition, category totals, NSF linkage, partial settlement, prior items, and the GL and bank partition. They never run the required executable. They also permit unexplained offsetting `timing_difference` rows, accept NSF reopening in either reconciling items or carryforward instead of requiring carryforward, and check fee component magnitudes without enforcing their book-side directions. These gaps leave material instructed behavior ungraded.

No False Positives: FAIL

The instruction forbids unexplained plugs. Add a `timing_difference` row of +100 with direction `book` and another +100 row with direction `bank`, both with empty ID fields, then raise both reported adjustment totals and adjusted balances by 100. `test_a_proof_balances_and_categories` accepts the category, recomputes both sums, and sees equal adjusted balances; tests b through g are unchanged because the rows carry no IDs or case-specific categories. No recorded trial used this path, so the false positive is source-proven rather than trial-confirmed. Static correct artifacts with no `/app/reconcile` form a second passing-but-noncompliant submission.

Difficulty Crux: LOW

The intended crux is payout bridge decomposition combined with NSF, partial settlement, and prior-item state. No honest agent failed: both model families solved all eight trials. The source establishes a conceptual center, but the required trial evidence that failures occur there does not exist.

Final Verdict: Reject

TQA and the Reviewer Agent accepted the task, but the verifier awards reward 1 to outputs that violate the no-plug and executable requirements. The 16/16 solve rate also fails to establish benchmark difficulty. I reject the task until the false-positive paths are closed and difficulty is remeasured.

Fix: Run `/app/reconcile` in a clean artifact directory, validate the exact justified adjustment set and required directions and carryforward entries, reject unlinked rows, add varied hidden cases, and rerun honest and adversarial trials.
