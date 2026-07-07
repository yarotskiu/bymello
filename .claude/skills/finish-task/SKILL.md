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

   If any currently-modified files contain content that came from the
   Shopify Theme Editor rather than from your own edits this task (e.g.
   pulled in via `shopify theme pull` or the `pull-live-theme-changes`
   skill), commit those **separately first**, before the task's own code
   changes:
   ```bash
   git add theme/config/settings_data.json theme/templates/product.json   # whichever files had merchant-driven content
   git commit -m "Pull editor changes: <short summary of what the merchant changed>"
   ```
   Then commit the task's actual code changes on top, as their own commit:
   ```bash
   git add <specific files>   # never -A; stage only what's part of this task
   git commit -m "..."
   ```
   Keeping these separate means the history shows, at a glance, what was a
   deliberate code change for this task versus merchant-driven content that
   happened to land in the same working tree — and makes either one easy to
   revert on its own if it turns out to be wrong (see incident below).

2. **Sync main:**
   ```bash
   git checkout main && git pull
   ```

3. **Gate on live-theme drift** (from `main`, before merging anything in):
   ```bash
   ./scripts/check-live-drift.sh --gate
   ```
   This pulls the live theme and checks it against git. **Every** file is in
   scope, with no exceptions — `config/settings_data.json`, `templates/*.json`,
   and `sections/*-group.json` included, since all of them get pushed live in
   step 6. Any drift there would otherwise be silently overwritten.

   - **Exit 0:** no drift. Continue to step 4.
   - **Exit 1:** live has changes not yet in git. **Stop here.** Do not
     commit further, merge, or push anything. Tell the user plainly that the
     live theme has diverged, list the specific files from the "BLOCKING
     drift" section, and ask what they want to do — e.g. run the
     `pull-live-theme-changes` skill first to bring those changes into git
     (in their own commit, reviewed separately, per step 1), or investigate
     further. Only resume this flow once they've told you how to proceed and
     the gate is clean.

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
   No files are excluded — the push carries everything in `theme/`,
   including `config/settings_data.json`, `templates/*.json`, and
   `sections/*-group.json`. That's why the gate in step 3 matters: it's the
   only thing standing between an unreviewed live edit and having it
   clobbered by this push.

7. **Clean up the task branch:**
   ```bash
   git branch -d <task-branch>
   git push origin --delete <task-branch>   # only if it was ever pushed
   ```

8. **Report back**: confirm the commit, that main is pushed, and that the
   live theme push succeeded (share the editor/preview links the CLI
   prints).

## Why these files are pushed live, and why drift blocks instead

`config/settings_data.json`, `templates/*.json`, and `sections/*-group.json`
carry real task work too — e.g. a template's section settings, block order,
or copy can be exactly what a task is meant to ship (icon assignments,
banner copy, spacing). Excluding them from the live push would silently
drop that work from production even after it's approved and merged.

They're also where a merchant's direct Theme Editor edits land. Since both
kinds of change share the same files, the split has to happen at the git
level, not by ignoring whole files at push time:

- Task work goes in via normal code edits, on the task branch, reviewed like
  anything else.
- Merchant edits get pulled in deliberately (`shopify theme pull` or
  `pull-live-theme-changes`) and committed **on their own**, per step 1 —
  never mixed into the same commit as task code.
- The drift gate in step 3 is what actually prevents an unreviewed live
  edit from being overwritten: if live has diverged from git in *any* file,
  the gate stops the pipeline instead of letting the push silently clobber
  it.

If a drift-derived commit later turns out to have been wrong (e.g. sections
got disabled unintentionally, or a setting was toggled by mistake), revert
the specific changes in that commit — not the whole file, and not the task
commit sitting next to it — then run this pipeline again.

## Why the gate runs before merging, not after committing

Committing is local and cheap to walk back; merging into `main` and pushing
are not (pushing to the live store especially). The gate runs right after
syncing `main` and before touching it further, so if it fails, the approved
work is already safely committed on the task branch and nothing shared has
been touched — no merge, no git push, no live push. Resuming later is just
re-running from step 3.
