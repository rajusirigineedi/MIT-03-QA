# code-review

Offline review pipeline for Terminal Bench 3.0 tasks.

Input is a task package downloaded from the reviewer portal. Output is a review
draft: all 49 criteria, what AutoQA concluded, and a shortlist of the criteria
where AutoQA's own evidence does not support its label.

**Nothing is ever submitted.** There is no network code in this repo. Marks and
the final verdict stay manual in the portal.

## Setup

```bash
npm install
```

Requires Node 22+ (uses native TypeScript type stripping, so there is no build
step).

## Use

Download **Full task package** and **trajectories** from the portal, extract
both into `inbox/`, then:

```bash
npm run tb3 -- dossier inbox    # evidence to judge all 49 yourself
npm run tb3 -- analyze inbox    # audit whether AutoQA's verdicts are supported
npm run collect-trajectories -- inbox
npm run copy-working-copy -- inbox
npm run prepare-review -- inbox # run dossier and both copy commands
```

The two passes answer different questions and are both needed.

`dossier` writes `out/<task>.dossier.md`: measured facts, per-trial durations
against the configured budgets, what actually failed in each failing trial, and
the 49 criteria grouped by the evidence they draw on. Task-file contents are not
embedded. The command also copies `conclude/claude_skill_review.md` unchanged to
`out/<task>.reviewer-agent-findings.md`.

`analyze` writes `out/<task>.review.md`: flags for verdicts whose own reasoning
cannot support them, and contradictions between AutoQA, the Reviewer Agent, and
recorded trial outcomes. It judges the paperwork, not the task, so it is a
cross-check on the second round rather than a replacement for it.

`collect-trajectories` keeps one passing attempt per model and every failing
attempt. It writes them under `out/<task>/trajectories/`, with names such as
`attempt_01-pass` and `attempt_03-fail`. Each selected attempt contains
`verifier/test-stdout.txt`, `verifier/reward.txt`, and a reduced `result.json`
with only `agent_result` and `verifier_result`. It does not copy
`agent/trajectory.json`.

`copy-working-copy` copies the package's `reviewer-working-copy/` directory to
`out/<task>/reviewer-working-copy/`.

`prepare-review` runs `dossier`, `collect-trajectories`, and
`copy-working-copy` in sequence.

```bash
npm run tb3 -- rubrics              # all 49 rubrics and how each is decided
npm run tb3 -- rubrics --cluster=verifier
```

## What the package contains

```
<batch>__<task>/
  harbor-view/tasks/<batch>__<task>/   the TB3 task itself  <- read
  harbor-view/jobs/                    raw pipeline output   (noise)
  review-session/<batch>__<task>.json  verdicts + marks      <- read
  run/, reviewer-working-copy/         task snapshots at other stages
<batch>__<task>-trajectories/
  <model>/attempt_NN/
    result.json, config.json
    agent/trajectory.json
    verifier/test-stdout.txt, verifier/reward.txt            <- read
```

Two things in the session JSON must not be conflated:

| Field | Meaning |
| --- | --- |
| `jobsByCommand[cmd].verdicts[]` | what AutoQA concluded, with reasoning and findings |
| `rubric[criterionId]` | what the human reviewer marked (`decision`, `comment`, `autoValue`) |

The 49 verdicts are spread across 16 jobs — `check` alone emits 28, `analyze`
emits 7. Membership is not symmetric: `honest_agent_trial` has a verdict but is
not a reviewable card, and `readme_provides_context` is a card with no verdict.

## Why two passes

The second round is the review: reach an independent verdict on all 49 and then
say whether AutoQA's was right. `dossier` collects the recorded findings and
measured numbers without duplicating the task files.

The audit pass is narrower and complementary. It catches a failure mode the
second round can miss: a verdict that happens to be *correct* while resting on no
evidence at all. Those need contesting on the record even when the conclusion
holds, and the spec explicitly makes that the reviewer's job:

> Contest a failure or passing when the TQA explanation is hallucinated,
> incorrect, unsupported, or stricter than the actual TB3 requirement.

Most of that is mechanical. The audit rules distinguish three kinds of
rationale, which is where nearly all the signal comes from:

- **measured** — `Oracle solve.sh produced reward 1.0`, `Harbor check passed 15
  checks`. Anchored to an outcome. Not flagged.
- **absence-based** — `Not flagged by analyze.` Records that nothing fired,
  which does not distinguish "verified" from "never examined". Flagged.
- **procedural** — `Flagged yellow by analyze — a non-blocking warning.`
  Describes the pipeline's blocking policy, not the task. Flagged, and worse
  when a recorded failure sits behind it.

## Rules

| Rule | What it catches |
| --- | --- |
| `procedural-pass` | passes on blocking policy rather than evidence |
| `absence-based-pass` | passes only because nothing flagged it |
| `thin-pass` | one-line rationale, no findings, nothing measured |
| `autogen-verdict` | `provenance=autogen`, no dedicated analysis |
| `nonpassing-verdict-undecided` | a MOD/LOW/FAIL label with no mark yet |
| `analyze-contradiction` | criterion reads PASS while `analyze` counted a failure |
| `analyze-model-contradiction` | same, for a specific model's trial |
| `incomplete-model-analysis` | `analyze` covered fewer models than it ran |
| `high-solve-rate` | strong agents solve it reliably, so it is not model-breaking |
| `frontier-gate-self-contradiction` | gate passes while stating the task was solved |
| `measured-near-miss` | failing trials missed by a tiny numeric margin |
| `identical-failure-across-trials` | independent trials fail the same way, implying a systematic cause |
| `no-autoqa-verdict` | reviewable card with nothing pre-assessing it |
| `accepted-nonpass-without-comment` | non-passing label accepted with no reason recorded |
| `marked-while-pending` | marked before AutoQA finished |

Every flag is a claim about the *evidence*, never a verdict on the task. A flag
means "look here and you probably have grounds to contest", not "this is broken".

## Layout

```
src/
  rubrics/rubrics.ts   the 49 rubrics, real portal criterion ids
  package/load.ts      locates the parts of a download
  package/session.ts   parses verdicts and reviewer marks
  package/trials.ts    indexes per-trial output, reads lazily
  package/taskfiles.ts loads the shipped task as a searchable corpus
  second/evidence.ts   what each criterion needs, and how to decide it
  second/timing.ts     measured durations against configured budgets
  second/dossier.ts    renders the second-round evidence dossier
  second/run.ts        orchestration for `dossier`
  audit/rules.ts       evidence-support rules
  audit/nearmiss.ts    measures how close failing trials came
  audit/claims.ts      verifies concrete claims against the task corpus
  report/markdown.ts   renders the audit draft
  analyze/run.ts       orchestration for `analyze`
```

Trajectories are hundreds of KB each and are only read when a rubric needs them.
