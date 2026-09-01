# Submit-ready final review format

Read this file before writing the final user-facing review. The final response
is the review the user can paste into the portal. Do not replace it with an
internal rubric ledger, a list of file paths, or a note saying that a template
is needed.

Use the exact task evidence, real test names, trial IDs, counts, and verdicts.
Remove every placeholder before delivery. Keep only sections that help explain
the decision.

## Shared rules

- Start with `Review:`.
- Write `TQA Status`, `Reviewer Agent Status`, `My Analysis`, and `Final
  Verdict` in that order.
- State the TQA result, coverage mark when present, solve counts by model,
  oracle/no-op/cheat rewards, and any API, timeout, or infrastructure failures.
- State the Reviewer Agent verdict and whether its main reasoning is supported.
- In `My Analysis`, describe the actual task before discussing defects or trial
  outcomes.
- Use real test function or class names. Never call tests A, B, C, D, use their
  position, or give them made-up numbers.
- Use trial IDs or model and attempt identifiers only for trials. Do not confuse
  a trial label with a test name.
- If code proves a finding, include the smallest useful snippet. Name its file
  and function or test. Do not cite line numbers or line ranges instead of
  showing the code.
- Every defect explanation must state the instruction rule, the exact verifier
  or implementation behavior, a concrete case, and the effect on correctness,
  fairness, coverage, or trial results.
- Do not use vague claims such as "tests are weak" or "instruction has one
  expectation but tests follow another." Name what is weak or different and
  show how it changes a result.
- End a REJECT review with a concrete `Fix:` paragraph. A SHIP review may state
  reservations in the final verdict when real non-blocking concerns remain.

## Accepted task

```markdown
Review:

TQA Status: <State whether TQA completed, its task result and coverage rating,
model solve counts, oracle/no-op/cheat rewards, and infra status. Briefly say
whether the important TQA findings are supported.>

Reviewer Agent Status: <State Ship, Ship with reservations, Fix-then-ship, or
Reject. Explain whether its main conclusion matches the task evidence.>

My Analysis:

<Describe the work required by the instruction in concrete terms.>

<Explain the honest trial results. Name the exact failed trial and its actual
mistake. State whether passing trials used real implementations and whether any
trial exposed a shortcut, false positive, false negative, leak, or infra issue.>

<Describe each real coverage or verifier reservation. Name the actual test or
assertion. Explain the instruction rule, verifier behavior, and a concrete case.
State whether an honest or cheat trial triggered it. Include a short code
snippet when it makes the mismatch easier to understand.>

Final Verdict: Accept

<Explain why the task can ship despite the listed reservations. Tie the
decision to recorded trial outcomes and reproduced verifier behavior.>
```

Do not fail an accepted task merely because a possible edge case exists. Say
why the concern is non-blocking, for example because no recorded honest trial
was rejected and no invalid or cheat solution used it to pass.

## Rejected task

```markdown
Review:

TQA Status: <State whether TQA completed, its task result and coverage rating,
model solve counts, oracle/no-op/cheat rewards, and infra status. Identify the
material TQA findings and whether they are supported.>

Reviewer Agent Status: <State its verdict. Explain what it got right or wrong
and whether its proposed severity is supported.>

My Analysis:

<Describe the task and the main blocker in concrete terms.>

<Full failed rubric title>: FAIL

<Explain the exact defect. Quote the needed instruction text or field. Name the
real test, assertion, function, variable, or output value. Give a concrete input
and expected-versus-actual result. State which trials were affected and whether
the failure was clean, mixed with an agent error, or only manually reproduced.>

<Repeat one section for each material failed rubric. Do not create numbered
rubric headings. Do not repeat the same generic paragraph. Explain how the same
root cause affects that rubric's own decision.>

Final Verdict: REJECT

<Summarize the blockers, trial impact, reproduced false positives or false
negatives, leaks, shortcuts, or specification defects that make the task unsafe
to ship. Address material disagreement with TQA or the Reviewer Agent.>

Fix: <Give the smallest concrete changes needed to make the instruction, agent
files, solution, and verifier agree.>
```

Use only the failed rubric sections needed to support REJECT. The separate
complete rubric ledger may contain all portal marks, but it is not the final
submit-ready review.
