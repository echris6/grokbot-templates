# Publishing the templates to Grok Bot

The repo is public at `https://github.com/echris6/grokbot-templates`, tagged `v1.0.0`. Grok Bot template links can only be created from your own Grok Bot account. The fastest way is to have one Bot build the others.

## 1. Let a Bot build the template Bots (about 10 minutes)

Open any Grok Bot chat (a new "Builder" Bot is fine) and send this message:

```
Clone https://github.com/echris6/grokbot-templates at tag v1.0.0 into /workspace/grokbot-templates
(git clone --depth 1 --branch v1.0.0 ...). Then, for each folder in this order — launchpad, ai-influencer,
motion-studio, spatial-studio — create a new Bot (a helper Bot of yours is fine) and set it up EXACTLY from the files:
1. Name: the H1 title of <folder>/TEMPLATE.md (e.g. "AI Influencer").
2. Profile / instructions: the fenced block in <folder>/profile.md, verbatim.
3. Memories: tell the new Bot to remember each bullet in <folder>/memories.md, one by one.
4. Skills: for every <folder>/skills/<name>/SKILL.md, have the new Bot save it as a skill using the file's
   frontmatter name and the full file text. Then list the new Bot's skills and confirm every one is there.
5. Routines: create each routine in <folder>/routines.md on the new Bot, PAUSED. Do not enable any.
6. Do not run setup, connect accounts, save secrets or spend anything. Do not publish or share anything.
When done, give me a table: Bot, skills saved (n/expected), routines created paused (n/expected), problems.
```

The `critic-profile.md` files are not separate templates. Each template's `setup` skill creates its critic Bot on the user's own account.

## 2. Check each Bot, then publish it

For each of the four Bots:
1. Open it and type `/`. Every skill listed in its `skills/` folder should be there.
2. Open **View conversation details → Routines**. Every routine should be there and paused.
3. **Connect apps:** connect the plugins listed in `<folder>/setup.md` (Whop, Apify), so the template declares them.
4. **Share → Create template → View template details.** Check:
   - no secrets, personal memories, IDs or URLs from your own account
   - skills and routines are included
5. Choose **Public link**, **Publish** and **Copy link**.
6. Paste the link into `launchpad/references/catalog.md` (the `<link>` cells) and into the README table, then commit and push. Users get the new links when they update to the next tag.

## 3. Test as a user

Open each link in a second account, choose **Add to Grok Bot**, and say "set me up". Setup should:
- clone the kit at `v1.0.0`
- rebuild any skills or routines that didn't come through on import
- run the interview

## Updating later

1. Change the files.
2. Tag a new release (`v1.0.1`).
3. Bump `KIT_REF` in every `setup.md` and setup skill.
4. Use **Update template** on each Bot.

Existing users stay on their pinned tag until they change it.
