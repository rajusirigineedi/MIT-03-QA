---
name: code-review
description: Reviews a Terminal Bench 3.0 (TB3) task from prepared code-review/out evidence, covering all 49 rubrics in six evidence groups and checking TQA and Reviewer Agent claims. Use when reviewing a TB3 task, batch_prod_*__* package, AutoQA or TuringQA findings, false positives, false negatives, instruction-test alignment, or reviewer portal evidence.
disable-model-invocation: true
---

# TB3 task review

Independently decide all 49 rubrics from prepared evidence. Work in six groups
so shared evidence is checked once, then write 49 numbered blocks in portal
order. Keep the three review layers separate: what TQA reviewed, what the
independent Reviewer Agent reviewed, and the human `ACCEPT` or `REJECT` decision.

TQA is the first review. The Reviewer Agent independently reviews the same task.
Read both as source material, then check the underlying evidence and make the
human portal decisions. Do not turn agreement or disagreement with either
source into an extra decision field.

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
decision for every criterion from 1 through 49. Each block reports TQA's
original finding, the relevant independent Reviewer Agent finding when one
exists, and the human portal decision. The human decision is `ACCEPT` or
`REJECT`. Do not add a second decision about TQA. Do not give the
Reviewer Agent a per-criterion vote it never made. Shared evidence may be cited
more than once. Do not replace the numbered blocks with group conclusions.

Evidence is a named test, function, variable, document section, measured number
with its meaning, named selected attempt, or short task-relative `file:line`.
"Looks fine" is not evidence. If the prepared output lacks what a criterion
needs, choose `REJECT` and name the missing evidence.

The two directions that catch the most:

- **False positives** — name a concrete wrong solution that would still pass, or
  the specific assertion that blocks each bypass you considered. A separate
  verifier stops the agent from reading hidden tests. It does not stop the agent
  from hardcoding values derived from fixed inputs visible in its own container.
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

For every FP/FN finding, explain the chain in this order:

1. What the instruction requires or permits.
2. Which named test and assertion accept or reject the result.
3. The concrete wrong solution that passes, or compliant solution that fails.
4. Why the verifier result is wrong for the written contract.
5. Whether a named selected attempt demonstrates it or source inspection only
  shows that it is possible.
6. The smallest fix that closes the gap.

Do not write only "hardcoding can pass" or "a correct solution can fail." Name
the fixed values or inputs, the untested variation, or the valid output shape
that the verifier mishandles. If the evidence cannot support that detail, do not
claim an FP or FN. Choose `REJECT` for the criterion and state exactly which
evidence is missing.

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

For each TQA or Reviewer Agent claim, open the relevant task evidence under
`out/<task>/reviewer-working-copy` and check whether the claim is true. Both
outcomes are useful:

- **Claim holds** → report the original finding accurately and use the verified
  evidence in the human reason.
- **Claim is wrong, unsupported, or stricter than the TB3 requirement** →
  explain the mismatch in the human reason and quote what the evidence says.

Do the same for the Reviewer Agent, but remember that it is an independent,
usually holistic review. Report its relevant claim or write `Not addressed`.
Do not translate silence into approval and do not create 49 Reviewer Agent
accept or reject votes.

Prefer the test function, assertion, variable, command, or document section.
Use a short task-relative path such as `/tests/test_outputs.py:290-303` only
when lines help. Never include `out/<task>/reviewer-working-copy/` in the report.
Refer to Reviewer Agent comments by their section or claim, not by the findings
Markdown filename. Never write "tests are weak" or "instruction is unclear"
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

Check non-passing TQA labels (`FAIL`, `LOW`, `MOD`) first because they point to
possible blockers. They remain TQA findings, not human portal decisions.

Rubrics interact. An instruction gap lowers instruction quality, lowers
coverage, and can create false positives or negatives at once. When one fails,
check whether the same root cause hits another before finalising.

### 6. Write the review comment

Write so a colleague can read the review cold and defend it:

- Use short sentences. Keep one idea in each sentence.
- Do not use em dashes.
- Use plain words.
- Say what you opened and what you saw. Use "I" for your checks.
- Prefer actual test names, function names, variables, commands, and section
  names. Add a short task-relative path only when it helps locate the code.
- Use `/tests/test_outputs.py:290-303`, not the full generated output path.
- Refer to Reviewer Agent comments by the section or claim itself. Do not cite
  the Reviewer Agent findings Markdown filename or its line numbers.
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
TQA review: <TQA's original result and a short account of what it checked>
Reviewer Agent review: <its relevant independent finding, or Not addressed>
Human decision: <ACCEPT|REJECT>
Reason: <plain explanation of why the human should enter that decision>
Evidence:
  - <test/function/variable/section name, short relative path when useful, measured fact, or named attempt>
Required fix: <only for REJECT; omit for ACCEPT>
```

`TQA review` says what TQA checked and found. If its label or explanation is
wrong, explain that in `Reason`; do not add `TQA Decision`. `Reviewer Agent
review` reports only a finding the independent review actually made. Do not add
`Reviewer Agent: ACCEPT/REJECT`. `Human decision` is the only portal mark. Never
omit a criterion because it shares evidence with another criterion. `ACCEPT`
means the human finds that criterion satisfied. `REJECT` means it fails or the
required evidence is missing. Explain missing evidence in `Reason`. The six
group conclusions do not replace any numbered decision. Use 49 readable numbered
subsections, not a table.

After criterion 49, append the final review block below verbatim. Return plain
Markdown only. Do not create a canvas, web page, dashboard, interactive app, or
other presentation layer.

Use this structure verbatim:

```
Review:
What TQA reviewed: <short summary of its results, strongest correct findings, and material misses>
What the Reviewer Agent reviewed: <short summary of its independent findings and any material misses>
Human review: <short daily-English explanation of what works, what blocks shipment, and why>
Evidence:
  - <named test, function, variable, Reviewer Agent section, measured fact, or short task-relative path>
Human decision: <ACCEPT|REJECT>
Required fixes:
  - <only the changes needed before acceptance; omit when accepting>
```

Write the final block as a short note to a colleague. Use daily English and
short paragraphs. Do not repeat the 49 blocks. Lead with what happens and why it
matters. Prefer names such as `test_invoice_perturbation`,
`expected["containers"]`, or `pytest_status` over bare line ranges.

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
