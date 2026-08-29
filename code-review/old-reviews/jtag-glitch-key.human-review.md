# Human review: `jtag-glitch-key`

## Evidence-group conclusions

### Solvability and oracle honesty

This group covers criteria 1, 5, 19, and 35. The oracle scored 1, and honest agents solved 8/16 trials with peak agent use of 314 seconds against an 18,000-second budget. `/solution/solve.py` derives the gate, trace PC, instruction bytes, and hashes from `/evidence`; it does not paste the graded numeric results.

### Verifier strength

This group covers criteria 2, 3, 9, 31, 38, 40, and 44. The recorded no-op and cheat rewards are both 0, the verifier runs separately, and `/tests/test.sh` writes reward only after pytest finishes. One concrete false positive remains: a contract-noncompliant disassembly, explanation, and hex format passed all four tests when the core values were correct.

### Grading fairness

This group covers criteria 8, 11, 14, 21, 33, 34, 41, 42, and 43. The verifier checks output artifacts rather than implementation choices, and every failing trial selected the same decoy gate despite the instruction's explicit accept/reject and multiple-skip rules. The assertions fairly reject that decoy, but the suite only partially enforces the required disassembly, explanation, and hex formatting.

### Difficulty and realism

This group covers criteria 6, 7, 13, 15, 16, 29, 45, 46, and 49. The task's difficulty is reconstructing Thumb-2 control flow and distinguishing an IT-guarded security gate from a plausible decoy. Eight failures chose compare site 272 and skipped PC 274 instead of 292 and 296, while eight independent trials solved the task, so the crux is conceptual and fair.

### Cleanliness and determinism

This group covers criteria 4, 12, 27, 30, 32, 36, 37, 39, and 48. The agent and verifier generators are byte-identical and use fixed bytes and fixed hash inputs. The task has the expected TB3 structure, no failing trial approached its time budget, and the agent image removes the generator after producing the four intended evidence files.

### Documentation and safety

This group covers criteria 10, 17, 18, 20, 22, 23, 24, 25, 26, 28, and 47. The instruction states three JSON schemas, paths, types, address meanings, and the decisive control-flow rule without exposing the answer. The metadata explanations are clear, the task is synthetic and safe, no README is present, and the selected trial evidence shows no refusal.

## Criterion decisions

### 1. Task Solvability (Oracle) (`task_solvability`)
TQA review: PASS. TQA recorded an oracle reward of 1.
Human rating: PASS
Reason: The recorded oracle run completed the task and received reward 1. The verifier accepted all three reference artifacts.
Evidence:
  - The dossier records `task_solvability` as PASS with oracle reward 1.

### 2. Empty solve.sh Fails Verifier (`noop_fails_verifier`)
TQA review: PASS. TQA recorded reward 0 for the no-op run.
Human rating: PASS
Reason: A missing solution cannot load the three required JSON artifacts, so pytest fails before a passing reward can be written. The measured no-op reward is 0.
Evidence:
  - The dossier's measured facts record the no-op reward as 0.
  - `/tests/test_outputs.py:_load` opens each required artifact directly.

### 3. Verifier Resists Adversarial Agent (`anti_cheat_robustness`)
TQA review: PASS. TQA recorded reward 0 for its cheat trial.
Human rating: PASS
Reason: The verifier fixtures and tests are confined to the separate verifier image, while the agent image contains only the generated evidence. The measured cheat attempt scored 0, and no agent-visible file exposes the expected artifact values or verifier logic.
Evidence:
  - `/environment/Dockerfile` removes `/opt/gen_evidence.py` after generating `/evidence`.
  - `/tests/Dockerfile` keeps fixtures and tests in the separate verifier image.
  - The dossier records cheat reward 0.

### 4. Verifier is Deterministic and Reliable (`verifier_deterministic_reliable`)
TQA review: PASS. TQA found fixed fixtures, exact comparisons, and no runtime network dependency.
Human rating: PASS
Reason: `/tests/gen_evidence.py` uses fixed ROM words, trace rows, offsets, and SHA-256 inputs. The four tests contain no randomness, clock use, or network access.
Evidence:
  - `/tests/gen_evidence.py` deterministically creates `bootrom.bin`, `sram.bin`, `glitch_trace.csv`, and `memory_map.md`.
  - `/tests/test_outputs.py:_derive_reference` computes one reference from those fixtures.

