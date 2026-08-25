---
name: code-review
description: Reviews a Terminal Bench 3.0 (TB3) task from prepared code-review/out evidence, covering all 49 rubrics in six evidence groups and checking TQA and Reviewer Agent claims. Use when reviewing a TB3 task, batch_prod_*__* package, AutoQA or TuringQA findings, false positives, false negatives, instruction-test alignment, or reviewer portal evidence.
disable-model-invocation: true
---

# TB3 task review

Independently decide all 49 rubrics from prepared evidence. Work in six groups
so shared evidence is checked once. State where TQA or the Reviewer Agent is
right, wrong, or unsupported.

AutoQA is a first pass and is often thin or wrong. The job is a genuine second
opinion: reach your own verdict from the evidence, then accept or reject
AutoQA's. Agreeing with AutoQA is a fine outcome; adopting its verdict without
checking is not.

**Never submit anything.** No marks, no verdict, no portal writes. The user reads
the draft and enters marks by hand. There is no network code in the tool and
there must not be.

## Workflow

```
- [ ] 1. Prepare the review output
- [ ] 2. Read only the prepared evidence in `code-review/out`
- [ ] 3. Judge all six evidence groups
- [ ] 4. Check false positives, false negatives, clarity, alignment, and metrics
- [ ] 5. Reconcile TQA and Reviewer Agent claims
- [ ] 6. Write grouped, human review findings
```

### 1. Prepare the evidence

```bash
cd code-review && npm run prepare-review -- inbox/<package-or-parent>
```

This creates the only files used during review:

```text
code-review/out/
  <task>.dossier.md
  <task>.reviewer-agent-findings.md (when present)
  <task>/
    reviewer-working-copy/
    trajectories/<model>/attempt_NN-pass|fail/
      verifier/test-stdout.txt
      verifier/reward.txt
      result.json
```

Do not return to `inbox`, `harbor-view`, `run`, or the original trajectories
after preparation. File and line citations must point to the prepared output.

Do not load or recursively search the entire `out/` folder or task output.
Start with the dossier headings. Open only the task file, test, or selected
attempt needed for the current group. Read tests one at a time and follow
specific claims to their source.

Treat `data/`, `input/`, `inputs/`, datasets, fixtures, and large artifacts as
metadata-only by default. Do not read their contents during a normal review.
Only when a specific criterion remains unresolved, state the edge case and read
the smallest useful sample or structured slice. Never load a whole large or
binary data file into context.

### 2. Judge all 49 in six groups

Work one group at a time; each group's sources are read once.

| Group | Sources | What it settles |
| --- | --- | --- |
| Solvability and oracle honesty | solution, tests, measured rewards | oracle success, derivation, deterministic validation |
| Verifier strength | tests, environment, NOP and trial results | false positives, cheat resistance, reward integrity |
| Grading fairness | instruction against tests, failing assertions | specification, clarity, false negatives, coverage, alignment |
| Difficulty and realism | instruction, difficulty_explanation, trajectories | crux, near misses, clerical vs conceptual |
| Cleanliness and determinism | task.toml, Dockerfiles, file listing, timing | reproducibility, timeouts, structure, schema |
| Documentation and safety | instruction, task.toml explanations, README | clarity, context, metadata, safety |

Use the six groups to organize evidence gathering, but write a separate numbered
decision for every criterion from 1 through 49. Each decision must state the
TQA label, whether you accept or reject that label, your own PASS/FAIL verdict,
a short human explanation, concrete evidence, and the action needed when it
fails. Shared evidence may be cited more than once. Do not replace individual
decisions with one group conclusion.

Evidence is an output `file:line`, a measured number with its meaning, or a
named selected attempt. "Looks fine" is not evidence. Use `unverifiable` when
the prepared output lacks what a criterion needs, and name what is missing.

The two directions that catch the most:

