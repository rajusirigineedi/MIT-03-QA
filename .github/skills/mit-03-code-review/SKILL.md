---
name: mit-03-code-review
description: Reviews a Terminal Bench 3.0 (TB3) task from prepared code-review/out evidence, covering all 49 rubrics in six evidence groups and checking TQA and Reviewer Agent claims. Use when reviewing a TB3 task, batch_prod_*__* package, AutoQA or TuringQA findings, false positives, false negatives, instruction-test alignment, or reviewer portal evidence.
disable-model-invocation: true
---

# TB3 task review

Independently audit all 49 TQA rubrics against primary task evidence. Work in
six groups so shared evidence is checked once, then write 49 numbered blocks in
portal order. Each block contains the TQA finding and a human rubric rating of
`PASS`, `FAIL`, `LOW`, or `MOD`. Use `ACCEPT` or `REJECT` only for the final
task decision.

TQA is the review being audited. The Reviewer Agent is another automated review,
not a judge or a stronger source. Decide each portal criterion from the TQA
finding, rubric definition, and primary evidence. Read Reviewer Agent findings
as optional leads before reviewing the six groups. Verify useful leads against
primary evidence. Never use agreement, disagreement, confidence, or silence
between agents as a voting mechanism.

**Never submit anything.** No marks, no verdict, no portal writes. The user reads
the draft and enters marks by hand. There is no network code in the tool and
there must not be.

## Workflow