### 5. Task is Solvable in Reasonable Time (`solvable_reasonable_time`)
TQA review: PASS. TQA found a working oracle and a plausible expert workflow.
Human rating: PASS
Reason: The oracle succeeds, and 8/16 honest trials also succeed. The slowest selected agent run took 314 seconds, far below the 18,000-second budget.
Evidence:
  - The dossier records 5/8 Claude solves and 3/8 Codex solves.
  - Trial durations range from 90 to 314 seconds for the agent phase.

### 6. Task is Genuinely Difficult (`genuinely_difficult`)
TQA review: PASS. TQA identified Thumb-2 IT-state decoding and decoy-gate rejection as the main difficulty.
Human rating: PASS
Reason: Solving the task requires control-flow reconstruction from a raw binary and correct Thumb-2 conditional-execution semantics. The split 8/16 solve result shows real difficulty without making the task unsolvable.
Evidence:
  - `/task.toml` describes the decoy direct branch and the real IT-guarded branch.
  - Eight honest trials selected the wrong gate and eight solved the task.

### 7. Task is Interesting / Real-world (`interesting_real_world`)
TQA review: PASS. TQA found the post-incident fault-injection analysis realistic.
Human rating: PASS
Reason: Identifying the control-flow check defeated during a secure-boot bypass is a plausible firmware-security investigation. The artifacts mirror the ROM, SRAM, and trace evidence used in that work.
Evidence:
  - `/instruction.md` frames the work as forensic analysis of a glitched secure boot.
  - `/environment/gen_evidence.py` creates ROM, SRAM, and cycle-indexed trace artifacts.

### 8. Tests Grade Outcomes Not Process (`tests_grade_outcomes`)
TQA review: PASS. TQA found that tests inspect JSON results without requiring a particular tool or implementation.
Human rating: PASS
Reason: The verifier reads only the three output JSON files and compares their contents with a derived reference. It does not inspect solution source, require a library, or prescribe an analysis method.
Evidence:
  - `/tests/test_outputs.py` loads artifacts through `_load` and never opens agent source files.

### 9. Tests Resist Adversarial Shortcuts (`tests_resist_shortcuts`)
TQA review: PASS. TQA found no expected-answer files in the agent image and isolated verifier fixtures.
Human rating: PASS
Reason: The agent cannot read `/tests/fixtures` or `/tests/test_outputs.py`, and `/environment/Dockerfile` removes the evidence generator before runtime. The remaining coverage gap does not provide the gate addresses, skipped PC, instruction bytes, or hashes needed to pass the core assertions.
Evidence:
  - `/task.toml` sets `environment_mode = "separate"`.
  - `/environment/Dockerfile` leaves only generated evidence in the agent image.

### 10. No Malicious or Unsafe Content (`no_malicious_content`)
TQA review: PASS. TQA found only synthetic, task-related operations and no credential or network abuse.
Human rating: PASS
Reason: The task analyzes synthetic firmware evidence and writes local JSON artifacts. Its scripts do not access credentials, contact outside systems, or alter unrelated data.
Evidence:
  - `/environment/gen_evidence.py` creates only files under its requested evidence directory.
  - `/solution/solve.py` reads `/evidence` and writes `/logs/artifacts`.

### 11. Tests Verify Behavior Through Execution (`tests_verify_through_execution`)
TQA review: PASS. TQA found that pytest derives reference values and checks produced artifacts.
Human rating: PASS
Reason: `/tests/test.sh` executes pytest, and the tests parse the submitted JSON files at runtime. No assertion relies on grep, source keywords, or a claimed implementation.
Evidence:
  - `/tests/test.sh` runs `pytest -q test_outputs.py`.
  - `/tests/test_outputs.py:_derive_reference` reconstructs the expected control flow from fixtures.

### 12. Deterministic and Reproducible (`deterministic_reproducible`)
TQA review: PASS. TQA cited identical deterministic generators and pinned pytest.
Human rating: PASS
Reason: The environment and verifier generator files have the same SHA-256 digest and contain no randomness. Pytest is pinned to 8.3.4, and task execution needs no network service.
Evidence:
  - Both `gen_evidence.py` files have SHA-256 `dde040360014912fe76e89dc716a60a6a4e9d59d300550a1d02aaa8b30b83286`.
  - `/tests/Dockerfile` installs `pytest==8.3.4` during image build.

