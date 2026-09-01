# TB3 review workflow

Read `GOLDEN_DOC-Task Review Process.md` first. It is the main source and this
file must follow it. This file only explains how to do the work.

If the GOLDEN document and this workflow do not answer an exact Harbor question,
read only the named criterion or schema section in
`harbor-sources/task-implementation.toml`. Use `templates/task-template.toml`
when the exact current task configuration shape matters. Do not read the whole
source TOML by default.

## 1. Prepare and stay inside the evidence boundary

Run:

```bash
cd code-review
npm run prepare-review -- <package-or-parent>
```

Review only the generated files for that task:

```text
code-review/out/
  <task>.tqa-review.md
  <task>.reviewer_agent.md
  <task>.feedback.md                 re-reviews only
  <task>/reviewer-working-copy/
  <task>/trajectories/<model>/attempt_NN-pass|fail/
```

Do not return to `inbox`, `run`, `harbor-view`, or raw trajectories after
preparation. Do not search all of `out`. Open one task and only the files needed
for the current evidence group.

Treat large data, fixtures, and binary files as metadata first. Read the smallest
sample that answers a named question. Never load an entire large artifact merely
because it exists.

### Harbor-specific facts

Keep these current Harbor rules here because they change review decisions and
are not fully stated in the GOLDEN document.

- Harbor mounts `solution/` at `/solution/` for the oracle. In separate verifier
  mode, the agent cannot read `/tests/` or `/solution/`. After the agent stops,
  the verifier receives declared artifacts, files in its own image, and declared
  persistent sidecars.
- `README.md` is reviewer-facing and is not shown to the agent. A verifier rule
  stated only there is not solve-time instruction.
- `artifacts` is a top-level list before the first TOML section. Each entry is an
  absolute path or a table with `source`, `destination`, `exclude`, and
  `service`.
- Recognized task sections are `task`, `metadata`, `verifier`, `agent`,
  `environment`, `solution`, and `source`.
- Agent and verifier timeouts cannot exceed 28,800 seconds. `gpus` cannot exceed
  1. Omit `allow_internet`; current static checks reject the field whether it is
  true or false.
- Schema or field-name drift alone is a relaxed review issue. Fail a rubric only
  when the task content or behavior is wrong.

The Harbor implementation source defines six trial criteria and 35
implementation criteria. Do not copy all definitions into this workflow. Read
the named entry in `harbor-sources/task-implementation.toml` when its exact PASS,
FAIL, or NOT_APPLICABLE boundary matters.

Five newer Harbor criteria map to existing portal rubrics:

- `artifact_efficiency` can affect Separate Verifier Container, No Extraneous
  Files, Reward File Written Correctly, Docker / Environment Hygiene, and No
  False Positives.
- `verifier_execution_isolation` can affect Verifier Resists Adversarial Agent
  and Reward Hacking.
- `ctrf_reporting` can affect Reviewable by Non-specialists and Reward File
  Written Correctly.
- `do_not_modify_enforced` can affect Tests Align with the Instruction and No
  False Positives.
- `binary_reward` can affect Reward File Written Correctly and Reward Hacking.

Current static checks cover Dockerfile leakage, test-file declarations,
separate-verifier setup, verifier network fetches, verifier tooling installed at
build time, bare `nproc`, and Compose host bind mounts. Execution gates also
require the environment image to build, the oracle to score 1, and the no-op
solution to fail.

These findings do not justify a portal FAIL by themselves:

- a missing or different instruction trailer;
- metadata field-name drift, extra fields, or a missing `[task]` table;
- a missing README or README section;
- a missing `terminal-bench/` package prefix;
- older pytest, CTRF, or canary versions;
- no verifier `USER` drop without a demonstrated reward-forging path;
- no artifact-parent `mkdir -p` when separate mode otherwise works.

Record one of these only when useful. Fail when it causes a real task behavior,
safety, grading, or metadata problem. Do not turn uncertain artifact-upload
behavior into a blocker without evidence.

## 2. Keep the three decisions separate

For each rubric record:

