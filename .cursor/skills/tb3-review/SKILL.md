---
name: tb3-review
description: Reviews a Terminal Bench 3.0 (TB3) task package against the 49 review rubrics, auditing AutoQA verdicts and the Reviewer Agent verdict for claims their own evidence does not support, and drafting per-criterion notes for manual entry. Use when reviewing a TB3 task, a downloaded review package, a batch_prod_*__* folder, or when the user mentions TB3, Terminal Bench, AutoQA, TuringQA, review-session JSON, or the reviewer portal.
disable-model-invocation: true
---

# TB3 task review

Independently re-decides all 49 rubrics for a downloaded TB3 task package, then
states for each whether AutoQA got it right.

AutoQA is a first pass and is often thin or wrong. The job is a genuine second
opinion: reach your own verdict from the evidence, then accept or reject
AutoQA's. Agreeing with AutoQA is a fine outcome; adopting its verdict without
checking is not.

**Never submit anything.** No marks, no verdict, no portal writes. The user reads
the draft and enters marks by hand. There is no network code in the tool and
there must not be.

## Workflow

```
- [ ] 1. Build the evidence dossier
- [ ] 2. Judge all 49 independently, one evidence group at a time
- [ ] 3. Run the audit as a cross-check
- [ ] 4. Verify every flagged claim against the actual files
- [ ] 5. Analyse the failing trials
- [ ] 6. Reconcile: where you and AutoQA disagree, decide who is right
- [ ] 7. Write the review comment
```

### 1. Build the evidence dossier

```bash
cd tb3-review && npm run tb3 -- dossier inbox/<package-or-parent>
```

Writes `tb3-review/out/<task>.dossier.md`: measured facts, per-trial durations
against the configured budgets, what actually failed in each failing trial, every
task source file inline, and the 49 criteria grouped by the evidence they need —
each with the rubric intent, AutoQA's verdict and reasoning, and a recipe for
deciding it yourself.

A typical task is 20-30k tokens. Read it.

### 2. Judge all 49 independently

Work one group at a time; each group's sources are read once.

| Group | Sources | What it settles |
| --- | --- | --- |
| Oracle and verifier mechanics | tests, solution, measured rewards | false positives, cheat resistance, reward integrity |
| Contract, coverage, fairness | instruction against tests, failing assertions | false negatives, coverage, alignment, typos |
| Difficulty and realism | instruction, difficulty_explanation, trajectories | crux, near misses, clerical vs conceptual |
| Time and resource budgets | task.toml against measured durations | timeouts, headroom |
| Hygiene, metadata, docs | task.toml, Dockerfiles, file listing | structure, schema, extraneous files |

Produce one row per criterion, all 49:

```
| # | id | AutoQA | My verdict | Agree? | Evidence | Note |
```

`Evidence` is a `file:line`, a measured number, or a named trial. "Looks fine" is
not evidence. Use `unverifiable` when the package genuinely lacks what a
criterion needs, and say what is missing — that is a real finding, not a gap in
the review.

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

### 3. Run the audit as a cross-check

```bash
cd tb3-review && npm run tb3 -- analyze inbox/<package-or-parent>
```

This pass judges AutoQA's paperwork rather than the task: it flags verdicts whose
stated reasoning cannot support them, and contradictions between AutoQA, the
Reviewer Agent, and recorded trial outcomes. Writes
`tb3-review/out/<task>.review.md`.

Use it to catch what you missed in step 2, not as a substitute for it. A flag is
a claim about the *evidence*, never a verdict on the task.

### 4. Verify every flagged claim

This is the core of the job and the only part that produces a defensible
contest. A flag is a claim about the *evidence*, never a verdict on the task.

For each flagged criterion, open the file AutoQA cites and check whether the
claim is true. Both outcomes are useful:

- **Claim holds** → accept the label, and say in the note that you verified it,
  citing `file:line`.
- **Claim is wrong, unsupported, or stricter than the TB3 requirement** →
  contest it, quoting what the file actually says.

Do the same for the Reviewer Agent. The spec requires an invalid or unsupported
Reviewer Agent statement to be called out explicitly, so check its concrete
assertions rather than accepting the verdict.

Cite `file:line`. Never write "tests are weak" or "instruction is unclear"
without naming the exact mismatch.

### 5. Analyse the failing trials

Read the trajectory and `test-stdout.txt` for **every** trial, not only the
failing ones — trials that passed establish what a correct solution looks like,
which is what makes a near-miss judgeable.