```
- [ ] 1. Prepare the review output
- [ ] 2. Read only the prepared evidence in `code-review/out`
- [ ] 3. Extract optional Reviewer Agent leads
- [ ] 4. Audit every agent-visible file for solution leakage
- [ ] 5. Judge all six evidence groups
- [ ] 6. Check false positives, false negatives, clarity, alignment, and metrics
- [ ] 7. Audit TQA findings against primary evidence
- [ ] 8. Write grouped, human review findings
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

Inventory and open every non-data task file. This includes all root files and
every source, script, note, configuration, and text document under `solution/`,
`environment/`, and `tests/`. Review each file for every rubric it can affect.
Suspicious names only change review order; they never limit the audit scope.

### Reviewer Agent leads

Skim the Reviewer Agent report once before reviewing the six groups. Extract
only concrete leads: a named file or test to inspect, a claimed instruction-test
mismatch, a possible FP/FN path, a metric to verify, or an unexplained trial
pattern. Do not copy its verdicts into the criterion blocks.

Track useful leads internally as:

- `confirmed` — primary evidence independently proves the claim. It may affect
  a decision, but cite the primary evidence.
- `refuted` — primary evidence contradicts the claim. Do not use it.
- `not checked` — it was unnecessary or could not be settled. It must not
  affect a decision.

Reviewer Agent leads may change what you inspect. They never directly determine
what you mark. Do not spend review time proving every lead; prioritize claims
that could change a criterion or reveal an FP/FN.

### Agent-visible solution-leakage audit

This pass is mandatory. Trace every `COPY`, `ADD`, generated file, mounted input,
and pre-existing work-directory file in `environment/Dockerfile`. Build a full
inventory of what the agent can read at task start. Do not check only files named
`solution` or `test`.

Open every agent-visible non-data file regardless of its name or extension.
This includes root files, source, notes, reports, helpers, examples,
configuration, generated text, and files copied from `solution/`,
`environment/`, or elsewhere into the agent image. Names such as `prior_*`,
`analysis*`, `analyst_notes*`, `notes*`, `reference*`, `expected*`, `answer*`,
and `solution*` are hints only. They do not define the scope.

Compare every agent-visible non-data file with the instruction, oracle, and
verifier. Look for:

1. near-complete solution logic;
2. hidden output keys, schemas, expected values, constants, or bucket rules;
3. comments naming the remaining defects or exact fixes;
4. copied oracle functions or verifier-only edge cases;
5. intermediate outputs that bypass the intended reasoning.

For a leak, name the agent-visible path, the exact knowledge exposed, the work
it replaces, and the shortcut it enables. Treat files such as
`/app/prior_analysis.py` and `/app/analyst_notes.md` as blocking when they reveal
near-complete logic, hidden output keys, or remaining fixes. Map the impact to
anti-cheat robustness (#3), shortcut resistance (#9), core challenge (#13), no
extraneous files (#32), and false-positive protection (#40) as applicable.

The prepared evidence must include a complete agent-visible inventory and all
text files copied into the agent image. If it does not, record a preparation gap
and do not claim leakage checks passed. Missing evidence is not itself proof of
a leak, but an assumed clean environment is not an acceptable basis for PASS.

### Full non-data source audit

Open every non-data file in the prepared working copy:

- all root files, including instruction, metadata, READMEs, notes, and helpers;
- every file under `solution/`, including scripts, implementation files,
  helper modules, templates, and generated text;
- every file under `environment/`, including Dockerfiles, setup scripts, copied
  source, notes, and non-data assets;
- every file under `tests/`, including Dockerfiles, `test.sh`, test modules,
  helpers, configuration, and non-data fixtures.

Review each file across all applicable metrics. Solution files can affect oracle
honesty, hardcoding, determinism, and leakage. Environment files can affect
agent visibility, dependencies, reproducibility, safety, and runtime behavior.
Test files can affect alignment, coverage, FP/FN, anti-cheat, reward handling,
and failure attribution. Root notes and helpers can affect specification,
extraneous files, leakage, difficulty, and shortcuts.

Skip `data/`, `input/`, `inputs/`, datasets, and large fixture contents by
default. Still inspect names, paths, sizes, schemas, generation code, and how
source or tests consume them. Read a bounded sample only for a concrete
criterion or edge case.

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
original finding and the human rubric rating based on primary evidence. Use
`PASS`, `FAIL`, `LOW`, or `MOD`, following the rubric's vocabulary. Do not place
Reviewer Agent comments in the criterion blocks. Shared evidence may be cited
more than once. Do not replace the numbered blocks with group conclusions.

Evidence is a named test, function, variable, document section, measured number
with its meaning, naturally named trial, or file whose behavior is explained in
the report.
"Looks fine" is not evidence. If prepared output lacks what a criterion needs,
record the preparation gap. Do not convert missing review evidence into a task
defect, and do not claim the criterion passed without support.

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
5. Whether a naturally named trial demonstrates it or source inspection only
  shows that it is possible.
6. The smallest fix that closes the gap.

Do not write only "hardcoding can pass" or "a correct solution can fail." Name
the fixed values or inputs, the untested variation, or the valid output shape
that the verifier mishandles. If the evidence cannot support that detail, do not
claim an FP or FN. Record what evidence is missing and rate the rubric only from
what primary evidence proves.

### `test.sh` reward control flow

Read `tests/test.sh` in execution order:

1. A reward written before pytest is a hard failure for Reward File Written
   Correctly. A default zero can hide an `AgentTimeoutError` as a normal failure.
2. If `set -e` is active at pytest, the script must use `set +e` or another
   explicit construct to capture pytest's exit code. Otherwise a failed test can
   exit before `reward.txt` is written and Harbor reports `RewardFileNotFound`.
3. `reward.txt` must be written before the final exit. `exit 0` and an exit with
   pytest's captured code are both acceptable after the reward write.

Name the pytest command, reward write, and final exit. Explain their order and
effect without relying on line numbers.

### 3. Audit TQA findings

This is the core of the job and the only part that produces a defensible
contest. A flag is a claim about the *evidence*, never a verdict on the task.

For each TQA claim, open the relevant primary task evidence under
`out/<task>/reviewer-working-copy` and check whether the claim is true. Both
outcomes are useful:

- **Claim holds** → report the original finding accurately and use the verified
  evidence in the human reason.
- **Claim is wrong, unsupported, or stricter than the TB3 requirement** →
  explain the mismatch in the human reason and quote what the evidence says.

Do not consult the Reviewer Agent to settle a criterion. Its report may point to
a file or test worth checking, but the primary evidence must independently prove
the issue. Use the internal lead list during evidence review, then summarize
only useful confirmed or refuted claims after the 49 human decisions.

Prefer the test function, assertion, variable, command, or document section.
Use a short task-relative path such as `/tests/test_outputs.py:290-303` only
when lines help. Never include `out/<task>/reviewer-working-copy/` in the report.
When writing the separate Reviewer Agent notes, refer to comments by their
section or claim, not by the findings Markdown filename. Never write "tests are
weak" or "instruction is unclear"
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

The finding work is separate from the writing work. A correct finding written at
four times the needed length reads as machine output and gets rejected by the
reader before the finding is judged. Write it the way a senior reviewer fills in
a form: state the finding, show the number, stop.

#### Voice

- Two or three short sentences per point. If two sentences settle it, do not
  write five.
- No process narration in the criterion blocks. Do not write "I read", "I
  opened", "I diffed", "I traced the whole reward path", or "I checked every
  assertion". Say what the file or test does. Keep "I" for the final block,
  where a judgement is being owned.
- No colour and no rhetorical flourish. Write "the difference was 0.0004 against
  a 0.0001 bound". Do not write "four hundredths of one cent" or "within 30
  centimetres on a 30 kilometre leg". Translate a number into task units once,
  where it first matters, and never repeat that phrasing later in the document.
- No sub-headings inside `Reason`. Do not write "What the contract permits:",
  "The compliant solution that fails:", or "Why the result is wrong:". Those are
  thinking scaffolds, not prose.
- No hedging pairs. Do not write "well built and worth shipping once the
  precision contract is closed". Give the rating and the reason for it.
- Plain declarative sentences. "The instruction requires X. It never states Y.
  The verifier enforces Z. All eight trials failed on Z."
- Do not use em dashes.
- One fact, one place. When a single defect explains four rubrics, write it in
  full under the rubric it belongs to and refer back to it in one sentence
  elsewhere. Do not restate the same margin, the same trial count, and the same
  analogy in six blocks.

#### Length limits

| Field | Limit |
| --- | --- |
| `Reason`, PASS | 2 to 4 sentences |
| `Reason`, FAIL / LOW / MOD | 6 short sentences, or up to three short paragraphs when a formula and a counter-example are both needed |
| `Evidence` | at most 3 bullets, one line each |
| `Required fix` | one sentence |

Long is not thorough. If a block runs past the limit, the extra text is almost
always process narration, a repeated number, or a restated analogy. Cut those
first.

#### What the short sentences must still carry

The limits tighten the writing, not the content. Every block still names the
instruction section, test, function, variable, command, or file behind the
finding, with no numeric line ranges, and explains the behavior so the reader
does not have to open the source. State the problem before naming the file.
Give a number's meaning in task terms once, with its denominator. For FP, FN,
alignment, and coverage findings, name what the instruction permits, the exact
assertion that accepted or rejected the result, and the concrete wrong pass or
wrong failure. For Difficulty Crux, Near Misses, False Negatives, and Failure
Attribution, give the affected trial count against its denominator, such as
"8/8 Codex trials passed 11 of 12 tests", and separate ambiguity-caused failures
from independent agent mistakes. Name trials in natural English, such as "the
third Codex trial", never `attempt_03-fail`. Write for a leadership reader with
no code context and explain a technical term the first time it appears. Never
write "tests are weak" or "instruction is unclear" without the exact mismatch.

#### Write every Reason so it can be lifted verbatim

The final review is not composed a second time from scratch. Take the blocks
rated `FAIL`, `LOW`, or `MOD`, keep the same wording, and paste them under
`My Analysis`. If a `Reason` cannot be pasted into a leadership summary as
written, it is written wrong. Fix it in the criterion block, not in the summary.

#### How it should read

Too long, and the finding is buried:

> I checked every assertion for what wrong answer could satisfy it, and the
> numeric ones are well protected. `test_global_agreement` compares all four
> fields on all ten invoice lines against the reference, so a partially correct
> audit fails. Hardcoding is not a viable shortcut, because the expected numbers
> are not readable anywhere in the agent image and no verifier feedback reaches
> the agent during the run. The one real gap is the one TQA named, and I
> confirmed it against the sources.

Right:

> The instruction requires agents to repair and execute the `deadaudit` service
> twice. The verifier never runs or imports the submitted service. It only reads
> `audit.json` and `audit_run2.json`. Manual testing submitted two static
> expected JSON files with no service implementation. All 12 tests passed and
> reward 1 was awarded.

#### Reviewer Agent notes

Keep `## Reviewer Agent notes` to at most six one-line bullets. Each bullet
names the claim and its status: confirmed, refuted, or not checked. One closing
sentence says the notes did not decide any human rating. No paragraphs.

