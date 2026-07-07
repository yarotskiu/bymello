# Bymello — Shopify theme development

Project instructions for Claude Code. Read this before working.

## What this is
- Shopify store **Bymello** (storefront: bymello.eu). Store handle: `bymello-store.myshopify.com`.
- We modify the **Ovelia** theme (`#201621700933`, currently the **live** theme). Theme files live in `theme/`.
- Classic section-based theme (no `blocks/` architecture). The theme is **not** vendor-pristine — a prior developer made edits; the git baseline captures current state.
- Repo: private `yarotskiu/bymello`, default branch **`main`**. Push over **HTTPS** (the SSH key on this machine maps to a different GitHub account).

## 🔑 Golden workflow rule (MANDATORY for every task)

Every task follows this lifecycle, no exceptions:

1. **Start from main.** Before any work:
   ```bash
   git checkout main && git pull
   git checkout -b <short-task-name>
   ```
2. **Work on the task branch.** Never edit the live theme directly. Preview with `shopify theme dev` against an unpublished copy. The live store is never the workspace. Do NOT commit anything yet.
3. **Wait for approval before committing.** When the work is functionally done, tell the user it's ready and let them review the code themselves (e.g. in their IDE) before anything is committed. Claude MUST NOT run `git commit` until the user explicitly approves. This applies to every file with no exceptions, including this CLAUDE.md file and any other config/docs Claude edits.
4. **On approval, run the [`finish-task`](.claude/skills/finish-task/SKILL.md) skill.** Approval covers the whole pipeline, not just the commit: it commits the reviewed changes, syncs `main`, gates on live-theme drift (stopping to ask if the live theme has diverged in a way a routine push would overwrite), merges, pushes to git, publishes to the **live Shopify theme**, and deletes the task branch — all in one flow, no separate confirmation needed for merge, push, or publish. See that skill file for the exact steps.

`main` is the source of truth, and the live Shopify store is kept in sync with it as part of the same approval — publishing is no longer a separate manual step.

### Editor drift

The Theme Editor can change files directly on the live theme (content, settings, even code via "Edit code") without ever touching git. Every file in `theme/` — including `config/settings_data.json`, `templates/*.json`, and `sections/*-group.json` — gets pushed to the live theme, so drift in any of them is treated as blocking, not expected.

The `finish-task` skill gates every publish on this (`scripts/check-live-drift.sh --gate`): if live has diverged from git anywhere, it stops before merging or pushing. To check drift ad hoc, or to pull editor-made changes into git outside of finishing a task, use `scripts/check-live-drift.sh` (see [SETUP.md](SETUP.md)) or the [`pull-live-theme-changes`](.claude/skills/pull-live-theme-changes/SKILL.md) skill — and commit whatever it brings in as its own commit, separate from any task code, per the `finish-task` skill's step 1.

## Code style

**Comments are forbidden by default.** Code must explain itself through clear naming and structure. Write a comment in exactly one case: the logic is genuinely tricky or atypical and cannot be made obvious by the code alone (e.g. a non-obvious browser quirk, a workaround, a deliberate deviation from the expected approach). In that case the comment explains *why*, not *what*. Do not add comments that restate what the code does, label sections, or describe obvious behaviour.

## Setup
See [SETUP.md](SETUP.md) for installing the Shopify CLI, logging in, and pulling the theme.
