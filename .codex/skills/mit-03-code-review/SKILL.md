---
name: mit-03-code-review
description: Reviews a Terminal Bench 3.0 (TB3) task from prepared code-review/out evidence, covering all 49 rubrics in six evidence groups and checking TQA and Reviewer Agent claims. Use when reviewing a TB3 task, batch_prod_*__* package, TQA or TuringQA findings, false positives, false negatives, instruction-test alignment, or reviewer portal evidence.
disable-model-invocation: true
---

# TB3 task review

Independently audit all 49 TQA rubrics against primary task evidence. Work in six
groups so shared evidence is checked once, then write 49 numbered blocks in
portal order. Each block contains the TQA finding and a human rubric rating of
`PASS`, `FAIL`, `LOW`, or `MOD`. Use `ACCEPT` or `REJECT` only for the final task
decision.

TQA is the review being audited. The Reviewer Agent is another automated review,
not a judge or a stronger source. Decide each portal criterion from the TQA
finding, rubric definition, and primary evidence. Read Reviewer Agent findings as
optional leads before reviewing the six groups. Verify useful leads against
primary evidence. Never use agreement, disagreement, confidence, or silence
between agents as a voting mechanism.

**Never submit anything.** No marks, no verdict, no portal writes. The user reads
the draft and enters marks by hand. There is no network code in the tool and
there must not be.

## Three disciplines that decide whether the review is trusted

Every finding obeys these three. A review that skips them reads as confident but
unverifiable, and the reader rejects it. Nearly every rejected review fails one
of these three.

### 1. Cite the exact text, never paraphrase

Never write "the instruction says", "the test checks", "the spec requires", "the
comment notes", or "the tests use X" and stop. Follow every such claim with the
**verbatim words in quotation marks**, and name the file and symbol they live in.
The reader must see what is present or missing without opening a file.

Stop: `read_tuples ignores lsn` / `the tests use horizon 249` / `the instruction
requires the checkpoint horizon`.

Do: `read_tuples builds tup = (rec["xid"], rec["op"], rec["key"], rec["value"])
— four fields, no lsn` / `249 comes from HORIZON = last_checkpoint_lsn - 1 in
tests/gen_data.py` / `instruction.md, "Recovered tuples", says only "emit every
tuple the engine reports as live" and never mentions a horizon`.

Applies to instruction clauses, test assertions and comparisons, code comments,
schema/field definitions, the three `task.toml` explanation fields, and any
number (quote the line that produces it). One short quote per point; quote the
load-bearing phrase. Quoting the task's own files is required — the copyright
limit is about external works, not files under review. Every `Evidence` bullet is
a verbatim quote or a named symbol whose text the `Reason` already quoted. Always
use the real name of every test, file, and variable — never a placeholder like
"test G" or "tests B, C, and G".

### 2. The solve-time visibility test (load-bearing-rule check)

