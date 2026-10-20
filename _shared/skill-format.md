# Skill format (every skill in every template)

Grok Bot recommends that a skill cover six things: when to use it, the inputs and access it needs, the steps, how to check the result, what to return, and what needs approval. Every `SKILL.md` in this repo uses exactly those sections, plus a section for what to do when nothing is found or a step fails. The format is plain markdown with `name` and `description` frontmatter, the same layout Grok Bot uses for skills it saves to `/home/box/agent-data/workflows/<name>/SKILL.md`.

```markdown
---
name: <kebab-case, unique across the repo, prefixed by template: ai-influencer-find-clips>
description: <one line: what it does and when the Bot should pick it>
---

# <Title>

## When to use
<trigger phrases, the routine that calls it, and when NOT to use it>

## Inputs and access
<files in /workspace it reads, plugins (by name, never by id), secrets (by env var name), tools from the kit>

## Steps
1. <numbered, concrete, with exact commands or plugin actions>

## Check the result
<measurable checks before anything is shown to the user>

## Return
<exactly what the user sees: files sent with the file card, a short message, a table>

## Needs approval
<every send, publish, purchase, paid generation, checkout link, refund, deletion>

## If nothing is found or a step fails
<"Nothing new today" message format; which step to retry; never invent a result>
```

## Rules

- Skills refer to files by their absolute path under `/workspace/grokbot-templates/` (the kit) or `/workspace/<template>/` (the user's state). Nothing outside `/workspace` is durable.
- A skill that spends money or uses a paid model says how much it expects to spend **before** asking for approval.
- A skill that writes state writes it to the files in `_shared/state.md`, never to memory. Memory holds preferences only.
- Keep skills short enough to read in one pass. Long reference material lives in `references/` and the skill says which file to read for which step.
- No creator names, account IDs, connector IDs, URLs from someone's own setup, or secret values anywhere. The template must work on a stranger's account.
