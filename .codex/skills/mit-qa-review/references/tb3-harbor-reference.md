# TB3 and Harbor reference

Use this file only when `GOLDEN_DOC-Task Review Process.md` does not answer an
exact Harbor question. It is not a review procedure and it does not override
the GOLDEN document.

Sources were fetched from Harbor on 2026-08-29:

- Exact implementation and trial wording: `harbor-sources/task-implementation.toml`
- Task configuration example: `templates/task-template.toml`

Read the TOML only when this short file still leaves the exact rule unclear.

## Task shape and visibility

```text
tasks/<task-name>/
  instruction.md
  task.toml
  README.md                 optional, reviewer-facing
  environment/Dockerfile
  solution/solve.sh
  tests/Dockerfile
  tests/test.sh
  cheat/                    optional adversarial solution
```

Harbor mounts `solution/` at `/solution/` for the oracle. In separate verifier
mode, the agent cannot read `/tests/` or `/solution/`. The verifier starts after
the agent container stops and receives only declared artifacts, files baked into
its own image, and declared persistent sidecars.

Build the agent-visible inventory from `environment/Dockerfile` and setup scripts.
Trace every `COPY`, `ADD`, generated file, and deletion. A verifier rule found
only in tests or a file removed before agent start is not agent-visible.

`README.md` is not shown to the agent. Human explanations may live in README
sections or the corresponding `task.toml` metadata fields. Read whichever form
the task uses.

## `task.toml` facts

`artifacts` is a top-level list and must appear before the first TOML section.
Each artifact is an absolute path or a table with `source`, `destination`,
`exclude`, and `service`.

Recognized sections are `task`, `metadata`, `verifier`, `agent`, `environment`,
`solution`, and `source`. Common fields are:

- `metadata`: author fields, three explanation fields, category, subcategory,
  tags, expert estimate, relevant experience, referral.
- `verifier`: timeout, user, environment mode, environment limits, collection
  hooks.
- `agent`: timeout and user.
- `environment`: build timeout, image, CPU, memory, storage, GPU, environment,
  skills, MCP servers, and health check.
- `solution`: environment variables.

Use `templates/task-template.toml` for the source example. Agent and verifier
timeouts cannot exceed 28,800 seconds. `gpus` cannot exceed 1. Omit
`allow_internet`; current static checks reject both explicit true and false.

Schema or field-name drift alone is a relaxed review issue. Fail the portal
rubric only when the content or behavior is actually wrong.

## Harbor rubric sources

`harbor-sources/task-implementation.toml` contains the exact guidance for:

- six trial checks: `task_specification`, `reward_hacking`, `difficulty_crux`,
  `near_miss`, `refusals`, and `low_timeout`;
- 35 implementation criteria used by Harbor autoreview.

Do not maintain a second prose copy of those 41 definitions. Read the named TOML
criterion when its exact PASS, FAIL, or NOT_APPLICABLE boundary matters.

Five newer implementation criteria do not have a one-to-one portal card:

- `artifact_efficiency` may affect Separate Verifier Container
  (`separate_verifier_container`), No Extraneous Files (`no_extraneous_files`),
  Reward File Written Correctly (`reward_file_correct`), Docker / Environment
  Hygiene (`docker_environment_hygiene`), and No False Positives
  (`no_false_positives`).
- `verifier_execution_isolation` may affect Verifier Resists Adversarial Agent
  (`anti_cheat_robustness`) and Reward Hacking (`reward_hacking`).
- `ctrf_reporting` may affect Reviewable by Non-specialists
  (`reviewable_by_non_specialists`) and Reward File Written Correctly
  (`reward_file_correct`).
- `do_not_modify_enforced` may affect Tests Align with the Instruction
  (`tests_align_instruction`) and No False Positives (`no_false_positives`).
- `binary_reward` may affect Reward File Written Correctly
  (`reward_file_correct`) and Reward Hacking (`reward_hacking`).

## Static checks

| Check | Enforced rule |
| --- | --- |
| `check-dockerfile-references` | Dockerfiles do not copy solution or test entrypoints into the agent image. |
| `check-test-file-references` | Output files shared by tests and solution are named in the instruction or task config. |
| `check-separate-verifier` | Separate mode, artifacts, verifier Dockerfile, `/tests` copy, and artifact parent creation are present. |
| `check-trial-network-fetch` | Verifier runtime does not fetch external resources. |
| `check-verifier-tooling-baked` | Pytest tooling is installed in the verifier image, not during verification. |
| `check-nproc` | Scripts do not use bare `nproc`. |
| `check-compose-host-binds` | Compose uses named volumes, not host bind mounts. |

Execution gates also require the environment image to build, the oracle to score
1, and the no-op solution to fail.

### Relaxed portal checks

The following issues do not justify a portal FAIL by themselves:

- missing or different instruction trailer;
- metadata field-name drift, extra fields, or missing `[task]` table;
- missing README or README sections;
- missing `terminal-bench/` package prefix;
- older pytest, CTRF, or canary versions;
- missing verifier `USER` drop without a demonstrated reward-forging path;
- missing artifact-parent `mkdir -p` when separate mode is otherwise configured.

Record the issue if useful. Fail only when the underlying task behavior, safety,
grading, or metadata meaning is wrong. For uncertain artifact upload behavior,
use an uncertain note rather than manufacturing a blocker.

## Result semantics

- Oracle reward must be 1. A failing oracle blocks the task.
- A no-op solution must fail. A passing no-op shows weak verification.
- TQA PASS, FAIL, HIGH, LOW, or MOD is a finding to validate, not the human
  portal answer.
- NOT_APPLICABLE or an intentionally unevaluated trial rubric is not a failure.
- A cheat trial reward of 1 may be a legitimate solve. Use the reward-hacking
  analysis and primary evidence before calling it a bypass.
- Infrastructure errors do not establish task difficulty or agent fault.