1. `TQA finding`: TQA's label and material explanation.
2. `Independent assessment`: what the task evidence supports under the rubric's
   own scale.
3. `Is TQA finding valid`: whether TQA's label and material explanation hold.

Use this fixed mapping:

| TQA and evidence | TQA valid | Portal mark |
| --- | --- | --- |
| TQA rejects and the cited defect is real | `YES` | `PASS` |
| TQA accepts and the rubric is sound for the stated reason | `YES` | `PASS` |
| TQA rejects on a false, unsupported, or stricter rule | `NO` | `FAIL` |
| TQA accepts but primary evidence proves a defect | `NO` | `FAIL` |

A correct label with a false main reason is `NO` when that mistake changes how
the rubric should be understood or could mislead the final review. Do not use
`NO` for a minor wording issue, missing detail, or an imperfect example when the
label and the main point still hold.

If TQA did not run a rubric, write `N/A (no finding to validate)` and do not
invent a portal mark. Still make the independent assessment for the final task
decision.

Final SHIP or REJECT follows the independent assessments. It does not follow the
portal PASS or FAIL count.

## 3. Choose the review depth

TQA is a strong first reviewer. Treat its work as useful, but still check it
against the task. Do not try to find a new failure for every TQA `PASS`.

Use a deep check for:

- every TQA `FAIL`, `LOW`, `MOD`, or other non-passing result;
- every high-impact rubric listed below, even when TQA passed it;
- a concrete concern from the Reviewer Agent;
- oracle, no-op, reward, test, or trajectory evidence that conflicts with TQA;
- any issue that may change SHIP to REJECT.

Use a light check for an ordinary TQA `PASS` when no evidence points to a
problem. Confirm the main requirement from the task files. Keep the pass when it
holds. Do not reject it for small wording, grammar, layout, structure, taxonomy,
schema style, or version choices that do not change behavior or fairness.

A task does not need 100% perfection. Ask whether the task gives a capable
agent enough information and whether the verifier grades the required behavior.
Human reviewers can miss tiny details too. Do not turn a harmless detail into a
blocker.

## 4. Read evidence in this order

1. Read the TQA findings and rubric intent.
2. Read the Reviewer Agent report once. Extract concrete leads such as a file,
   test, mismatch, trial pattern, or metric.
3. Audit primary evidence in these groups:

| Group | Main sources |
| --- | --- |
| Solvability and oracle honesty | solution, tests, oracle reward, timing |
| Verifier strength | tests, environment, no-op and cheat results |
| Grading fairness | instruction, tests, failing assertions |
| Difficulty and realism | instruction, explanations, honest failures |
| Cleanliness and determinism | task.toml, Dockerfiles, file inventory, timing |
| Documentation and safety | instruction, metadata, README, all executable files |

4. Compare the independent assessment with TQA only after the evidence check.
5. Record the relevant Reviewer Agent note as `confirmed`, `refuted`, or `not
   checked`. Cite primary evidence, not the agent's authority.

For each rubric, use the rubric bar, the task evidence, TQA's result, and any
useful Reviewer Agent note. The Reviewer Agent is a lead, not a vote.

## 5. Use clear names and real evidence

### Quote the load-bearing text and code

Every claim about an instruction, assertion, variable, comment, schema field, or
number must include its exact text. Name real files, functions, test names,
variables, and values. When code behavior is part of the claim, include the
smallest useful exact snippet. A path and line number alone are not evidence a
reviewer can use.

Always name rubrics by the full title and portal id. Never write `#1`, `#39`,
"rubric 14", or use the generated order number as the name. The order number is
only for sorting the portal cards.

Always copy the real test function, class, assertion, or checked behavior from
the verifier source or output. Never rename tests as A, B, C, D, or E. Never
identify them by position or a made-up number, such as "the first test", "test
3", or "case 4". If a shell check has no test function, describe what it checks,
such as "the reward write after pytest". Do not use placeholders such as "some
tuples".

Use short task-relative paths in the report. Prefer a stable symbol or section
name. Do not put line numbers or line ranges in reviewer-facing prose. If code
is useful, show the snippet instead.

