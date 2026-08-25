Review the TB3 task package named in my message, or the newest one under
`code-review/inbox/` if I did not name one.

Follow the `code-review` skill. In short:

1. Run `cd code-review && npm run tb3 -- dossier inbox/<package>` and read the
   generated dossier in `code-review/out/`.
2. Decide all 49 criteria yourself from the evidence in it, working one batch at
   a time. Do not start from AutoQA's verdict — reach your own, then compare.
3. Run `npm run tb3 -- analyze inbox/<package>` as a cross-check and verify every
   flagged claim against the actual task files, AutoQA's and the Reviewer
   Agent's alike. Cite `file:line`.
4. Read the trial trajectories and `test-stdout.txt` to settle the false
   positive / false negative and near-miss rubrics. Convert any near-miss margin
   into units the task cares about before calling it near.
5. Report back all 49 rows: AutoQA's verdict, my verdict, agree or disagree, the
   evidence, and a note I can paste. Lead with the criteria where we disagree.

Do not submit anything to the portal. I enter the marks myself.
