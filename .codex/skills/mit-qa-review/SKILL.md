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

- Read [submission-template.md](references/submission-template.md) before writing
  the final user-facing review. This is the standing submit-ready format for both
  SHIP and REJECT decisions.
- Read [task-implementation.toml](references/harbor-sources/task-implementation.toml)
  only when the GOLDEN document and workflow do not settle an exact Harbor
  criterion, schema field, or command result. Read only the named criterion or
  section needed for the question.
- Read [task-template.toml](references/templates/task-template.toml) only when
  the exact current task configuration shape matters.
- Read [code-review/README.md](../../../code-review/README.md) only for commands
  and generated file locations.

## Names used in the review

- Name a rubric with its full title and portal id. Do not call it `#1`, `#39`,
  "rubric 14", or another generated list number. Those numbers only show order.
- Name a test with its real function, class, assertion, or checked behavior. Do
  not invent labels such as test A, B, C, D, or E.
- Never identify tests by position or number, such as "the first test", "test
  3", or "case 4". Copy the actual test name from the verifier output or source.
  If the check has no test function, name the exact command, assertion, or
  behavior it checks.
- A script-generated heading or order number is not task evidence and has no
  meaning in the final decision.

## Reasoning standard

The reason is the main work product. It must teach the reviewer what is wrong
without making them open the task files.

For every material PASS or FAIL claim, connect these facts in plain English:

1. what the instruction requires, using the actual field, rule, value, or
   example;
2. what the named test, assertion, or implementation actually does;
3. the concrete input and result that shows why they match or conflict;
4. why that behavior matters, including affected trials when trial evidence
   exists.

Do not write empty reasons such as "the instruction and tests do not align",
"coverage is weak", "the schema is unclear", or "the agent failed the
expectation". State the missing field, unchecked behavior, conflicting value,
or rejected valid output. Explain the causal chain.

Example of the required depth: if the instruction asks for palindromic primes
but `test_verifier` calls `isPalindrome(n)` before checking `isPrime(n)`, say
exactly that. Show that for `7`, the intended order is `isPrime(7)` and then
`isPalindrome(7)`. Explain that the current order calculates palindrome status
for every number even though only prime numbers need that work. Do not reduce
this to "the verifier does not follow the instruction."

When code is useful to prove the point, include the smallest exact snippet in a
fenced code block and explain it. Do not substitute a file line number or line
range for the code. Name the file and stable function, test, variable, or
section, but omit line numbers from reviewer-facing prose. For this skill, this
reviewer-facing rule replaces the GOLDEN document's optional suggestion to add
line references.

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

Write plain Markdown. The final user-facing review must follow
`references/submission-template.md` and be ready to paste into the review
portal. If the user supplies a newer template in the current request, use that
instead.
