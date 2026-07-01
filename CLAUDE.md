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
3. **Wait for approval before committing.** When the work is functionally done, tell the user it's ready and let them review the code themselves (e.g. in their IDE) before anything is committed. Claude MUST NOT run `git commit` until the user explicitly approves. That approval covers commit, merge, and push together — no separate confirmation is needed for push. This applies to every file with no exceptions, including this CLAUDE.md file and any other config/docs Claude edits.
4. **On approval, sync main, then commit → merge → push in one go:**
   ```bash
   git commit -m "..."
   git checkout main && git pull                      # pick up any changes landed on main meanwhile
   git merge --no-ff <short-task-name>                 # resolve conflicts if `pull` brought in anything overlapping
   git push origin main
   ```
   Completed work must always land on `main` — never leave it stranded on a feature branch.

`main` is the source of truth. Publishing to the **live Shopify store** is a separate step that happens only on the user's explicit approval.

### Before publishing to live: check for editor drift

The Theme Editor can change files directly on the live theme (content, settings, even code via "Edit code") without ever touching git. Before pushing to live, run `scripts/check-live-drift.sh` (see [SETUP.md](SETUP.md)) to compare live against git and catch anything that would otherwise be silently overwritten. `config/settings_data.json`, `templates/*.json`, and `sections/*-group.json` are treated as editor-owned content and are excluded from routine live pushes (see `theme/shopify.theme.toml`).

## Code style

**Comments are forbidden by default.** Code must explain itself through clear naming and structure. Write a comment in exactly one case: the logic is genuinely tricky or atypical and cannot be made obvious by the code alone (e.g. a non-obvious browser quirk, a workaround, a deliberate deviation from the expected approach). In that case the comment explains *why*, not *what*. Do not add comments that restate what the code does, label sections, or describe obvious behaviour.

## Setup
See [SETUP.md](SETUP.md) for installing the Shopify CLI, logging in, and pulling the theme.