### 13. Core Challenge is the Actual Problem (`core_challenge_is_problem`)
TQA review: PASS. TQA found that failures came from real-gate identification rather than formatting or infrastructure.
Human rating: PASS
Reason: Every failing selected trial chose the decoy compare and branch, then failed the three gate-identity tests. The proof-hash test still passed, which isolates the failure to the intended control-flow crux.
Evidence:
  - All eight failing attempts report compare site 272 instead of 292 and skipped PC 274 instead of 296.
  - Each failing stdout shows three failures and one passing proof test.

### 14. Tests Align with the Instruction (`tests_align_instruction`)
TQA review: PASS. TQA mapped the tested fields to the three instructed JSON artifacts.
Human rating: PASS
Reason: Every assertion concerns a required artifact field or the stated relation between the compare, skipped instruction, and reject path. The verifier adds no hidden process, library, or intermediate-file requirement.
Evidence:
  - `/instruction.md` defines the four address fields, four glitch fields, and three proof fields.
  - `/tests/test_outputs.py` tests those same fields and paths.

### 15. Not Memorizable from Training Data (`not_memorizable`)
TQA review: PASS. TQA found that the synthetic binary instance requires fresh analysis.
Human rating: PASS
Reason: The addresses, instruction bytes, hashes, and trace rows come from a task-specific generated image. A solver must inspect the supplied evidence rather than recall a published answer.
Evidence:
  - `/environment/gen_evidence.py` constructs the complete synthetic instance from fixed task-specific bytes.

### 16. Requires Real Agent Interaction (`requires_real_agent_interaction`)
TQA review: PASS. TQA found that agents must inspect binary, SRAM, trace, and memory-map evidence and create three files.
Human rating: PASS
Reason: The answer depends on files under `/evidence`, including two binaries and a trace. Producing all artifacts requires file inspection, binary decoding, and execution of analysis code or tools.
Evidence:
  - `/instruction.md` names four evidence files and three required output files.
  - `/solution/solve.py` reads all three machine-readable evidence files.

### 17. Reviewable by Non-specialists (`reviewable_by_non_specialists`)
TQA review: PASS. TQA found the solution and verifier explanations sufficient for review.
Human rating: PASS
Reason: The instruction defines the security outcome in accept and reject terms, while `/task.toml` explains the decoy and the decisive gate. A reviewer can compare the named control-flow properties and artifact fields without reproducing every Thumb encoding by hand.
Evidence:
  - `/task.toml` contains separate difficulty, solution, and verification explanations.

### 18. Instruction is Concise and Human-written (`instruction_concise_human`)
TQA review: PASS. TQA found a direct task statement with absolute paths and no tutorial-level solution steps.
Human rating: PASS
Reason: The instruction is 30 lines and focuses on the evidence, outcome, and output schema. It gives the necessary Thumb-2 scope and multiple-skip warning without spelling out the decisive addresses.
Evidence:
  - `/instruction.md` states the task and three schemas in one compact document.

### 19. Solution Derives the Answer (No Hardcoding) (`solution_derives_answer`)
TQA review: PASS. TQA found that `solve.py` decodes the ROM, trace, and SRAM rather than echoing outputs.
Human rating: PASS
Reason: `/solution/solve.py` finds the reset entry, enumerates three branch forms, classifies both edges, binds the selected gate to the trace, and slices hashes from SRAM. Its graded numeric and hash values come from those computations.
Evidence:
  - `/solution/solve.py:find_gate_candidates` enumerates direct and IT-guarded candidates.
  - `/solution/solve.py:select_real_gate` requires halt and `bx` edges.
  - `/solution/solve.py:main` reads the evidence and writes the three JSON files.

### 20. Uses Structured Output When Appropriate (`structured_output_when_appropriate`)
TQA review: PASS. TQA found three appropriate JSON schemas with named types and constraints.
Human rating: PASS
Reason: Addresses, instruction data, hashes, and a Boolean proof are well suited to JSON. The instruction gives a path, type, and meaning for each required field.
Evidence:
  - `/instruction.md` defines `verify_fn.json`, `glitch.json`, and `proof.json` field by field.

### 21. No Typos in Identifiers / Paths / Commands (`no_typos`)
TQA review: PASS. TQA found consistent artifact paths and identifiers across the task.
Human rating: PASS
Reason: The three paths in `/task.toml` match `/instruction.md`, `/solution/solve.py`, and `/tests/test_outputs.py`. Field names are also consistent between the instruction, oracle, and verifier.
Evidence:
  - `/task.toml:artifacts` lists the same three `/logs/artifacts` files used by solution and tests.