- **False positives** — name a concrete wrong solution that would still pass, or
  the specific assertion that blocks each bypass you considered. Check whether
  the agent container can reach the verifier's fixtures; if the verifier is
  `environment_mode = "separate"` with no network, hardcoding is off the table
  and that is worth stating.
- **False negatives** — for each failing assertion, decide whether the agent was
  wrong or the test was. Over-specification looks like exact float equality,
  ordering sensitivity, or one arbitrary spelling of an output the instruction
  leaves open.

FP/FN is the core of the review. A false negative rejects a correct solution
because the instruction and verifier disagree or a test is wrong. A false
positive accepts an incorrect, incomplete, or cheating solution because the
verifier is weak. Do not report "none" until every test and assertion has been
checked in both directions:

1. What incorrect result could satisfy this assertion?
2. What correct result could this assertion reject?

For every FP/FN finding, cite the exact test and assertion plus the instruction
line that defines the expected behaviour. Describe the concrete wrong solution
that passes or correct solution that fails. Say whether selected trial evidence
shows it. If the prepared evidence cannot support that claim, use
`unverifiable`.

### `test.sh` reward control flow

Read `tests/test.sh` in execution order:

1. A reward written before pytest is a hard failure for Reward File Written
   Correctly. A default zero can hide an `AgentTimeoutError` as a normal failure.
2. If `set -e` is active at pytest, the script must use `set +e` or another
   explicit construct to capture pytest's exit code. Otherwise a failed test can
   exit before `reward.txt` is written and Harbor reports `RewardFileNotFound`.
3. `reward.txt` must be written before the final exit. `exit 0` and an exit with
   pytest's captured code are both acceptable after the reward write.

Cite the pytest line, reward-write line, and final-exit line.

### 3. Verify inherited claims

This is the core of the job and the only part that produces a defensible
contest. A flag is a claim about the *evidence*, never a verdict on the task.

For each TQA or Reviewer Agent claim, open the cited file under
`out/<task>/reviewer-working-copy` and check whether the claim is true. Both
outcomes are useful:

- **Claim holds** → accept the label, and say in the note that you verified it,
  citing `file:line`.
- **Claim is wrong, unsupported, or stricter than the TB3 requirement** →
  contest it, quoting what the file actually says.

Do the same for the Reviewer Agent. The spec requires an invalid or unsupported
Reviewer Agent statement to be called out explicitly, so check its concrete
assertions rather than accepting the verdict.

Cite `file:line`. Never write "tests are weak" or "instruction is unclear"
without naming the exact mismatch.

### 4. Analyse selected trials

The export keeps one passing attempt per model and every failing attempt. A pass
is a control. Failures show which assertions need review.

```
out/<task>/trajectories/<model>/attempt_NN-pass|fail/
  verifier/test-stdout.txt   which assertion failed
  verifier/reward.txt        1 or 0
  result.json                selected agent_result and verifier_result fields
```

The FP/FN judgement uses these sources, in this order:

1. failing assertion, from `test-stdout.txt`
2. the test code that asserted it
3. the instruction clause it traces back to, or the absence of one
4. the selected pass/fail reward and result metrics

A test can be technically correct yet wrong for the task if it enforces an
unstated requirement. An agent can fail fairly even when the test is well
written. Do not claim what the agent thought or implemented. The compact output
does not include its steps.

When many trials converge on the same discrepancy, that points at a systematic
cause rather than agent variance. When independent solutions all reproduce the
expected result, that is strong evidence the verifier is not over-strict — the
single most useful argument for fairness.

Before calling anything a near miss, check the denominator. A margin is reported
relative to the expected value, so an assertion on an aggregate count can be off
by a fraction of a percent while the answer is categorically wrong on the concept
under test — 11 wrong clusters out of 33,576 is 0.03%, and also a total failure
of the facet the task exists to test. Convert the margin into units the task
cares about: how many records, clusters, or crafted trap cases. Convergent
failures at the same value are evidence of a reliably triggered trap, not of
brittleness. The selected attempt folders identify the independent runs.