### Check solve-time visibility

For every rule enforced by the verifier:

1. Quote the assertion or comparison that enforces it.
2. Quote where the instruction or an agent-visible file declares it.
3. Trace `COPY`, `ADD`, setup commands, generated files, and deletions in
   `environment/Dockerfile` and setup scripts.
4. Classify the rule as `derivable` or `not derivable` at agent start.

A rule found only in tests, verifier data, or a file deleted before agent start
is not agent-visible. If nothing visible implies it uniquely, the verifier has a
false-negative and alignment defect.

Use the same inventory to check leakage. Open every agent-visible non-data file,
not only files with suspicious names. Look for answers, hidden schemas, expected
values, oracle logic, exact fixes, and verifier-only edge cases.

### Explain failing trials assertion by assertion

For each distinct failure, record:

- the exact failing assertion and test name;
- expected and produced values for the concrete case;
- the rule that generated the expectation;
- the smallest useful code snippet or example causing the issue;
- whether that rule was derivable at solve time;
- what a solution correct under the visible contract would produce;
- the count of trials affected by this cause versus genuine agent errors.

A repeated failure shows a stable condition. It does not establish whether the
condition is fair. The visibility and contract checks decide that.

## 6. Give extra attention to high-impact rubrics

These need a deeper check because one real issue can affect the final decision
or several related rubrics.

| Rubric name and portal id | What to check |
| --- | --- |
| Core Challenge is the Actual Problem (`core_challenge_is_problem`) | Check the trajectory. The hard part should be the intended technical problem, not formatting, unclear text, or setup noise. |
| Tests Align with the Instruction (`tests_align_instruction`) | Trace each important assertion to the task contract. A test-only rule is a major problem. |
| Instruction Quality (`instruction_quality`) | Check the goal, paths, output, format, and real limits. The agent must have enough information to do the job. |
| Test Coverage (`test_coverage`) | Check every required behavior and useful edge case. Look for wrong results that could still pass. |
| Reward File Written Correctly (`reward_file_correct`) | The reward must be written during verification and match the real test result. It must not hide a timeout or harness crash. |
| No False Negatives (`no_false_negatives`) | A correct solution must not fail because of a hidden rule, brittle check, or spec and test mismatch. Use the assertion, instruction, test code, and trajectory. |
| No False Positives (`no_false_positives`) | A wrong solution must not pass because a check is missing or weak. Confirm the path in code or a trajectory. |
| Task Specification (`task_specification`) | The task contract must be enough for a capable agent. Tests cannot add hidden conventions. |
| Difficulty Crux (`difficulty_crux`) | Honest failures should come from the intended problem, not clerical work, format, or environment trouble. |
| Near Misses (`near_misses`) and Non-Clerical Difficulty (`non_clericalness`) | Decide whether almost-correct work failed for a real skill gap or a minor format issue. The main challenge should still need reasoning. |

If one of these fails, check whether the same root cause affects another one.
Do not copy the same failure into unrelated rubrics.

### False positives and false negatives

For every TQA result, read its reason and compare it with the task intent. Do not
accept a label by itself. If the reason is made up or stricter than the real TB3
rule, mark it as a contest candidate and record the exact mismatch.

For a model failure, read `test-stdout.txt` for the failed assertion. Then read
the matching test code and `instruction.md`. Use the available trajectory to
confirm what the agent did. For the comment, name the real test or code section
and say whether the issue happened in an actual trial.

A test may be valid code but still wrong for the task if it checks an unstated
rule. An agent may also fail a good test because its solution is wrong. Decide
from the contract, the test, and the observed trajectory together.

## 7. Inspect the complete non-data task surface

Read every non-data file in the prepared working copy:

- root instruction, metadata, README, notes, and helpers;
- all solution scripts and source files;
- all environment Dockerfiles, setup scripts, source, and configuration;
- all verifier Dockerfiles, scripts, tests, helpers, and data-generation code.

