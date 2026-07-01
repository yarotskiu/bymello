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

## Git note

Push over **HTTPS**, not SSH (the SSH key on this machine maps to a different
GitHub account):

```bash
gh auth setup-git
git remote -v   # origin should be https://github.com/yarotskiu/bymello.git
```