### 22. Difficulty Explanation is Clear (`difficulty_explanation_clear`)
TQA review: PASS. TQA found that the metadata explains the IT-block crux, decoy, and real-world context.
Human rating: PASS
Reason: The explanation identifies the exact reasoning challenge without relying on pass rates. It also states that the evidence is synthetic and connects the work to firmware-security incident analysis.
Evidence:
  - `/task.toml:metadata.difficulty_explanation` contrasts the decoy branch with the IT-guarded gate.

### 23. Solution Explanation Summarizes Approach (`solution_explanation_summarizes`)
TQA review: PASS. TQA found the explanation consistent with the oracle's high-level strategy.
Human rating: PASS
Reason: The explanation covers entry discovery, candidate enumeration, edge classification, trace binding, and SRAM extraction. It describes the method without becoming a line-by-line code listing.
Evidence:
  - `/task.toml:metadata.solution_explanation` matches `/solution/solve.py` functions and outputs.

### 24. Verification Explanation is Clear (`verification_explanation_clear`)
TQA review: PASS. TQA found that the metadata explains reference derivation, normalization, and exact checks.
Human rating: PASS
Reason: The explanation accurately describes the core address, trace, byte, mnemonic-class, and hash checks. It overstates full-field enforcement for operands and explanation semantics, but the concrete impact belongs to criteria 34 and 40 rather than making the overall verification description unusable.
Evidence:
  - `/task.toml:metadata.verification_explanation` describes `_derive_reference` and disassembly normalization.
  - `/tests/test_outputs.py:test_glitched_instruction_bytes_and_disasm` is weaker on two descriptive fields.

### 25. Category and Tags are Meaningful (`category_tags_meaningful`)
TQA review: PASS. TQA found the reverse-engineering and fault-injection tags accurate.
Human rating: PASS
Reason: The engineering category fits a firmware reverse-engineering task. The five tags name the actual architecture, attack class, security mechanism, and analysis domain.
Evidence:
  - `/task.toml` uses category `engineering` and tags for reverse engineering, ARM Thumb-2, fault injection, secure boot, and forensics.

### 26. Task Folder Name is Descriptive (`task_name_descriptive`)
TQA review: PASS. TQA could not see the slug directly but found no naming concern.
Human rating: PASS
Reason: The prepared task slug is `jtag-glitch-key`, a three-word kebab-case name. It identifies the access method, attack mechanism, and key-related security target.
Evidence:
  - The prepared dossier and task directory use the slug `jtag-glitch-key`.

### 27. Timeouts and Resources are Appropriate (`resources_appropriate`)
TQA review: PASS. TQA found the agent and verifier budgets sufficient for the declared expert work.
Human rating: PASS
Reason: No failing trial approached either limit. Peak agent use was 314 of 18,000 seconds, and peak verifier use was 24 of 300 seconds.
Evidence:
  - The dossier's trial-duration table records at most 2 percent agent use and 8 percent verifier use.

### 28. README Provides Context (`readme_provides_context`)
TQA review: No verdict. TQA found no basis to score a README.
Human rating: PASS
Reason: No README is present, so this conditional criterion has no applicable document to judge. Context needed by the solver is supplied in `/instruction.md` and the generated `/evidence/memory_map.md`.
Evidence:
  - The complete prepared working-copy inventory contains no README.
  - `/environment/gen_evidence.py` creates the solver-facing `memory_map.md`.

### 29. Expert Time Estimate is Plausible (`expert_time_estimate_plausible`)
TQA review: PASS. TQA accepted the five-hour estimate for a firmware-security expert.
Human rating: PASS
Reason: Five hours is plausible for manual binary reconstruction, trace correlation, and evidence reporting without symbols. Agents completed in minutes with automation, which does not make the human expert estimate implausible.
Evidence:
  - `/task.toml` sets `expert_time_estimate_hours = 5.0`.
  - The solution requires decoding three branch forms and classifying both control-flow edges.

### 30. task.toml Follows Harbor Schema (`task_toml_schema`)
TQA review: PASS. TQA found valid schema, metadata, agent, verifier, and environment fields.
Human rating: PASS
Reason: `/task.toml` uses schema version 1.2 and places artifacts and runtime settings in the expected sections. The prepared evidence reports no hard schema error.
Evidence:
  - `/task.toml` contains top-level artifacts plus `[metadata]`, `[agent]`, `[verifier]`, and `[environment]`.