### 5. Reconcile each group

Judge against the rubric's own intent, which the dossier prints. Do not apply a
stricter standard than the rubric states — over-strictness is itself a contest
ground.

Where your conclusion differs from TQA, that disagreement is the finding. Say
which conclusion the evidence supports and why. Where you agree, say what you
checked so the agreement carries weight.

A non-passing label (`FAIL`, `LOW`, `MOD`) fails TQA review until it is accepted
or contested on the record. Treat those first.

Rubrics interact. An instruction gap lowers instruction quality, lowers
coverage, and can create false positives or negatives at once. When one fails,
check whether the same root cause hits another before finalising.

### 6. Write the review comment

Write so a colleague can read the review cold and defend it:

- Use short sentences. Keep one idea in each sentence.
- Do not use em dashes.
- Use plain words.
- Say what you opened and what you saw. Use "I" for your checks.
- Name the output file and line for every file-based claim.
- Explain what happens before naming the rubric it breaks.
- Explain every number in task terms. Include its denominator or impact.
- Do not write "tests are weak" or "instruction is unclear" without the exact
  mismatch.

Write the review to `code-review/out/<task>.human-review.md`. The saved Markdown
file is the deliverable. Do not leave the review only in chat.

Start with six short evidence-group conclusions. Each conclusion names the
criteria covered and states the shared evidence once. Follow those conclusions
with a separate `## Criterion decisions` ledger containing all 49 criteria in
strict numeric order. Use this structure for every criterion:

```
### <number>. <criterion name> (`<criterion_id>`)
TQA Verdict: <PASS|FAIL|LOW|MOD|no verdict>
TQA Decision: <ACCEPT|REJECT|UNVERIFIABLE>
My Verdict: <PASS|FAIL|UNVERIFIABLE>
Reviewer Agent: <ACCEPT|REJECT|NOT ADDRESSED|UNVERIFIABLE>
Reason: <plain human explanation of what you checked and why this should pass or fail>
Evidence:
  - <prepared output file:line, measured fact, or selected attempt>
Action: <None, or the exact fix needed>
```

`TQA Decision` answers whether the TQA label and its stated reason are supported.
`Reviewer Agent` answers whether its concrete statement about this criterion is
supported. `My Verdict` is the mark the human reviewer should enter. Never omit
a criterion because it shares evidence with another criterion. The six group
conclusions do not replace any numbered decision. Do not use a 49-row table.
Use 49 readable numbered subsections.

After criterion 49, append the final review block below verbatim. Return plain
Markdown only. Do not create a canvas, web page, dashboard, interactive app, or
other presentation layer.

Use this structure verbatim:

```
Review:
TQA Status: <TQA verdict and your feedback about it>
Reviewer Agent Status: <RA verdict and your feedback about it>
My Analysis: <your analysis, whether it should pass or fail>
Evidence for your analysis:
  - <concrete evidence: test case, code line range, selected attempt result>
Final Verdict: ...
Fixes:
  - <recommendations that would make the task shippable>
```

Before finishing, verify that the file contains exactly 49 numbered criterion
headings, numbers 1 through 49 with no gaps or duplicates, and the final
`Review:` block. Report the saved path to the user.

## Prepared evidence layout

```
code-review/out/
  <task>.dossier.md                    TQA criteria and measured facts
  <task>.reviewer-agent-findings.md    complete report, when present
  <task>/reviewer-working-copy/        task files used for review
  <task>/trajectories/<model>/
    attempt_NN-pass|fail/              compact selected trial evidence
```

The dossier is the source for TQA claims. Reviewer Agent findings stay separate
when that file is present. The reviewer working copy is the source for task-file
checks. Do not mix one signal's verdict with another.

## Reference

- `workflow-docs/code-review-workflow.md` — the full review process
- `code-review/README.md` — preparation commands and generated layout
- `npm run tb3 -- rubrics` — all 49 rubrics, ids, and how each is decided
