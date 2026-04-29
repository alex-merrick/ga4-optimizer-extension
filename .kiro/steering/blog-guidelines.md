---
inclusion: manual
---

# GA4 Optimizer: SEO Blog Generation Guidelines

As the Copy Writer for GA4 Optimizer, strictly adhere to the following SEO rules when writing, structuring, and formatting blog posts.

## 1. Meta Data Guidelines

### Title Tags (`title`)
- **Target Length:** 50 to 65 characters for optimal SERP display.
- **Exception:** Up to 80 characters is acceptable if the extra length captures vital long-tail keywords.
- **Front-Loading:** Always place the highest-value exact-match keywords at the very beginning so they are never truncated.
- **No brand suffix in frontmatter:** The `base.njk` layout automatically appends ` | GA4 Optimizer` to every page's `<title>` tag. Never add `| GA4 Optimizer` to the frontmatter `title` field — it will result in a doubled suffix (`| GA4 Optimizer | GA4 Optimizer`) in the browser tab and SERP, and will also appear as clutter in blog listing cards.

### Meta Descriptions (`description`)
- Must be strictly between **140 and 160 characters**.
- Always include the primary keyword, the target year (if applicable), and an active value proposition (e.g., "Learn how to...", "Enhance reporting with...").

## 2. SEO "Do No Harm" Rule

If instructed to update or optimize an existing top-performing blog post, **do not** rewrite the title tag just to make it shorter. Retain existing titles of high-traffic pages to avoid triggering unnecessary algorithmic re-evaluations.

## 3. Frontmatter & Schema Markup

- **Dynamic Dates:** Use programmatic year variables (e.g., `{{ currentYear }}`) in titles and frontmatter to keep content evergreen. Do not hardcode the year.
- **FAQ Schema:** If the post answers common questions, generate valid JSON-LD `FAQPage` schema in the frontmatter. The questions and answers in the schema must 100% match an `## Frequently Asked Questions` H2 section at the bottom of the article.
- **URL field:** Every post must include a `url` field in frontmatter with the full canonical URL (e.g., `url: "https://www.gaoptimizer.com/blog/slug-here/"`).

## 4. URL Slug Formatting

Keep slugs under 5 words, omitting stop words (a, an, the, for, in).

- Bad: `/best-google-analytics-browser-extensions-tools-for-ga4/`
- Good: `/best-ga4-browser-extensions/`

## 5. Content Structure & Headings

### Heading Hierarchy Rules

- **H1:** Only one H1 per page. It is inherited from the `title` frontmatter field — do not add a second H1 in the body.
- **H2:** Major content sections. Every substantial topic shift gets its own H2. Aim for 3–6 H2s per post.
- **H3:** Subsections within an H2. Use for step-by-step breakdowns, individual methods, sub-topics, or FAQ questions.
- **H4 and below:** Avoid entirely in blog posts. If you feel you need an H4, restructure the content instead.
- **Never skip levels:** Do not jump from H2 to H4. The sequence must always be H1 → H2 → H3.

### Required Sections (in order)

Every blog post must follow this structure:

```
H1: [Post Title — from frontmatter]
├── H2: [Overview or intro section — optional but recommended for longer posts]
├── H2: [Main content section]
│   ├── H3: [Subsection or step]
│   └── H3: [Subsection or step]
├── H2: [Additional main section]
│   └── H3: [Subsection]
└── H2: Frequently Asked Questions
    ├── H3: [Question 1 — exact match to faq_schema]
    ├── H3: [Question 2]
    └── H3: [Question 3]
```

### FAQ Section Rules

- The FAQ section **must** use `## Frequently Asked Questions` as the H2 heading — no variations like "FAQ", "Frequently Asked Questions (FAQ)", or bold formatting.
- Each individual question **must** be an H3 heading — not bold text, not `**Q:**` format.
- Answers follow as plain paragraph text directly under the H3.
- The questions and answers must **exactly match** the `faq_schema` in the frontmatter.
- Do **not** use the old `**Q:** ... A: ...` format under any circumstances.

**Correct format:**
```markdown
## Frequently Asked Questions

### Why can't I change the date range on a shared GA4 exploration?

When a user shares a GA4 exploration in read-only mode...

### How do I edit dates on a read-only GA4 report?

You can install the GA4 Optimizer browser extension...
```

**Incorrect format (never use):**
```markdown
## Frequently Asked Questions (FAQ)

**Q: Why can't I change the date range?**
A: When a user shares...
```

### Section Heading Style

- Use **descriptive, keyword-rich H2s** — not generic labels.
  - Bad: `## The Problem` / `## The Solution` / `## The Fix`
  - Good: `## Why GA4 Locks Shared Exploration Dates` / `## How to Fix Sampled Data in GA4`
- For multi-method posts, name methods explicitly:
  - Good: `### Method 1: One-Click Exit Pages Report` / `### Method 2: Enhancing Tooltips in Explorations`
- For step-by-step sections, use a descriptive H3 before the numbered list:
  - Good: `### Step-by-Step Instructions` followed by the numbered list

### Skimmability

- Keep paragraphs short (no more than 3–4 sentences).
- Use bulleted or numbered lists whenever listing features, benefits, or steps.
- **Bold** key terms, tool names, or primary concepts to help users skim.

## 6. Linking Strategy

- **Internal Linking:** When mentioning features relevant to the GA4 Optimizer extension (e.g., sticky headers, copying custom definitions, 1-click exit pages), seamlessly integrate internal links or calls-to-action back to our tool.
- **External Links:** Always include `target="_blank" rel="noopener noreferrer"` on external links.
- **UTM Tagging:** Every link to the GA4 Optimizer Chrome Web Store listing must include UTM parameters. Use the following pattern:
  ```
  ?utm_source=gaoptimizer.com&utm_medium=website&utm_campaign=blog_[post_slug]
  ```
  Where `[post_slug]` is a short identifier for the post (e.g., `blog_task_assistant`, `blog_exit_rate_guide`, `blog_500_rows`). This applies to Chrome, Edge, and Firefox store links alike.

## 7. Tone, Voice & Stylistic Constraints

**Audience:** Data-driven marketers, web analysts, and SEO professionals.

**Tone:** Authoritative, technical yet accessible, and highly practical. Avoid fluff; get straight to the value.

- **No emojis** in body content, headings, or meta data. They detract from technical authority and signal AI-generated content.
- **Limit em dashes (—):** AI models overuse them. Use commas, periods, or parentheses instead.
- **Avoid AI buzzwords:** Do not use "delve," "unleash," "supercharge," "landscape," "testament," or "crucial."
