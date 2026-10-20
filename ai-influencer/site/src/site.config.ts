// Everything the landing page says lives here. The launch-guide skill fills it in from
// /workspace/ai-influencer/config.json and the guide outline, then shows it to the user
// before any deploy. Never put view counts, follower counts, earnings or testimonials here
// unless they are the account's own, current, checkable numbers (Whop requires earnings
// claims to be substantiated; this page makes none).

export type Faq = { q: string; a: string };

export type SiteConfig = {
  characterName: string;
  handle: string; // e.g. "@yourcharacter" on the user's own account, or "" to hide
  guideTitle: string;
  headline: string;
  subhead: string;
  heroImage: string; // file in the scaffold's public/ folder, e.g. "/hero.jpg"
  heroAlt: string;
  learn: string[]; // what the guide teaches, one line each
  inside: string[]; // what the buyer gets (format, pages, files)
  priceLabel: string; // e.g. "$29"
  accessPeriod: string; // e.g. "12 months of access, including updates". Never "lifetime".
  purchaseUrl: string; // the checkout link's purchase_url from Whop
  buyLabel: string;
  faq: Faq[];
  disclosure: string;
};

export const site: SiteConfig = {
  characterName: "CHARACTER_NAME",
  handle: "",
  guideTitle: "How CHARACTER_NAME is made",
  headline: "The exact workflow behind CHARACTER_NAME",
  subhead:
    "A step-by-step guide to designing an AI character, turning trends into remakes, and posting every day without burning out.",
  heroImage: "/hero.jpg",
  heroAlt: "CHARACTER_NAME, an AI-generated character, shown from several angles",
  learn: [
    "Designing a character that stays recognisable across every video",
    "Spotting trends worth remaking on the big repost pages in your niche",
    "Filming a single-take clip the AI can swap cleanly",
    "Swapping the character in and checking the result before you post",
    "Writing captions and labelling AI content the way the platforms ask",
  ],
  inside: ["PDF guide (PAGE_COUNT pages)", "Prompt templates", "A daily checklist"],
  priceLabel: "$PRICE",
  accessPeriod: "12 months of access, including updates",
  purchaseUrl: "PURCHASE_URL",
  buyLabel: "Get the guide",
  faq: [
    {
      q: "Is CHARACTER_NAME a real person?",
      a: "No. CHARACTER_NAME is an AI-generated character. Every video is labelled as AI content.",
    },
    {
      q: "Will this make me money?",
      a: "This guide teaches a production method. It makes no promise about followers or income; results depend on your niche, consistency and taste.",
    },
    {
      q: "How do I get the guide after buying?",
      a: "Checkout runs on Whop. The PDF appears in your Whop account right after purchase.",
    },
  ],
  disclosure:
    "CHARACTER_NAME is a fictional, AI-generated character. Not affiliated with Instagram, TikTok or any page whose trends are discussed.",
};