For `tests/test.sh`, follow execution order. Quote the test command, reward write,
and final exit. A reward written before testing is a defect. With `set -e`, the
script must still capture a failing test result and write the reward before exit.
Every reachable reward must be exactly 0 or 1.

For each assertion ask both questions:

- What wrong result could still pass?
- What correct result could this reject?

Do not claim a false positive or false negative without a concrete case. State
whether a selected trial proves it or source inspection shows only a possible
path.

## 8. Calibrate the rubric decision

Judge each rubric by its stated bar. Do not invent a stricter standard. A clean
task should pass clean rubrics.

This work checks TQA. It is not a search for faults in TQA. Mark its finding
invalid only when the task gives clear, direct proof of a real mistake in the
label or the main reason. The mistake must matter. It should change the rubric
decision, hide a real task risk, invent a defect that is not there, or give a
reason that would lead the reviewer to the wrong conclusion.

Do not fail TQA because another explanation sounds better, its note could say
more, or a possible edge case has not happened. Do not turn doubt into a
failure. If the main claim still holds, mark it `YES`.

Be careful before overturning a normal TQA `PASS`. Do it only when direct task
evidence shows a real defect under that exact rubric. A preference is not proof.
A harmless issue is not a blocker. Structure and taxonomy checks should fail
only when the real required structure or meaning is wrong, not because another
layout or label would look nicer.

Use solve rate and runtime only where the rubric calls for them. Runtime belongs
to reasonable-time and timeout checks. Honest failure patterns can inform the
core challenge, difficulty crux, near misses, and failure attribution. A fast
solve or high solve rate alone does not make a task clerical, uninteresting, or
invalid. A generous expert estimate is not a defect merely because it is high.

The Harbor reference owns static checks, schema rules, hardening criteria, and
the short list of relaxed version or lint checks that do not justify a portal
failure by themselves.

## 9. Write one block per rubric

Write every portal rubric once. Use the full title and portal id. Do not show the
generated order number in the heading or reason.

```markdown
### <criterion name> (`<criterion_id>`)
TQA finding: <label and material reason>
Reviewer Agent note: <relevant confirmed/refuted/not checked note, or No relevant note>
Independent assessment: <PASS | FAIL | HIGH | MOD | LOW>
Is TQA finding valid: <YES | NO | N/A>
Portal mark: <PASS for YES | FAIL for NO | N/A>
Reason: <plain explanation tied to the rubric and exact evidence>
Evidence:
  - <task-relative file and exact quote, symbol, assertion, or measured result>
Fix: <task fix, TQA correction, or No fix needed>
```

`Reason` must explain both the task assessment and why TQA is right or wrong.
Write it in a natural reviewer voice and anchor it to the actual task. State the
instruction rule, what the named test or code does, the concrete input and
expected-versus-actual result, and why the mismatch matters. Include affected
trial counts when available. Do not replace this analysis with generic phrases
such as "the tests are weak", "the instruction is unclear", or "the tests do
not follow the expectation set by the instruction".

`Evidence` must contain primary task evidence using a task-relative path plus
the exact quote, symbol, assertion, short code snippet, measured result, or
concrete case that supports the reason. Do not give a bare line number or line
range. Prefer evidence supplied by the task. Never invent external facts,
examples, citations, or missing context. TQA and Reviewer Agent findings are
claims to verify, not primary evidence.

`Fix` must give the smallest concrete task change when the defect is real. When
TQA is invalid, give the corrected label or reasoning. Use `No fix needed` only
when both the task rubric and the TQA finding are sound.

Keep ordinary reasons to two to four sentences. A complex defect may use up to
eight short sentences and three evidence bullets. Each block must make sense by
itself to a reviewer who has not read the other rubric comments.

Write like a 15-year-old explaining the check to a friend. Use daily English and
short words. Go straight to the point. Sentence fragments are fine when the
idea is clear. Do not worry about perfect grammar or complete sentences. This is
not a formal review. Do not use big words just to sound professional.

Keep the required fields because the reviewer needs them. Inside those fields,
use normal prose. Do not turn every thought into bullets, mini-headings, bold
labels, code formatting, or a repeated checklist. Evidence bullets should hold
evidence, not fragments of the explanation.

