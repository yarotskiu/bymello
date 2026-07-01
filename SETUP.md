# Setup

Tiny guide to get a machine ready to develop the Bymello (Ovelia) theme.

## 1. Install the Shopify CLI

Requires Node 18+ (`node --version`).

```bash
npm install -g @shopify/cli@latest
shopify version          # confirm it installed
```

## 2. Log in / connect the store

Any store command triggers a browser login the first time. Confirm access:

```bash
shopify theme list --store=bymello-store.myshopify.com
```

A browser window opens — log into the Shopify admin. You should then see the
`Ovelia` (live) and `Horizon` (unpublished) themes listed.

## 3. Pull the theme (first time only)

The theme already lives in `theme/`. To re-pull a fresh copy into it:

```bash
cd theme
shopify theme pull --store=bymello-store.myshopify.com --theme=201621700933
```

## 4. Live preview while developing

```bash
cd theme
shopify theme dev
```

That's enough — the CLI remembers the store from the initial pull/login (config
in `theme/.shopify/`). Opens a local server (http://127.0.0.1:9292) with hot
reload against an unpublished copy. The live store is never affected. Stop with
`Ctrl+C`. (If it ever forgets the store, add `--store=bymello-store.myshopify.com`.)

## 5. Check for live-theme drift before pushing

The Shopify Theme Editor writes changes straight to the live theme — content edits,
color/settings tweaks, even raw code via "Edit code" — completely independent of
git. Before ever pushing to live, check what's actually different:

```bash
./scripts/check-live-drift.sh
```

This pulls the live theme into a scratch temp dir (never touches your working
tree) and diffs it against `theme/`, filtering out line-ending-only noise. It
prints four groups: content that differs, line-ending-only differences (safe),
files only in git, and files only on live. Exit code is non-zero if there's
anything to review.

For anything under "content differs", check `git log -- <path>` for that file:
- If it matches a fix/feature we already have in git but haven't deployed yet,
  that's expected — safe to proceed.
- If it doesn't, someone edited that file directly on the live theme. Pull and
  commit that file into git first (e.g.
  `cd theme && shopify theme pull --live --only=path/to/file`), so it isn't
  lost, before pushing your own changes.

`config/settings_data.json`, `templates/*.json`, and `sections/*-group.json`
(header/footer/features section groups) almost always differ because
merchants/editors change them constantly — that's normal, not a bug. Routine
pushes to live never touch them anyway (see `theme/shopify.theme.toml`'s
`ignore` list for the `live` environment), so editor content is safe by default.

## 6. Push to the live theme (deliberate step only, after explicit approval)

```bash
cd theme
shopify theme push --environment live --allow-live
```

`--allow-live` is Shopify CLI's own safety guard for pushing to a live theme —
never script or alias this away. Only run this after a clean drift check.

## Git note

Push over **HTTPS**, not SSH (the SSH key on this machine maps to a different
GitHub account):

```bash
gh auth setup-git
git remote -v   # origin should be https://github.com/yarotskiu/bymello.git
```
