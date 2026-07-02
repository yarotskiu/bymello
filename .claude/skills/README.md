# Project skills

Project-scoped Claude Code skills for the Bymello theme live here, one folder
per skill:

```
.claude/skills/
  <skill-name>/
    SKILL.md        # frontmatter (name, description) + instructions
```

Skills added here are available when working inside this project. Good
candidates: a "new-section" scaffolder, a "theme-deploy" checklist, a
"liquid-lint" routine.

Defined so far:
- `pull-live-theme-changes` — pull Theme Editor edits from the live theme
  into git on a clean branch, for review before committing.
- `finish-task` — runs automatically on task approval: commit, sync main,
  gate on live-theme drift, merge, push to git, publish to the live Shopify
  theme, delete the task branch.