### 31. Separate Verifier Container (`separate_verifier_container`)
TQA review: PASS. TQA found separate mode, declared artifacts, and verifier-only fixtures.
Human rating: PASS
Reason: `/task.toml` sets separate verifier mode and declares only the three submitted JSON artifacts. `/tests/Dockerfile` builds fixtures and tests inside the verifier image, outside the agent workspace.
Evidence:
  - `/task.toml` sets `environment_mode = "separate"`.
  - `/tests/Dockerfile` copies tests and creates `/tests/fixtures`.

### 32. No Extraneous Files (`no_extraneous_files`)
TQA review: PASS. TQA found each task file referenced and useful.
Human rating: PASS
Reason: The working copy has ten non-data files, all used for configuration, environment generation, the oracle, or verification. The duplicated generator is necessary for separate build contexts and is byte-identical.
Evidence:
  - `/solution/solve.sh` directly invokes `/solution/solve.py`.
  - Both Dockerfiles copy their local `gen_evidence.py` and remove it after generation.

### 33. Instruction Quality (`instruction_quality`)
TQA review: HIGH. TQA found the specification complete, precise, and free of how-to leakage.
Human rating: PASS
Reason: The instruction states the starting files, output paths, field types, formatting, control-flow relation, and offline constraint. The multiple-skip and IT-block notes define the ambiguity without revealing which address wins.
Evidence:
  - `/instruction.md` defines all eleven output fields and the decisive accept/reject semantics.

### 34. Test Coverage (`test_coverage`)
TQA review: MOD. TQA found strong coverage of the core forensic values but partial enforcement of descriptive and formatting requirements.
Human rating: MOD
Reason: 
The tests correctly check the main forensic results, and others. But one thing here is _norm_hex converts uppercase hex to lowercase and removes 0x, so incorrectly formatted hex values can still pass. Since this case is not covered, it can be moderate.

For example, ABCDEF and 0xabcdef are supposed to fail, but the function converts them and allows them to pass.

Evidence:
  - `/tests/test_outputs.py:test_glitched_instruction_bytes_and_disasm` checks only the first disassembly token and explanation length.
  - `/tests/test_outputs.py:_norm_hex` lowercases input and removes an `0x` prefix before comparison.
Required fix: Check disassembly operands and explanation content, and reject hex strings that are not lowercase or that include an `0x` prefix.

### 35. Solution Verifiability (`solution_verifiability`)
TQA review: PASS. TQA found deterministic artifacts derived from the supplied evidence.
Human rating: PASS
Reason: The oracle produces plain JSON values that the verifier can recompute from its independently generated fixtures. The recorded oracle reward of 1 confirms end-to-end compatibility.
Evidence:
  - `/solution/solve.py:main` writes all three declared JSON artifacts.
  - `/tests/test_outputs.py:_derive_reference` independently derives the checked values.

### 36. Input Artifacts are Real (`input_artifacts_real`)
TQA review: PASS. TQA found that the task analyzes generated evidence rather than modifying a missing target artifact.
Human rating: PASS
Reason: The generated ROM has a vector table and two distinct compare/branch gates, the SRAM has separate hash regions, and the trace has two skipped PCs. These artifacts contain the exact conditions the task asks the solver to analyze.
Evidence:
  - `/environment/gen_evidence.py` creates a 64 KiB ROM, 256 KiB SRAM dump, trace CSV, and memory map.

### 37. Task Directory Structure (`task_directory_structure`)
TQA review: PASS. TQA noted a soft extra-solution-file warning but confirmed that `solve.sh` references it.
Human rating: PASS
Reason: The task has the required instruction, configuration, environment, solution, and tests areas. `solve.py` is not stray because `solve.sh` invokes it directly.
Evidence:
  - `/solution/solve.sh` runs `python3 solve.py --artifacts "$ARTIFACT_DIR"`.

### 38. Reward File Written Correctly (`reward_file_correct`)
TQA review: PASS. TQA found that pytest runs first and its pipeline status controls the reward.
Human rating: PASS
Reason: `/tests/test.sh` uses `set -u`, runs pytest through `tee`, then reads `${PIPESTATUS[0]}`. It writes 1 only for pytest success and 0 otherwise, with no reward written before verification.
Evidence:
  - `/tests/test.sh` runs `pytest -q test_outputs.py`, writes `reward.txt` in the following `if`, and ends after that write.

