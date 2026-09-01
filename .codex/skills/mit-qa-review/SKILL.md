---
name: mit-qa-review
description: Review or re-review Terminal Bench 3.0 TQA findings against the rubric, task files, tests, Reviewer Agent notes, trial evidence, and team-lead feedback. Use for fresh TB3 reviews, rejected review follow-ups, reviewer questions, portal marks, false-positive or false-negative analysis, and SHIP or REJECT review drafts.
---

# TB3 TQA review

Review TQA fairly. Do not start a new fault hunt.

TQA is already a strong reviewer. Most normal TQA `PASS` findings should stay
valid after a quick evidence check. Spend the deeper review time on TQA
non-passing findings, the Reviewer Agent's real concerns, and the high-impact
rubrics below. Do not turn small style, structure, taxonomy, wording, or format
preferences into failures when the task still meets the real requirement.

The task does not need to be perfect. Judge whether a capable agent can do the
work and whether the verifier grades it fairly. Do not require a level of detail
or polish that the rubric, task contract, or actual test behavior does not need.

For every rubric, first decide what the task evidence supports. Then decide
whether TQA's label and material reasoning are valid. The human portal mark
answers the second question:

- `Is TQA finding valid: YES` means portal `PASS`.
- `Is TQA finding valid: NO` means portal `FAIL`.

A valid TQA `FAIL` still receives portal `PASS`. The task may remain a REJECT.
An invalid TQA `PASS` receives portal `FAIL`. Final SHIP or REJECT depends on the
task evidence, not the number of TQA-validity marks.

Mark TQA invalid only when primary task evidence clearly proves that its label
or main reason is wrong and the mistake matters. Small wording problems, a
different explanation, or an edge case that never appears in the task or trials
are not enough.

## Main review focus

Give extra attention to these rubric names and portal ids:

- Core Challenge is the Actual Problem (`core_challenge_is_problem`)
- Tests Align with the Instruction (`tests_align_instruction`)
- Instruction Quality (`instruction_quality`)
- Test Coverage (`test_coverage`)
- Reward File Written Correctly (`reward_file_correct`)
- No False Negatives (`no_false_negatives`)
- No False Positives (`no_false_positives`)
- Task Specification (`task_specification`)
- Difficulty Crux (`difficulty_crux`)
- Near Misses (`near_misses`) and Non-Clerical Difficulty (`non_clericalness`)

Check a possible false positive or false negative using the task contract, the
exact test or assertion, and the observed trajectory together. The test alone
does not decide it.

## Required procedure

Read these two files completely before reviewing a task:

1. [GOLDEN_DOC-Task Review Process.md](references/GOLDEN_DOC-Task%20Review%20Process.md)
2. [review-workflow.md](references/review-workflow.md)

The GOLDEN document is the main review source. Do not change its content. The
workflow is only a helper for applying it.

Use these only when needed:

- Read [tb3-harbor-reference.md](references/tb3-harbor-reference.md) when the
  GOLDEN document does not answer an exact Harbor rule, static check, schema
  field, or command result.
- Read
  [task-implementation.toml](references/harbor-sources/task-implementation.toml)
  only when the GOLDEN document and the short Harbor reference still do not
  settle the exact rule.
- Read [code-review/README.md](../../../code-review/README.md) only for commands
  and generated file locations.

## Names used in the review

- Name a rubric with its full title and portal id. Do not call it `#1`, `#39`,
  "rubric 14", or another generated list number. Those numbers only show order.
- Name a test with its real function, class, assertion, or checked behavior. Do
  not invent labels such as test A, B, C, D, or E.
- A script-generated heading or order number is not task evidence and has no
  meaning in the final decision.

## Writing style

Use the English a 15-year-old would use in a normal chat. Short words. Straight
to the point. Sentence fragments are fine when the idea is clear. Grammar and
perfect sentence endings do not matter. This is not a formal review.

Avoid big or rare words when a daily word works. Keep technical names only when
they are needed to identify code, a test, or a rule. Do not make the writing
sound polished, legal, academic, or like a fixed template.

## Non-negotiable boundaries

- Prepare evidence once with `cd code-review && npm run prepare-review -- <input>`.
- After preparation, review only the selected task files under `code-review/out`.
- Do not submit, mark, or write to the portal. The user enters marks manually.
- Do not treat TQA or the Reviewer Agent as ground truth. Verify claims against
  the instruction, task files, tests, oracle and control results, and selected
  trials.
- Do not infer what an agent did when the prepared evidence does not show it.
- Save the complete review and the second-pass review under
  `code-review/out` as described in the workflow.

Write plain Markdown. Use the user's SHIP or REJECT template when supplied. Do
not invent a replacement template.