#### The final block

Use this structure verbatim:

```
Review:

TQA Status: <what TQA marked, then the key metrics in one or two sentences: solve counts per model, oracle, no-op and cheat rewards, infra errors, and the common trial pattern>
Reviewer Agent Status: <its verdict and the reason it gave, in one or two sentences>

My Analysis:

<Failed rubric name / second rubric name when one root cause spans both>: <FAIL|LOW|MOD>

<the same wording as that criterion's Reason, in two to four short paragraphs>

<repeat for each failed rubric group, in portal order>

Final Verdict: <Accept|Reject>

<two or three sentences: what TQA and the Reviewer Agent concluded, the blocking defect, and the decision>

Fix: <the concrete changes, listed in one or two sentences; omit when accepting>
```

Rules for the final block:

- Include only rubrics rated `FAIL`, `LOW`, or `MOD`. Never list passing rubrics.
- Use the rubric's portal name, not its id. Join rubrics with `/` when one defect
  causes both, for example `Task Specification / Instruction Quality` or
  `Tests Align with Instruction / No False Negatives`.
- Reuse the criterion block wording. Do not paraphrase it into a new voice.
- Separate what a trial proved from what only source reading shows. State it
  plainly: "No recorded trial failed through these paths, so they are
  false-negative risks but not trial-confirmed."
