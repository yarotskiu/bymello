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
2. **Work on the task branch.** Never edit the live theme directly. Preview with `shopify theme dev` against an unpublished copy. The live store is never the workspace.
3. **End by merging into main.** When the work is done, commit it and merge the branch back into `main` locally — completed work must always land on `main`. Never leave finished work stranded on a feature branch.
   ```bash
   git checkout main && git merge --no-ff <short-task-name>
   ```
4. **Notify on completion → push.** When the user says a task is complete, Claude MUST explicitly tell the user that the changes are merged into `main` locally and **need to be pushed to GitHub**, and confirm before pushing:
   ```bash
   git push origin main
   ```

`main` is the source of truth. Publishing to the **live Shopify store** is a separate step that happens only on the user's explicit approval.

## Setup
See [SETUP.md](SETUP.md) for installing the Shopify CLI, logging in, and pulling the theme.
