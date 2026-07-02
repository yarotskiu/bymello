---
name: finish-task
description: Run automatically whenever the user approves/greenlights finishing the current task (e.g. "approved", "green light", "ship it", "looks good"). Commits the reviewed changes, syncs main, gates on live-theme drift, merges, pushes to git, and publishes to the live Shopify theme.
---

# Finish task

This is what "approval" means in this repo: it's not just permission to
commit — it runs the whole pipeline through to the live Shopify store in one
go. Only trigger this after the user has actually reviewed the diff and
given clear approval (per [CLAUDE.md](../../CLAUDE.md)'s golden workflow).
Never run it speculatively or to "save time" before approval is given.

## Preconditions

- You're on a task branch (not `main`) with uncommitted changes the user has
  just approved.
- If there's nothing uncommitted (e.g. the user is re-approving something
  already committed), skip straight to step 3.

## Steps

1. **Commit the approved changes on the task branch.**
   ```bash
   git add <specific files>   # never -A; stage only what's part of this task
   git commit -m "..."
   ```

2. **Sync main:**
   ```bash
   git checkout main && git pull
   ```

3. **Gate on live-theme drift** (from `main`, before merging anything in):
   ```bash
   ./scripts/check-live-drift.sh --gate
   ```
   This pulls the live theme and checks it against git, but — unlike the
   plain drift check — it ignores drift in the files the live push itself
   never touches (`config/settings_data.json`, `templates/*.json`,
   `sections/*-group.json`). Those differ constantly because merchants edit
   them directly; that's expected, not a problem, and can't be clobbered by
   a routine push.

   - **Exit 0:** no blocking drift. Continue to step 4.
   - **Exit 1:** live has changes to files a routine push *would* overwrite.
     **Stop here.** Do not commit further, merge, or push anything. Tell the
     user plainly that the live theme has diverged, list the specific files
     from the "BLOCKING drift" section, and ask what they want to do — e.g.
     run the `pull-live-theme-changes` skill first to bring those changes
     into git (in their own commit, reviewed separately), or investigate
     further. Only resume this flow once they've told you how to proceed
     and the gate is clean.

4. **Merge into main:**
   ```bash
   git merge --no-ff <task-branch>
   ```

5. **Push to git:**
   ```bash
   git push origin main
   ```

6. **Push to the live Shopify theme:**
   ```bash
   cd theme && shopify theme push --environment live --allow-live
   ```
   The `[environments.live]` block in `theme/shopify.theme.toml` already
   excludes the editor-owned files from this push, so it can't overwrite
   merchant content even though we didn't touch those files ourselves.

7. **Clean up the task branch:**
   ```bash
   git branch -d <task-branch>
   git push origin --delete <task-branch>   # only if it was ever pushed
   ```

8. **Report back**: confirm the commit, that main is pushed, and that the
   live theme push succeeded (share the editor/preview links the CLI
   prints).

## Why the gate runs before merging, not after committing

Committing is local and cheap to walk back; merging into `main` and pushing
are not (pushing to the live store especially). The gate runs right after
syncing `main` and before touching it further, so if it fails, the approved
work is already safely committed on the task branch and nothing shared has
been touched — no merge, no git push, no live push. Resuming later is just
re-running from step 3.