- Report manual verifier testing as its own short paragraph when it was done.
  Say what was submitted, which tests passed, and what reward came back.
- Close with one `Fix:` line that lists the changes. Do not narrate them and do
  not restate the analysis inside the fix.

Write the review to `code-review/out/<task>.human-review.md`. The saved Markdown
file is the deliverable. Do not leave the review only in chat.

Start with six short evidence-group conclusions. Each conclusion names the
criteria covered and states the shared evidence once, in three or four sentences.
Follow those conclusions with a separate `## Criterion decisions` ledger
containing all 49 criteria in strict numeric order. Use this structure for every
criterion:

```
### <number>. <criterion name> (`<criterion_id>`)
TQA review: <TQA's original result and a short account of what it checked>
Human rating: <PASS|FAIL|LOW|MOD>
Reason: <plain explanation of why this rubric receives that rating>
Evidence:
  - <primary evidence described by behavior, section, test/function/variable name, measured fact, or naturally named trial>
Required fix: <only for FAIL, LOW, or MOD; omit for PASS when no change is needed>
```

`TQA review` says what TQA checked and found. If its label or explanation is
wrong, explain that in `Reason`; do not add `TQA Decision`. `Human rating` is
your own analysis. Use `PASS`, `FAIL`, `LOW`, or `MOD` for each rubric. Reserve
`ACCEPT` and `REJECT` for the final task decision. Never omit a criterion because
it shares evidence with another criterion. Missing exported evidence alone does
not prove failure. Record that gap separately and use other primary evidence or
a sufficient TQA measured result. The six group conclusions do not replace any
numbered decision. Use 49 readable numbered subsections, not a table.

Return plain Markdown only. Do not create a canvas, web page, dashboard,
interactive app, or other presentation layer.

Before finishing, check the saved file. It must contain exactly 49 numbered
criterion headings, numbers 1 through 49 with no gaps or duplicates, and the
final `Review:` block. Then re-read the failed blocks and the final block once
against the voice rules above, and cut any sentence that narrates your process,
repeats a number already given, or restates an analogy. Report the saved path to
the user.

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