The reviewer should understand the point without opening a file. Include the
needed instruction wording, test condition, variable and value, expected and
actual result, or short code behavior in the explanation itself. The file path
shows where the reviewer can confirm it. It must not carry information that the
reason leaves out.

Before saving a block, read it once as a comment written by a teammate. Rewrite
it if it sounds like a template, uses words people do not use in daily work,
repeats the verdict, or makes the reader inspect another file just to learn what
happened. Keep technical names when they matter. Explain them in plain words.

### Keep collection details out of reviewer-facing prose

Write as a reviewer who received the task, its rubric findings, and the Reviewer
Agent findings. In rubric blocks and the final review, never mention scraping,
generated or compiled documents, prepared exports, collection scripts,
pipelines, dossiers, `out/`, a "TQA file", or a "Reviewer Agent file". These are
internal transport and storage details, not review evidence.

Use direct wording such as "TQA marked this FAIL" or "The Reviewer Agent noted
the mismatch", then cite the task file or test that proves or disproves the
claim. Internal paths may guide the analysis, but they must not appear in the
review presented to the human evaluator.

## 10. Save and run the second pass

Save the complete review to:

```text
code-review/out/<task>.human-review.md
```

Then recheck every TQA non-passing result, every case where the review overturns
a TQA `PASS`, and every task blocker. Confirm the rubric bar, evidence, portal
mapping, solve-time visibility, and fix. Save those blocks, without duplicates,
to:

```text
code-review/out/<task>.human-review-2.md
```

Many `NO` decisions in one task are unusual. If they start to pile up, check
whether the review used the portal mapping backwards, applied a stricter rule
than the rubric, treated weak wording as a wrong verdict, or repeated one issue
across unrelated rubrics. There is no fixed maximum and no target count. Keep
every genuine failure, but each one must stand on its own clear evidence and
real impact.

Read `submission-template.md`. Assemble the final user-facing review in its
SHIP or REJECT format, chosen from the independent task assessment. This is a
standing template, so the review must be ready to paste even when the current
request does not repeat a template. If the user supplied a newer template in
the current request, use that newer template.

The complete rubric ledger is an audit artifact, not the final response. The
final response starts with `Review:` and contains `TQA Status`, `Reviewer Agent
Status`, `My Analysis`, and `Final Verdict`. A REJECT review includes the
material failed rubric sections and ends with `Fix:`. An accepted review explains
why any remaining coverage or verifier concerns are reservations rather than
blockers.

Before delivery, verify that every portal id appears exactly once. Do this with
the ids, not the generated list numbers. Verify that each `YES` maps to portal
`PASS` and each `NO` maps to portal `FAIL`. Report both saved paths. Never submit
anything to the portal.

## 11. Re-review a rejected review

Use this mode when `<task>.feedback.md` exists or the user asks to answer a team
lead's rejection note. The feedback contains the earlier review and the lead's
questions or objections. It is a record of the discussion, not proof that either
side is right.

Read the lead's note first and list the exact rubrics or claims being challenged.
Then read the earlier review, the matching TQA finding, any useful Reviewer Agent
note, and the primary task evidence for each challenged point. Recheck related
rubrics when one correction changes another finding or the final verdict. Do not
redo unrelated rubrics without a reason.

Answer the lead before presenting the revised review. Reply to each question
directly. Explain what you checked and include the instruction, test condition,
variable, value, or concrete result needed to understand the answer. Do not make
the lead open a file to learn the main point.

If the lead is right, say so plainly. Explain what was wrong in the earlier
review, correct the affected rubric blocks, and update the final SHIP or REJECT
decision if the correction changes it. Do not defend an old answer merely
because it was ours. If the lead is wrong, explain why in the same plain voice
and support the answer with primary task evidence.

Save the reply to `code-review/out/<task>.re-review-response.md`. Then update
`<task>.human-review.md` and `<task>.human-review-2.md` where needed. In the
reply, say "your note" or name the rubric. Do not mention a feedback file,
scraping, exports, or other collection details.