### 39. Docker / Environment Hygiene (`docker_environment_hygiene`)
TQA review: PASS. TQA found no leakage or problematic runtime setup.
Human rating: PASS
Reason: Each image installs only its needed tools, generates evidence during build, and removes the generator from the final filesystem. The agent Dockerfile copies no solution, test, expected-output, note, or verifier file into `/app`.
Evidence:
  - `/environment/Dockerfile` copies only `gen_evidence.py`, runs it, removes it, and sets `/app` as an empty work directory.
  - `/tests/Dockerfile` confines fixtures and test code to `/tests`.

### 40. No False Positives (`no_false_positives`)
TQA review: PASS. TQA found that wrong-gate trials failed and that the core values are independently derived.
Human rating: FAIL
Reason: The instruction requires `glitched_insn_disasm` to contain a mnemonic and operands, `bypass_explanation` to explain the bypass, and hex strings to be lowercase without `0x`. `test_glitched_instruction_bytes_and_disasm` checks only the first mnemonic token and the explanation's length, while `_norm_hex` accepts uppercase and `0X` prefixes. Manual testing submitted `b`, `x`, and uppercase `0X`-prefixed byte and hash strings while keeping the core numeric values correct. All four tests passed. Under `/tests/test.sh`, that passing status writes reward 1. This is a confirmed passing but contract-noncompliant solution.


    instruction.md requires a mnemonic with operands, but the test checks only the mnemonic. For example, b passes even though the operands are missing.

    _norm_hex converts uppercase hex to lowercase and removes 0x, so incorrectly formatted hex values can still pass

    the test bypass_explanation checks whether text exists, not whether the text actually explains the bypass, this can be a false positive.


Evidence:
  - `/instruction.md` requires mnemonic plus operands, a causal explanation, and lowercase unprefixed hex.
  - `/tests/test_outputs.py` ignores operands and explanation meaning and normalizes forbidden hex formats.
  - Manual verifier testing passed all four test functions with the concrete noncompliant values.
Required fix: Enforce operands, validate the explanation against the selected gate and paths, and compare hex fields without normalizing forbidden case or prefixes.

### 41. No False Negatives (`no_false_negatives`)
TQA review: PASS. TQA attributed the visible failure to wrong gate reconstruction rather than brittle grading.
Human rating: PASS
Reason: The verifier accepts case and width-suffix variations for the mnemonic, both raw `b` and the IT-effective condition, and common branch aliases. All eight failing trials instead selected a different compare site, skipped PC, and instruction bytes, so their reward 0 results are fair.
Evidence:
  - `/tests/test_outputs.py:test_glitched_instruction_bytes_and_disasm` normalizes case, `.n` or `.w`, aliases, and IT rendering.
  - Eight failing attempts reported 272, 274, and `0dd1` instead of 292, 296, and `0ae0`.

### 42. Failure is Agent Fault (Not Infra) (`failure_is_agent_fault`)
TQA review: PASS. TQA found clean reward 0 results with no timeout, build, or verifier error.
Human rating: PASS
Reason: Every selected failure completed pytest, wrote reward 0, and showed the same three substantive assertion failures. No failing attempt approached its agent or verifier timeout.
Evidence:
  - Each failing `test-stdout.txt` reports three assertions and one passing test.
  - The dossier records no infrastructure errors and at most 8 percent verifier-budget use.

### 43. Task Specification (`task_specification`)
TQA review: PASS. TQA found no missing output path, schema, or success condition.
Human rating: PASS
Reason: The instruction defines the evidence location, analysis goal, three absolute output paths, all field types, and formatting rules. It also states how to distinguish the decisive skipped instruction from other skipped rows.
Evidence:
  - `/instruction.md` states that the relevant skip converts reject into accept and lies between `compare_site` and `reject_target`.

### 44. Reward Hacking (`reward_hacking`)
TQA review: PASS. TQA found no reward-manipulation path.
Human rating: PASS
Reason: The agent submits only declared artifacts to a separate verifier and cannot write `/logs/verifier/reward.txt` inside that container. Pytest's captured exit status alone selects reward 1 or 0.
Evidence:
  - `/task.toml` declares three artifact paths and separate verifier mode.
  - `/tests/test.sh` writes reward from `${PIPESTATUS[0]}` after pytest.

