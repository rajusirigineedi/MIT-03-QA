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
- Each explanation must make sense without reading its `Evidence` or `Criteria
  trace`. Start with the task behavior being judged. Explain the cause and the
  result in normal words. Use counts and rewards only after naming what caused
  them.
- Keep `Evidence` separate as proof, but repeat the key value, assertion, or
  short code behavior in the explanation when the reader needs it to understand
  the causal chain. Evidence must not supply context that the explanation left
  out.
- Put a `Criteria trace` immediately below the evidence for every material
  finding. Name the exact source `[[criteria]]`, quote the smallest controlling
  clause from its `text` or `guidance`, and explain how the evidence meets or
  breaks that clause.
- If no exact Harbor criterion exists, write `No exact Harbor criterion entry`
  and use the exact controlling text from the matching GOLDEN rubric. Never
  invent a source criterion name.
- Do not use vague claims such as "tests are weak" or "instruction has one
  expectation but tests follow another." Name what is weak or different and
  show how it changes a result.
- Do not leave review shorthand unexplained. Phrases such as "same crash",
  "0/16", "old fallback", "selected defect", "verifier setup", "false
  negative", and "unrelated to the intended challenge" are incomplete unless
  the same paragraph names the actual code behavior, task requirement, concrete
  result, and rubric effect.
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

Evidence:

<Give the exact instruction, named test or assertion, concrete values, trial
result, or useful code snippet for the reservation.>

Criteria trace:

Source criterion: <exact [[criteria]] name, or No exact Harbor criterion entry>

Controlling text: "<smallest exact clause from text, guidance, or GOLDEN rubric>"

Application: <Explain how the evidence meets or breaks that clause and why the
reservation is non-blocking.>

<Repeat the finding, Evidence, and Criteria trace as one unit for every other
material reservation.>

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

Evidence:

<Give the exact instruction, named test or assertion, concrete values, trial
result, or useful code snippet that proves the finding.>

Criteria trace:

Source criterion: <exact [[criteria]] name, or No exact Harbor criterion entry>

Controlling text: "<smallest exact clause from text, guidance, or GOLDEN rubric>"

Application: <Explain how the evidence meets or breaks that clause and why it
produces this PASS or FAIL decision.>

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