```
<package>-trajectories/<model>/attempt_NN/
  verifier/test-stdout.txt   which assertion failed
  verifier/reward.txt        1 or 0
  agent/trajectory.json      { steps[], final_metrics }
  result.json                agent_result, verifier_result
```

The FP/FN judgement is a four-way join, in this order:

1. failing assertion, from `test-stdout.txt`
2. the test code that asserted it
3. the instruction clause it traces back to — or the absence of one
4. what the agent actually did, from `trajectory.json`

A test can be technically correct yet wrong for the task if it enforces an
unstated requirement. An agent can fail fairly even when the test is well
written. Only the four together settle it.

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
brittleness — confirm they are independent runs by comparing session ids, since
parallel launches produce near-identical durations.

### 6. Reconcile and decide each criterion

Judge against the rubric's own intent, which the dossier prints. Do not apply a
stricter standard than the rubric states — over-strictness is itself a contest
ground.

Where your step-2 verdict differs from AutoQA's, that disagreement is the
finding: say which of you the evidence supports, and why. Where you agree, say
what you checked so the agreement carries weight.

A non-passing label (`FAIL`, `LOW`, `MOD`) fails TQA review until it is accepted
or contested on the record. Treat those first.

Rubrics interact. An instruction gap lowers instruction quality, lowers
coverage, and can create false positives or negatives at once. When one fails,
check whether the same root cause hits another before finalising.

### 7. Write the review comment

Use this structure verbatim:

```
Review:
TQA Status: <TQA verdict and your feedback about it>
Reviewer Agent Status: <RA verdict and your feedback about it>
My Analysis: <your analysis, whether it should pass or fail>
Evidence for your analysis:
  - <concrete evidence: test case, code line range, trajectory observation>
Final Verdict: ...
Fixes:
  - <recommendations that would make the task shippable>
```

## Reading the flags

Nearly all signal comes from one distinction — what kind of rationale sits
behind a verdict:

| Rationale | Example | Meaning |
| --- | --- | --- |
| Measured | `Oracle solve.sh produced reward 1.0` | Anchored to an outcome. Sound. |
| Absence-based | `Not flagged by analyze.` | Nothing fired. Does not distinguish "verified" from "never examined". |
| Procedural | `Flagged yellow — a non-blocking warning.` | Describes the blocking policy, not the task. Weakest. |

Highest-value flags, in order:

1. `reviewer-agent-false-claim` — a Reviewer Agent statement contradicted by the files
2. `job-result-contradiction` — a job reporting `passed: false` behind a passing criterion
3. `analyze-contradiction` — a recorded failure behind a PASS, discounted only as non-blocking
4. `nonpassing-verdict-undecided` — a MOD/LOW/FAIL with no mark yet
5. `measured-near-miss` — a failure by a tiny numeric margin
6. `absence-based-pass` — passing only because nothing flagged it

`tb3-review/README.md` lists every rule.

## Package layout

```
<batch>__<task>/
  harbor-view/tasks/<batch>__<task>/   the shipped task           <- authoritative
  review-session/<batch>__<task>.json  49 verdicts + your marks
  run/<task>/<ts>/conclude/
    claude_skill_review.md             Reviewer Agent verdict
    claude_skill_review.annotations.json
  run/<task>/<ts>/snapshots/           the task at earlier pipeline stages
  harbor-view/jobs/                    raw job output (noise)
<batch>__<task>-trajectories/<model>/attempt_NN/
```

Review the **shipped** task under `harbor-view/tasks/`. The `snapshots/` copies
are earlier pipeline stages; quoting them produces claims about bytes that were
never shipped. When checking whether a claim about a file is wrong, confirm
across every copy before saying so.

In the session JSON, two things must not be conflated:

- `jobsByCommand[cmd].verdicts[]` — what AutoQA concluded
- `rubric[criterionId]` — what the human reviewer marked

Membership is not symmetric. `honest_agent_trial` has a verdict but is not one
of the 49 cards; `readme_provides_context` is a card with no verdict.

## Handling large files

The session JSON runs to thousands of lines and trajectories are hundreds of KB
each. Query them; do not read them whole.

```bash
jq -r '.rubric | to_entries[] | select(.value.decision != "accept")' session.json
jq -r '.jobsByCommand[].verdicts[] | select(.value != "PASS")' session.json
jq -r '.steps | length' agent/trajectory.json
```

## Reference

- `tb3-review-workflow.md` — the full review process
- `tb3-review/README.md` — audit rules and package structure
- `npm run tb3 -- rubrics` — all 49 rubrics, ids, and how each is decided
