# code-review

Offline evidence preparation for Terminal Bench 3.0 reviews. The tool never
submits portal marks or a final verdict.

The review procedure lives in
`../.codex/skills/mit-qa-review/references/review-workflow.md`. The same file
contains the Harbor rules needed during review. Exact source criteria live in
`../.codex/skills/mit-qa-review/references/harbor-sources/task-implementation.toml`.

## Setup

```bash
npm install
```

Node 22 or newer is required.

## Commands

```bash
npm run prepare-review -- <package-or-parent>
```

This is the normal entrypoint. It runs:

```bash
npm run tb3 -- dossier <path>
npm run collect-trajectories -- <path>
npm run copy-working-copy -- <path>
```

Other useful commands:

```bash
npm run tb3 -- analyze <path>
npm run tb3 -- rubrics
npm run tb3 -- rubrics --cluster=verifier
npm run typecheck
```

`dossier` writes TQA findings, measured facts, timing, and failure summaries.
If the package contains a prior review and team-lead feedback, it also copies
that Markdown for re-review.
`analyze` flags TQA or Reviewer Agent claims that need human verification. A flag
is a lead, not a task verdict.

## Prepared output

```text
out/
  <task>.tqa-review.md
  <task>.review.md
  <task>.reviewer_agent.md
  <task>.feedback.md                 re-reviews only
  <task>/
    reviewer-working-copy/
    trajectories/<model>/attempt_NN-pass|fail/
      result.json
      verifier/test-stdout.txt
      verifier/reward.txt
```

The trajectory export keeps one passing attempt per model and every failing
attempt. `result.json` contains only selected agent and verifier result fields.
It does not copy the step-by-step trajectory.

After preparation, review only the selected task under `out`. Do not return to
the source package or raw run directories.

## Source layout

```text
src/
  package/     package and session parsing
  export/      working-copy and compact trajectory export
  second/      dossier and timing evidence
  audit/       evidence and claim checks
  report/      audit Markdown
  rubrics/     portal rubric ids and intent
```

Two session fields have different meanings:

- `jobsByCommand[*].verdicts` contains TQA findings.
- `rubric[criterionId]` contains the human response to TQA.

The human response asks whether TQA is valid. Portal `PASS` means yes; portal
`FAIL` means no. It does not restate whether the underlying task rubric passed.
