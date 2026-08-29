# Harbor source snapshots

Verbatim copies of the load-bearing Harbor / TB3 docs, pinned so a reviewer can read the
exact rules offline (the review tool has no network). Fetched **2026-08-29** from
`https://github.com/harbor-framework/terminal-bench` (`main`).

| File | Upstream path | What it is |
| --- | --- | --- |
| `task-implementation.toml` | `docs/prompts/task-implementation.toml` | The 35 implementation criteria the autoreview grades against — **source of truth for rubric bars**. Read the full `guidance` before failing a criterion. |
| `trial-analysis.toml` | `docs/prompts/trial-analysis.toml` | The 6 `harbor analyze` checks on `/run`/`/cheat` trials. |
| `REVIEWING.md` | `docs/REVIEWING.md` | Human reviewer guide, review order, senior reviewers. |
| `TASK_REVIEW_AUTOMATION.md` | `docs/TASK_REVIEW_AUTOMATION.md` | Every static CI check, command semantics, trial pipeline. |
| `TAXONOMY.md` | `docs/TAXONOMY.md` | The seven domains and their subdomains. |
| `task-template.toml` | `docs/task-template.toml` | Blank `task.toml` with defaults and comments. |
| `hack-trial-prompt.md` | `docs/prompts/hack-trial-prompt.md` | The adversarial prompt `/cheat` prepends. |

These are snapshots and can drift. `../tb3-harbor-reference.md` distills them into
reviewer-facing form; re-fetch and diff if a task references newer criteria or checks.