### 45. Difficulty Crux (`difficulty_crux`)
TQA review: PASS. TQA found no difficulty defect in its analysis.
Human rating: PASS
Reason: The intended crux is distinguishing the real IT-guarded gate from an early direct-branch decoy by following both edges. All eight failing trials chose that decoy, so observed difficulty matches the task design.
Evidence:
  - `/task.toml:metadata.difficulty_explanation` names IT decoding and edge classification as the crux.
  - All eight failures converge on compare site 272 and skipped PC 274.

### 46. Near Misses (`near_misses`)
TQA review: PASS with a non-blocking yellow warning. TQA identified near-miss behavior for review.
Human rating: PASS
Reason: Each failing trial got the proof hashes right but selected the wrong one of two control-flow gates. The address differences are 20 and 22 bytes, but the practical error is categorical: the submission identifies the harmless decoy rather than the defeated security check.
Evidence:
  - Eight failing attempts pass 1/4 tests and fail all three gate-identity tests.
  - `/instruction.md` explicitly warns that several skipped rows may exist and only one caused the bypass.

### 47. Refusals (`refusals`)
TQA review: PASS. TQA found no refusal signal.
Human rating: PASS
Reason: The selected pass and failure evidence contains completed verifier runs and submitted artifacts, not refusals. The prepared results do not support an unexpected bail-out finding.
Evidence:
  - Ten selected attempts contain normal reward files and pytest output.

### 48. Low Timeout (`low_timeout`)
TQA review: PASS. TQA found no failure caused by insufficient runtime.
Human rating: PASS
Reason: The longest failing agent run used 256 of 18,000 seconds, and failing verifier runs used at most 23 of 300 seconds. Runtime headroom did not cause any reward 0 result.
Evidence:
  - The dossier's duration table shows all failures below 2 percent agent use and 8 percent verifier use.

### 49. Non-Clerical Difficulty (`non_clericalness`)
TQA review: PASS. TQA found no clerical-difficulty flag.
Human rating: PASS
Reason: The work centers on decoding conditional execution and classifying control-flow edges, not repetitive edits or large output volume. Only three small JSON files are required.
Evidence:
  - `/instruction.md` requires eleven fields across three artifacts.
  - Failing trials converge on the conceptual decoy-gate error.

## Reviewer Agent notes

- Decoy-gate fairness claim: confirmed. The instruction defines both decisive edges, and all eight failures chose the non-booting decoy.
- Optional coverage-gap claim: confirmed as a gap, but manual testing proves it creates a passing contract violation.
- Six-failure claim: refuted. The prepared evidence contains eight failing trials with the same pattern.
- Fixed mnemonic-width and leading-zero false-negative claims: confirmed in `/tests/test_outputs.py`.
- No-infrastructure-failure claim: confirmed by the timing table and selected pytest outputs.
- Autofix snapshot equivalence claim: not checked because it was unnecessary for the shipped working-copy review.

These notes were leads only and did not decide any human rating.

Review:

TQA Status: TQA reported 46 PASS ratings, one HIGH instruction rating, one MOD coverage rating, and no README verdict. Claude solved 5/8 and Codex solved 3/8; oracle reward was 1, no-op and cheat rewards were 0, there were no infrastructure errors, and all eight failures chose the same decoy gate.
Reviewer Agent Status: The Reviewer Agent recommended shipping because it found the decoy-gate failures fair and treated the disassembly and explanation coverage gaps as optional.

My Analysis:

Test Coverage: FAIL

The tests correctly check the main forensic results, and others. But one thing here is _norm_hex converts uppercase hex to lowercase and removes 0x, so incorrectly formatted hex values can still pass. Since this case is not covered, it can be moderate.

For example, ABCDEF and 0xabcdef are supposed to fail, but the function converts them and allows them to pass.

No False Positives: FAIL

instruction.md requires a mnemonic with operands, but the test checks only the mnemonic. For example, b passes even though the operands are missing.

_norm_hex converts uppercase hex to lowercase and removes 0x, so incorrectly formatted hex values can still pass

the test bypass_explanation checks whether text exists, not whether the text actually explains the bypass, this can be a false positive.



Final Verdict: Reject

TQA and the Reviewer Agent correctly judged the recorded decoy-gate failures as fair. The task still has a false positive that awards reward 1 to an output violating the upper lower case scenario above, so I reject it until the verifier & instrction is on the same line.

Fix: Check disassembly operands and the bypass explanation's causal content, and reject uppercase or `0x`-prefixed hex strings before awarding reward 1.
