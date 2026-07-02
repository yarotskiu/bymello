---
name: pull-live-theme-changes
description: Pull edits made directly on the live Shopify theme (via the Theme Editor) into git. Use when the user wants to sync live-theme drift into the repo, or asks to "pull live changes", "sync the theme editor changes", "check for drift and pull it in".
---

# Pull live theme changes into git

The Shopify Theme Editor can change theme files directly on the live theme
(settings, templates, even code via "Edit code") without ever touching git.
This skill brings those changes into the repo on a clean branch so they can
be reviewed and committed normally.

## Hard rule: only run this on a clean working tree

Before doing anything else, run:

```bash
git status --porcelain
```

**If this prints anything at all, stop.** Do not proceed, do not stash, do
not discard. Tell the user explicitly:

> Your local repository has uncommitted changes. Please commit or discard
> them first, then re-run this.

Only continue once `git status --porcelain` is empty. This rule has no
exceptions — pulling live content on top of a dirty tree makes it impossible
to tell which changes came from where.

## Steps

1. **Confirm clean tree** (above). Stop and ask if not clean.

2. **Sync main and branch off it:**
   ```bash
   git checkout main && git pull
   git checkout -b sync-live-theme-<short-description>
   ```
   Never pull live changes directly onto `main` or onto an existing task
   branch that has unrelated work in flight.

3. **Pull and apply live drift:**
   ```bash
   ./scripts/check-live-drift.sh --apply
   ```
   This pulls the live theme into a scratch dir, diffs it against `theme/`,
   and copies over any file with real content differences (plus any file
   that exists on live but not in git). Line-ending-only differences are
   ignored. Files that exist in git but not on live (e.g.
   `theme/shopify.theme.toml`, which is local tooling config, not theme
   content) are never touched or deleted.

4. **Describe the changes before committing.** Run `git diff` (or `git
   diff --stat` first for an overview) over the applied files and summarize
   in plain language what changed — e.g. "badge_names setting changed from
   X to Y", "a new app block was installed", "product template thumbnail
   position changed from left to bottom". Don't just paste the raw diff;
   explain what it means for the storefront. If a file has no meaningful
   diff (e.g. only key reordering with no value changes), say so.

5. **Do not commit.** Per this repo's golden workflow
   ([CLAUDE.md](../../CLAUDE.md)), work stops here until the user reviews
   the changes and explicitly approves. Once approved, follow the normal
   commit → sync main → merge → push → delete branch flow already defined
   in CLAUDE.md — this skill does not shortcut that.

## Notes

- This is the mirror-image of the "check for editor drift" step that
  already exists before publishing to live — that one is read-only
  (`check-live-drift.sh` with no flags); this skill uses the same script
  with `--apply` to actually bring the live-only changes in.
- `config/settings_data.json`, `templates/*.json`, and `sections/*-group.json`
  are the files most likely to drift, since they're editor-owned content.
  Finding changes there is expected, not a bug.
