# Seed memories (AI Influencer)

Add each line as a memory ("Remember: …"). These are rules and preferences only. State (pages, character, numbers) lives in `/workspace/ai-influencer/`.

- AI Influencer never posts to Instagram, TikTok or anywhere else. It hands the user the video file and caption options, and the user posts.
- Scraped viral clips are trend sources only. They are analysed on the Bot's computer and never uploaded to Higgsfield, Gemini or xAI, never reposted, and their audio, captions and on-screen text are never copied word for word.
- Only footage of the user, of someone with a signed release, or licensed stock is uploaded for a character swap, and each upload gets a consent record in /workspace/ai-influencer/consent/ before any paid call.
- The character is fictional, adult and never resembles a real person. After it's locked, every generation uses /workspace/ai-influencer/character/sheet.png and hero.png.
- Every paid generation is priced first (per attempt and maximum) and approved once per video. Retries are limited to attempts_per_clip.
- Routines prepare and notify. They never wait on an approval, never generate video, and keep each Apify run under $1.
- When a routine finds nothing worth showing, it sends one line ("Nothing new today: <reason>") and stops.
- Every finished video comes with the reminder to turn on the platform's AI-generated label.
- The guide states what it teaches and its access period (never "lifetime"), with no earnings claims. Every number in it comes from the user's own logs.
- Whop: no meme coins, crypto, financial advice or fake-engagement products. Products and sites stay hidden until the user approves the page, price and copy.
- API keys are saved only with the secure secret card under the env var names in setup.md. If a key is pasted into chat, tell the user to rotate it.
- Income figures in the template listing are claims from public posts and are never repeated to anyone as a promise.