Every rule the verifier enforces must be one the agent could have known. Before
accepting **Tests Align (#14)**, **Task Specification (#43)**, **No False
Negatives (#41)**, or **Instruction Quality (#33)**, for each enforced rule:

1. Quote the exact assertion or comparison that enforces the rule.
2. Trace where the rule is declared: the instruction (quote the clause) or a file
   the agent can read at solve time (name it, quote the text).
3. Confirm the file is present at solve time. Read `environment/Dockerfile` and
   every setup script; trace each `COPY`, `ADD`, `RUN`, and `rm`. A file
   generated then deleted before the agent starts, or copied only into the
   `tests/` image (a common pattern is a `gen_data.py` run then removed), is
   **not** agent-visible. Say in words what the agent can and cannot read at
   start.
4. Classify: **derivable** (in the instruction or an agent-visible file — fair),
   or **not derivable** (only in a verifier-only or deleted-before-start file,
   and not implied by anything visible — a **false negative and alignment defect
   that blocks the task**).

"The rule is in the instruction" is not acceptable without the quote. "The agent
could infer it" is not acceptable without naming the exact visible line the
inference starts from and why the inference is unique, not one of several
defensible readings.

### 3. Explain failing trials assertion by assertion

"16 trials failed" is not a finding. For each distinct failing assertion: quote
the assertion and name its file/function; give the concrete failing values
("tuples 51 and 145", never "some tuples") with expected vs produced; quote the
expected logic and run test 2 on it; state what a solution correct by the visible
contract produces for those cases; then give the verdict and the split with
counts ("14 of 16 failures are the non-derivable horizon rule; 2 are genuine").
Convergent failures at one value are a reliably triggered condition; whether it
is a fair or unfair trap is what tests 2 and 3 decide.

## Rating rules and calibration

### Rate from evidence; do not over-fail

Your job is to rate each rubric accurately, not to find something wrong. A
well-built task PASSes most or all rubrics, and PASS is the correct outcome when
the evidence supports it. You have full visibility of the task, so judge each
rubric against its own stated bar (the TQA review file prints it) and never invent a
stricter standard. Mark FAIL or MOD only when a concrete defect is proven from
the evidence. Reserve `REJECT` for a real blocker that survives the second pass.
Do not stack minor concerns into a rejection. Do not hunt for a reason to fail:
if a rubric is genuinely fine, mark it PASS with a short reason and move on. A
genuine failure is fine to mark; a manufactured one is not.

### The portal takes only PASS or FAIL

The rubric vocabulary is PASS, FAIL, LOW, and MOD, but the portal accepts only
PASS or FAIL. Whenever the rating is not a bare PASS or FAIL, append the
submittable verdict in brackets, and that bracket is what the human enters:
`MOD (PASS)`, `MOD (FAIL)`, `LOW (PASS)`, or `LOW (FAIL)`. A MOD or LOW that does
not block shipping resolves to `(PASS)`; one that blocks shipping resolves to
`(FAIL)`. Every non-PASS/FAIL rating must carry one.

### Solve rate and runtime belong to specific rubrics only

Trial solve rate and trial runtime judge whether the task fits its time and
resources: Task is Solvable in Reasonable Time (#5), Timeouts and Resources are
Appropriate (#27), and Low Timeout (#48). They are also evidence for the rubrics
that read agent *failures* — Core Challenge (#13), Difficulty Crux (#45), Near
Misses (#46), and Failure is Agent Fault (#42) — but only when trials actually
fail, because those rubrics are about how honest agents fail. If no honest trial
failed, there is no failure pattern to judge; do not manufacture one from
runtime, and rate those rubrics PASS unless source evidence contradicts the
intended crux.

Do NOT use solve rate or runtime to fail these:

- **Task is Genuinely Difficult (#6)** asks only whether the difficulty comes
  from the problem, reasoning, diagnosis, or environment rather than artificial
  clerical burden. A fast solve, a high solve rate, or an instruction that states
  the diagnosis does not make a task clerical and is not grounds to fail #6. Fail
  #6 only when the real work is clerical: renaming, reformatting, boilerplate, or
  repetitive edits with no reasoning.
- **Expert Time Estimate is Plausible (#29)**: a large or generous estimate is
  fine. Never fail #29 for being too high, no matter how large. Only note a
  concern if the estimate is implausibly low for genuine difficulty, and be
  lenient even then.
- **Non-Clerical Difficulty (#49)** asks the same source-of-difficulty question
  as #6, not how long a model took.

### A missing TQA verdict is not a TQA failure

TQA does not run every rubric on every task. When SOTA models pass all 16 trials,
the 7 rubrics produced by the Harbor Analyze job — the failure-analysis rubrics
that need a failing trial to evaluate — are intentionally left unevaluated. README
Provides Context (#28) and Uses Structured Output When Appropriate (#20) also
usually stay unevaluated on purpose in any case. A `No verdict`, blank, or
`UNEVALUATED` TQA result on these means the rubric was **not run**, not that TQA
failed it. Record it as `No verdict (not run on purpose)` in `TQA review`, never
as a TQA FAIL, and never contest a non-existent TQA failure. You still produce
your own rating with full reasoning and evidence for every one of the 49,
whatever the SOTA result.

## Workflow

```
- [ ] 1. Prepare the review output
- [ ] 2. Read only the prepared evidence in `code-review/out`
- [ ] 3. Extract optional Reviewer Agent leads
- [ ] 4. Build the agent-visible inventory at solve time; audit leakage
- [ ] 5. Judge all six evidence groups, quoting evidence
- [ ] 6. Run the solve-time visibility test on every load-bearing rule
- [ ] 7. Check FP/FN, clarity, alignment, metrics; anatomize failing trials
- [ ] 8. Audit TQA findings against primary evidence
- [ ] 9. Write grouped, human review findings with quotes
- [ ] 10. Second pass: revalidate blockers, write `<task>.human-review-2.md`
```

### 1. Prepare the evidence

```bash
cd code-review && npm run prepare-review -- inbox/<package-or-parent>
```

This creates the only files used during review:

```text
code-review/out/
  <task>.tqa-review.md
  <task>.reviewer_agent.md (when present)
  <task>/
    reviewer-working-copy/
    trajectories/<model>/attempt_NN-pass|fail/
      verifier/test-stdout.txt
      verifier/reward.txt
      result.json
```

Do not return to `inbox`, `harbor-view`, `run`, or the original trajectories
after preparation. File and line citations point to the prepared output. Quote
verbatim text from `reviewer-working-copy`, not from the TQA review file's paraphrase.

Do not load or recursively search the entire `out/` folder. Start with the
TQA review file headings. Open only the task file, test, or selected attempt needed for
the current group. Read tests one at a time and follow specific claims to source.

Treat `data/`, `input/`, `inputs/`, datasets, fixtures, and large artifacts as
metadata-only by default. Only when a specific criterion remains unresolved,
state the edge case and read the smallest useful sample. Never load a whole large
or binary data file into context.

Inventory and open every non-data task file: all root files and every source,
script, note, configuration, and text document under `solution/`,
`environment/`, and `tests/`, including any data-generation script. Review each
file for every rubric it can affect. Suspicious names only change review order;
they never limit scope.

### Reviewer Agent leads

Skim the Reviewer Agent report once before the six groups. Extract only concrete
leads: a named file or test, a claimed instruction-test mismatch, a possible
FP/FN path, a metric to verify, or an unexplained trial pattern. Do not copy its
verdicts into the criterion blocks. Track leads internally as `confirmed`
(primary evidence proves it — cite the primary evidence), `refuted` (primary
evidence contradicts it — drop it), or `not checked` (unnecessary or unsettled —
must not affect a decision). Leads change what you inspect, never what you mark.

### 2 & 4. Agent-visible inventory and solution-leakage audit

Mandatory, and it is the same inventory the solve-time visibility test needs.
Trace every `COPY`, `ADD`, `RUN`, generated file, mounted input, deletion, and
pre-existing work-directory file in `environment/Dockerfile` and setup scripts.
Build the full list of what the agent can read at task start. Do not check only
files named `solution` or `test`.

Two questions from one inventory: **leakage** (a visible file hands the agent
knowledge it should derive) and **missing rule** (the verifier enforces a rule
that lives only in a file the agent cannot see — the load-bearing-rule defect).

Open every agent-visible non-data file regardless of name: root files, source,
notes, reports, helpers, examples, configuration, generated text, and files
copied from `solution/`, `environment/`, or elsewhere into the agent image. Names
like `prior_*`, `analysis*`, `analyst_notes*`, `notes*`, `reference*`,
`expected*`, `answer*`, `solution*` are hints only.

For leakage, compare each with the instruction, oracle, and verifier for: (1)
near-complete solution logic; (2) hidden output keys, schemas, expected values,
constants, or bucket rules; (3) comments naming remaining defects or exact fixes;
(4) copied oracle functions or verifier-only edge cases; (5) intermediate outputs
that bypass the intended reasoning. For a leak, quote the leaking text, name the
path, the exact knowledge exposed, the work it replaces, and the shortcut it
enables. Files like `/app/prior_analysis.py` and `/app/analyst_notes.md` are
blocking when they reveal near-complete logic, hidden output keys, or remaining
fixes. Map impact to anti-cheat robustness (#3), shortcut resistance (#9), core
challenge (#13), no extraneous files (#32), false-positive protection (#40).

If prepared evidence lacks the complete agent-visible inventory and all copied
text files, record a preparation gap and do not claim leakage checks passed.
Missing evidence is not proof of a leak, but an assumed clean environment is not
a basis for PASS.

### Full non-data source audit

Open every non-data file in the working copy: all root files (instruction,
metadata, READMEs, notes, helpers); every file under `solution/`; every file
under `environment/`; every file under `tests/`, including the Dockerfile,
`test.sh`, test modules, helpers, configuration, non-data fixtures, and any
data-generation script. A data-generation script is where load-bearing rules most
often hide; read it and check whether the agent can see it.

Review each file across all applicable metrics. Solution files affect oracle
honesty, hardcoding, determinism, leakage. Environment files affect agent
visibility, dependencies, reproducibility, safety, runtime behavior. Test files
affect alignment, coverage, FP/FN, anti-cheat, reward handling, failure
attribution. Root notes and helpers affect specification, extraneous files,
leakage, difficulty, shortcuts.

Skip `data/`, `input/`, `inputs/`, and large fixture contents by default. Still
inspect names, paths, sizes, schemas, generation code, and how source or tests
consume them. Read a bounded sample only for a concrete criterion.

### 5. Judge all 49 in six groups

Work one group at a time; each group's sources are read once.

| Group | Sources | What it settles |
| --- | --- | --- |
| Solvability and oracle honesty | solution, tests, measured rewards | oracle success, derivation, deterministic validation |
| Verifier strength | tests, environment, NOP and trial results | false positives, cheat resistance, reward integrity |
| Grading fairness | instruction against tests, failing assertions | specification, clarity, false negatives, coverage, alignment |
| Difficulty and realism | instruction, difficulty_explanation, trajectories | crux, near misses, clerical vs conceptual |
| Cleanliness and determinism | task.toml, Dockerfiles, file listing, timing | reproducibility, timeouts, structure, schema |
| Documentation and safety | instruction, task.toml explanations, README | clarity, context, metadata, safety |

Use the groups to organize evidence, but write a separate numbered decision for
every criterion 1 through 49. Each block reports TQA's finding and the human
rating, quoting the load-bearing text. Shared evidence may be cited more than
once. Do not place Reviewer Agent comments in the criterion blocks. Do not
replace numbered blocks with group conclusions.

Evidence is a named and quoted test, function, variable, document section,
measured number with its meaning, or naturally named trial. "Looks fine" is not
evidence. If prepared output lacks what a criterion needs, record the preparation
gap; do not convert missing review evidence into a task defect, and do not claim
PASS without support.

### 6. Solve-time visibility, applied

For every load-bearing rule the verifier enforces, run discipline 2 and record
the verdict in the relevant block. This is the check the reviewer feedback asked
for: not "the tests use horizon 249", but the exact line that sets 249, whether
the agent can see it, and why an agent reasoning only from visible files would or
would not arrive at it. A rule enforced but not derivable is a false negative and
alignment blocker.

### 7. False positives and false negatives — the core

- **False positives** — name a concrete wrong solution that would still pass, or
  quote the specific assertion that blocks each bypass you considered. A separate
  verifier stops the agent from reading hidden tests. It does not stop hardcoding
  values derived from fixed inputs visible in the agent's own container.
- **False negatives** — for each failing assertion, decide whether the agent was
  wrong or the test was, using disciplines 2 and 3. Over-specification looks like
  exact float equality, ordering sensitivity, one arbitrary output spelling, or a
  rule enforced only from a file the agent cannot read.

Do not report "none" until every assertion is checked both ways: (1) what
incorrect result could satisfy this assertion? (2) what correct result could it
reject? For every FP/FN finding, quote at each step in this order:

1. What the instruction requires or permits (quoted, or record its silence).
2. The named test and assertion that accept or reject the result (quoted).
3. Solve-time visibility: for an FN, is the enforced rule derivable? Quote the
   declaring file or record its absence.
4. The concrete wrong solution that passes, or visible-contract solution that
   fails, with specific values.
5. Why the verifier result is wrong for the written or derivable contract.
6. Proof level: a naturally named trial demonstrates it (give the anatomy), or
   source inspection shows only that it is possible.
7. The smallest fix that closes the gap.

Do not write only "hardcoding can pass" or "a correct solution can fail." Name
the fixed values, the untested variation, or the valid output shape the verifier
mishandles. If evidence cannot support that detail, do not claim an FP or FN;
record what is missing and rate only from what primary evidence proves.

### `test.sh` reward control flow

Read `tests/test.sh` in execution order, quoting the relevant line for each:

1. A reward written before pytest is a hard failure for Reward File Written
   Correctly. A default zero can hide an `AgentTimeoutError` as a normal failure.
2. If `set -e` is active at pytest, the script must use `set +e` or another
   explicit construct to capture pytest's exit code. Otherwise a failed test can
   exit before `reward.txt` is written and Harbor reports `RewardFileNotFound`.
3. `reward.txt` must be written before the final exit. `exit 0` and an exit with
   pytest's captured code are both acceptable after the reward write.

Quote the pytest command, reward write, and final exit. Explain order and effect
without relying on line numbers.

### 8. Audit TQA findings

The core of the job and the only part that produces a defensible contest. A flag
is a claim about the *evidence*, never a verdict on the task. For each TQA claim,
open the relevant primary evidence under `out/<task>/reviewer-working-copy` and
check whether the claim is true:

- **Claim holds** → report the finding accurately and use the verified quoted
  evidence in the human reason.
- **Claim is wrong, unsupported, or stricter than the TB3 requirement** → explain
  the mismatch and quote what the evidence actually says.

Do not consult the Reviewer Agent to settle a criterion. Prefer the test
function, assertion, variable, command, or document section, quoted. Use a short
task-relative path such as `/tests/test_outputs.py:290-303` only when lines help.
Never include `out/<task>/reviewer-working-copy/` in the report. Never write
"tests are weak" or "instruction is unclear" without quoting the exact mismatch.

### Analyse selected trials

The export keeps one passing attempt per model and every failing attempt. A pass
is a control; failures show which assertions need review.

```
out/<task>/trajectories/<model>/attempt_NN-pass|fail/
  verifier/test-stdout.txt   which assertion failed
  verifier/reward.txt        1 or 0
  result.json                selected agent_result and verifier_result fields
```

Apply the failing-trial anatomy (discipline 3) in this order: the failing
assertion from `test-stdout.txt`; the test code that asserted it; the instruction
clause it traces to, or the absence of one; whether the rule is derivable; the
concrete failing values; the derivability verdict and split. A test can be
technically correct yet wrong for the task if it enforces an unstated or
non-derivable requirement. An agent can fail fairly even when the test is well
written. Do not claim what the agent thought; the compact output omits its steps.

When many trials converge on the same discrepancy, that points at a systematic
cause, not agent variance. When independent solutions all reproduce the expected
result, that is strong evidence the verifier is not over-strict.

Before calling anything a near miss, check the denominator. A margin is relative
to the expected value, so an assertion on an aggregate can be off by a fraction
of a percent while the answer is categorically wrong on the tested concept — 11
wrong clusters out of 33,576 is 0.03% and also a total failure of the facet the
task exists to test. Convert the margin into units the task cares about: records,
clusters, or crafted trap cases.

### Reconcile each group

Judge against the rubric's own intent, which the TQA review file prints. Do not apply a
stricter standard than the rubric states — over-strictness is itself a contest
ground. Where your conclusion differs from TQA, that disagreement is the finding;
say which conclusion the evidence supports and quote why. Where you agree, say
what you checked so the agreement carries weight. Check non-passing TQA labels
(`FAIL`, `LOW`, `MOD`) first because they point to possible blockers. Rubrics
interact: an instruction gap lowers instruction quality, lowers coverage, and can
create FP/FN at once. When one fails, check whether the same root cause hits
another before finalising.

### 9. Write the review comment

The finding work is separate from the writing work. A correct finding written at
four times the needed length reads as machine output and gets rejected before it
is judged. Write it the way a senior reviewer fills in a form: state the finding,
quote the load-bearing text, show the number, stop.

#### Voice

- Two or three short sentences per point. If two settle it, do not write five.
- **Every block stands alone for a non-expert.** A reader who sees only that one
  block must understand what is wrong and why, and think "I see what is
  happening." Do not assume they read the other 48 blocks.
- **Name the thing; never leave a bare pointer.** Do not write "the contract",
  "those details", "it also states", or "this behavior" without immediately
  saying which contract, which details, what it states. A quote does not replace
  naming what the quote is.
- **Never use placeholder labels. (Important.)** Never relabel a test, file,
  assertion, or item as "A", "B", "C", "test G", "the first test", "Test 1", or
  "item 2". Always use its real name: the actual test function
  (`test_decode_matches_reference`), file, variable, or assertion. When you mean
  several, name each one — "`test_decode_matches_reference`,
  `test_restart_exactly_once`, and `test_in_flight_commit_after_restart`", never
  "tests B, C, and G". An outside reader must follow the whole review without ever
  opening the codebase; invented labels make that impossible.
- **Gloss or cut jargon.** Explain every technical term in plain English the
  first time, and cut any technical detail that does not help explain the
  finding. A phrase like "float64 accumulation and copying buffers from the
  latest checkpoint" means nothing on its own: say what it is and why it matters,
  or leave it out.
- **Clarity beats polish.** Plain, even slightly imperfect English is fine; dense
  precise-but-opaque English is not. Do not make the reader decode the sentence.
- **Use the simplest words, everywhere.** Write every reason and explanation in
  very simple, everyday English. No big or fancy words when a plain one works:
  "use" not "utilize", "show" not "demonstrate", "enough" not "sufficient", "so"
  not "therefore", "leaves out" not "omits". Short words, short sentences. A
  reader should understand each sentence on the first read with no effort. This
  applies to the technical terms too: keep the quoted symbol, but explain it in
  plain words.
- **Do not write like an AI. (Important.)** The review must read like a busy
  human engineer typed it, not a model. Cut AI-tell words: "delve", "leverage",
  "utilize", "robust", "crucial", "seamless", "comprehensive", "meticulous",
  "furthermore", "moreover", "notably", "it's worth noting", "it is important to
  note", "that said", "in essence", "underscores", "highlights". Cut AI sentence
  shapes: the "not only X but also Y" frame, the rule-of-three list used for
  rhythm ("clear, precise, and complete"), the hedge-then-pivot ("while X, it is
  also Y"), and the tidy summarizing closer at the end of a block. Say the thing
  once, plainly, and stop. If a sentence sounds like marketing or like a model
  wrapping up, rewrite it.
- **No internal or tool words in the review.** State facts and sources the way a
  person would. Never write "TQA review file", "dossier", "reviewer-working-copy",
  "trajectory export", "the export", an `out/...` path, or a command name in a
  Reason, Evidence bullet, or the final block. Name the instruction, the tests by
  function name, the oracle, and the trials in natural English; call the automated
  reviews "TQA" and "the Reviewer Agent". For a measured number, state the number
  and what it means, not where it was recorded: write "the no-op solution scored
  0", not "the TQA review file records no-op reward 0".
- **Quote the load-bearing text.** A short verbatim quote is the finding, not
  colour. Never paraphrase the instruction, an assertion, or a comment when the
  exact words prove the point. Then say in plain words what the quote means and
  why it passes or fails: the quote is the proof, the plain sentence is the
  explanation. Never leave a quote to speak for itself.
- No process narration in criterion blocks. Do not write "I read", "I opened", "I
  diffed", "I traced the reward path", "I checked every assertion". Say what the
  file or test does. Keep "I" for the final block, where a judgement is owned.
- No colour beyond the quotes the finding needs. Write "the difference was 0.0004
  against a 0.0001 bound", not "four hundredths of one cent". Translate a number
  into task units once, where it first matters.
- No sub-headings inside `Reason` ("What the contract permits:", "Why the result
  is wrong:"). Those are thinking scaffolds, not prose.
- No hedging pairs ("well built and worth shipping once the precision contract is
  closed"). Give the rating and the reason.
- Plain declarative sentences. Do not use em dashes. Use plain words ("use", not
  "utilize").
- One fact, one place. When one defect explains four rubrics, write it in full
  once and refer back in one sentence elsewhere.
- Write for a leadership reader with no code context. Gloss a technical term the
  first time it appears; a quoted symbol still needs a plain-English gloss.
- Never write "tests are weak" or "instruction is unclear" without the quoted
  mismatch.

#### Length limits

| Field | Limit |
| --- | --- |
| `Reason`, PASS | 2 to 4 sentences |
| `Reason`, FAIL / LOW / MOD | up to 8 short sentences, or up to three short paragraphs when a quote, a formula, and a counter-example are all needed |
| `Evidence` | at most 3 bullets, one line each, each a quote or named symbol |
| `Required fix` | one sentence |

The required quotes count as content, not padding, and the FAIL/LOW/MOD limit
leaves room for them. When a block runs long, the extra text is almost always
process narration, a repeated number, or a restated analogy. Cut those, never the
quote.

#### What the short sentences must still carry

Every block still names and **quotes** the instruction section, test, function,
variable, command, comment, or schema field behind the finding, with no numeric
line ranges, and explains the behavior so the reader need not open the source.
State the problem before naming the file. Give a number's meaning in task terms
once, with its denominator. For alignment, specification, and false-negative
findings, carry the solve-time visibility verdict — quote the enforcing assertion
and the declaring clause, or state that the rule appears only in a named
verifier-only or deleted-before-start file. For FP, FN, alignment, and coverage
findings, quote what the instruction permits, the exact assertion that accepted
or rejected the result, and the concrete wrong pass or wrong failure with values.
For Difficulty Crux, Near Misses, False Negatives, and Failure Attribution, give
the affected trial count against its denominator ("8/8 Codex trials passed 11 of
12 tests"), the specific failing cases, and the split between
non-derivability/ambiguity failures and independent agent mistakes. Name trials
in natural English ("the third Codex trial"), never `attempt_03-fail`.

#### Write every Reason so it can be lifted verbatim

Take the blocks rated `FAIL`, `LOW`, or `MOD`, keep the same wording and quotes,
and paste them under `My Analysis`. If a `Reason` cannot be pasted into a
leadership summary as written, it is written wrong. Fix it in the criterion
block, not the summary.

#### How it should read

Too vague — the failure the reviewer feedback caught, a claim with no quote and
no visibility check:

> The tests expect recovered tuples at horizon 249, but the agent used
> `Engine.is_live`, so 16 trials failed. This is the agent's mistake.

Right — quoted, visibility-checked, specific:

> `instruction.md`, "Recovered tuples", says only "emit every tuple the engine
> reports as live", and the agent-visible `Engine.is_live` returns true for
> tuples up to the latest LSN. The verifier expects only tuples at or below LSN
> 249, a bound set by `HORIZON = last_checkpoint_lsn - 1` in `tests/gen_data.py`.
> That file is generated and deleted in `environment/Dockerfile` ("rm
> gen_data.py") before the agent starts, so the rule is in no agent-visible file.
> 14 of 16 failures are tuples 51 and 145, both above 249, which a solution
> correct by the visible `is_live` contract must emit. These are false negatives
> from a non-derivable rule, not agent mistakes.

Right — FP with the wrong solution and reward named:

> The instruction requires agents to repair and execute the `deadaudit` service
> twice. The verifier never runs or imports the submitted service; it only reads
> `audit.json` and `audit_run2.json`. Manual testing submitted two static
> expected JSON files with no service implementation. All 12 tests passed and
> reward 1 was awarded.

#### Reviewer Agent notes

Keep `## Reviewer Agent notes` to at most six one-line bullets, each naming the
claim and its status: confirmed, refuted, or not checked. One closing sentence
says the notes did not decide any human rating. No paragraphs.

#### The final block

Use this structure verbatim:

```
Review:

TQA Status: <what TQA marked, then the key metrics in one or two sentences: solve counts per model, oracle, no-op and cheat rewards, infra errors, and the common trial pattern>
Reviewer Agent Status: <its verdict and the reason it gave, in one or two sentences>

My Analysis:

<Failed rubric name / second rubric name when one root cause spans both>: <FAIL | MOD (PASS|FAIL) | LOW (PASS|FAIL)> <append 🔁 if the second pass changed this>

<the same wording as that criterion's Reason, quotes included, in two to four short paragraphs>

<repeat for each failed rubric group, in portal order>

Final Verdict: <Accept|Reject>

<two or three sentences: what TQA and the Reviewer Agent concluded, the blocking defect, and the decision>

Fix: <the concrete changes, listed in one or two sentences; omit when accepting>
```

`My Analysis` has two shapes depending on the decision. Never write a static
"nothing failed" line either way.

**When rejecting** (one or more blocking `FAIL`): open with one or two sentences
on what the task requires in plain words, then give each `FAIL` and each
non-blocking `MOD`/`LOW` group with its Reason wording, quotes included, in
portal order. This is the shape shown in the template above.

**When accepting**: write the positive case a reader can trust, not one line.

- One short paragraph on what the task fairly requires, in plain words: what the
  agent must read, do, and produce.
- One paragraph on the positive evidence: the solve counts, that any one or two
  honest failures were genuine agent mistakes and not task defects, that no
  passing trial hardcoded the visible sample, reused stale artifacts, or took a
  shortcut, and that the recorded cheat scored 0.
- One paragraph on the minor, non-blocking concerns you did find: the `MOD`/`LOW`
  items and any source-only false-negative or false-positive paths, each stated
  plainly and each noting that no recorded honest or cheat trial triggered it.
- `Final Verdict: Accept`, with one or two sentences on why those reservations do
  not block, for example that they are reservations under trial-based
  adjudication.

Rules for the final block:

- When rejecting, name only the `FAIL` and non-blocking `MOD`/`LOW` groups, never
  the clean passes. When accepting, give the positives and the non-blocking
  reservations as above; do not list all 49.
- Use the rubric's portal name, not its id. Join rubrics with `/` when one defect
  causes both, for example `Task Specification / Instruction Quality` or
  `Tests Align with Instruction / No False Negatives`.
- Reuse the criterion block wording, quotes included. Do not paraphrase into a new
  voice and do not drop the quote to save space.
- Separate what a trial proved from what only source reading shows: "No recorded
  trial failed through these paths, so they are false-negative risks but not
  trial-confirmed."
- Report manual verifier testing as its own short paragraph when done. Say what
  was submitted, which tests passed, and what reward came back.
- Close with one `Fix:` line that lists the changes. Do not narrate them.

Write the full 49-block review to `code-review/out/<task>.human-review.md`. The
second pass then writes a separate `code-review/out/<task>.human-review-2.md`
with only the FAIL blocks and the final `Review:` block (step 10 below). Both
saved Markdown files are the deliverable. Do not leave the review only in chat.

Start with six short evidence-group conclusions, each naming the criteria covered
and stating the shared evidence once in three or four sentences. Follow with a
separate `## Criterion decisions` ledger containing all 49 criteria in strict
numeric order. Use this structure for every criterion:

```
### <number>. <criterion name> (`<criterion_id>`)
TQA review: <TQA's original result and a short account of what it checked>
Human rating: <PASS | FAIL | MOD (PASS|FAIL) | LOW (PASS|FAIL)>
Reason: <plain explanation of the rating, quoting the load-bearing text>
Evidence:
  - <a verbatim quote, or a named test/function/variable/section whose exact text the Reason already quoted, with the file it lives in>
Required fix: <only for FAIL, LOW, or MOD; omit for PASS when no change is needed>
```

`Human rating` must be submittable: a bare `PASS` or `FAIL`, or a `MOD`/`LOW`
followed by the bracketed `(PASS)` or `(FAIL)` the human will enter in the
portal. `TQA review` says what TQA checked and found, as a plain sentence that
names the result and the reason: "TQA failed the `anti_cheat_robustness` rubric
because the cheat run still scored reward 1", not "`anti_cheat_robustness`: TQA
recorded FAIL". If its label or explanation is wrong, explain that in `Reason`
and quote the contradicting evidence; do not add `TQA Decision`. `Human rating` is your own analysis. Reserve `ACCEPT` and
`REJECT` for the final task decision. Never omit a criterion because it shares
evidence with another. Missing exported evidence alone does not prove failure;
record that gap separately and use other primary evidence or a sufficient TQA
measured result. The six group conclusions do not replace any numbered decision.
Use 49 readable numbered subsections, not a table.

Return plain Markdown only. Do not create a canvas, web page, dashboard,
interactive app, or other presentation layer.

#### 10. Second pass, and the final file

Do not edit `human-review.md` during the second pass. The full 49-block review is
finished; leave it exactly as written. Instead, revalidate the blockers and write
a separate, submission-ready file:

```
code-review/out/<task>.human-review-2.md
```

It contains only the rubric blocks whose submittable verdict is FAIL (a bare
`FAIL`, or a `MOD`/`LOW` that resolves to `(FAIL)`), each with its full block
copied over, followed by the final `Review:` block. Non-blocking `MOD (PASS)` and
`LOW (PASS)` reservations get no block of their own here; they still appear inside
the final `Review:` block's `My Analysis`.

Before copying each blocker into the final file, revalidate it against its own
quotes, evidence, and reasoning:

1. Is the rating correct against the rubric's own bar, or did it over-fail? Drop
   it to PASS and leave it out of the final file when the evidence does not prove
   a real defect (see "Rate from evidence; do not over-fail").
2. Does it rest on the right evidence? Re-rate anything that fails #6, #29, or #49
   on solve rate or runtime, or judges #45 from runtime rather than an actual
   failure pattern.
3. Can a non-expert read the block and get the problem without cognitive
   overload? Rewrite it in very simple English if not, naming every "the
   contract" / "those details" pointer and glossing or cutting every unexplained
   term.
4. Is the bracketed `(FAIL)` present and correct?

If the second pass changed a blocker's rating or materially rewrote its reason,
append ` 🔁` to that block's heading and to its entry in the final `Review:`
block, so the user can see which items were re-checked and changed. Do not add the
marker to blocks you left unchanged.

Before finishing, check both saved files. `human-review.md` must contain exactly
49 numbered criterion headings, numbers 1 through 49 with no gaps or duplicates,
and the final `Review:` block. `human-review-2.md` must contain every FAIL
block and the same final `Review:` block. Confirm every non-PASS rating carries a
bracketed `(PASS)` or `(FAIL)`. Then re-read the failed blocks and both final
blocks against the voice rules and against discipline 1: every claim about the
instruction, a test, a comment, or a schema carries the verbatim text, and every
alignment/specification/false-negative finding carries the solve-time visibility
verdict. Cut any sentence that narrates your process, repeats a number, or
restates an analogy. Report both saved paths to the user.

## Prepared evidence layout

```
code-review/out/
  <task>.tqa-review.md                    TQA criteria and measured facts
  <task>.reviewer_agent.md    complete report, when present
  <task>/reviewer-working-copy/        task files used for review (quote from here)
  <task>/trajectories/<model>/
    attempt_NN-pass|fail/              compact selected trial evidence
```

The TQA review file is the source for TQA claims. Reviewer Agent findings stay separate
when present. The reviewer working copy is the source for task-file checks and
verbatim quotes. Do not mix one signal's verdict with another.

## Reference

- `workflow-docs/code-review-workflow.md` — the full review process
- `code-review/README.md` — preparation commands and generated layout
- `npm run tb3 -- rubrics` — all 49 rubrics, ids, and how each is decided
