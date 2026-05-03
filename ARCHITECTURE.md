# 🏗️ CONTENT WORKFLOW ENGINE — ARCHITECTURE

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTENT WORKFLOW ENGINE                       │
│                                                                   │
│  Generate weeks/months of content in one click with              │
│  funnel-stage intelligence (TOFU/MOFU/BOFU)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CONTENT INTELLIGENCE ENGINE                    │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Hook Library │  │   Winning    │  │ Brand Voice  │         │
│  │  10,000+     │  │   Patterns   │  │   Profile    │         │
│  │   Hooks      │  │              │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │  Platform    │  │    Funnel    │                            │
│  │  Training    │  │    Stage     │                            │
│  │    Data      │  │   Training   │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```
┌──────────────┐
│     USER     │
│   REQUEST    │
└──────┬───────┘
       │
       │ POST /api/content-workflow/generate
       │ {
       │   period: "month",
       │   platform: "instagram",
       │   niche: "Business Coaching",
       │   strategy: "balanced"
       │ }
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│              CONTENT WORKFLOW GENERATOR                       │
│                                                                │
│  1. Calculate days (7/14/30)                                 │
│  2. Get funnel distribution (40% TOFU, 40% MOFU, 20% BOFU)  │
│  3. Get content mix (50% Reels, 30% Carousels, 20% Posts)   │
│  4. Calculate post counts per funnel stage                   │
│  5. Generate posts for each day                              │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│              SINGLE POST GENERATOR                            │
│                                                                │
│  For each post:                                               │
│  1. Determine funnel stage (TOFU/MOFU/BOFU)                 │
│  2. Select content type (reel/carousel/post)                 │
│  3. Build training prompt with user's data                   │
│  4. Get funnel stage skills                                  │
│  5. Select hook type and CTA type                            │
│  6. Get user's winning patterns                              │
│  7. Get top hooks for niche                                  │
│  8. Generate content idea                                     │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│              TRAINING PROMPT BUILDER                          │
│                                                                │
│  Combines:                                                    │
│  • User's winning patterns                                    │
│  • Global hook library                                        │
│  • Platform training data                                     │
│  • Funnel stage training                                      │
│  • Brand voice profile                                        │
│  • Critical rules                                             │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│              CONTENT IDEA GENERATOR                           │
│                                                                │
│  Returns:                                                     │
│  • Title/Hook                                                 │
│  • Body (3-5 key points)                                     │
│  • CTA                                                        │
│  • Why it works                                               │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│              RESPONSE TO USER                                 │
│                                                                │
│  {                                                            │
│    workflow: {                                                │
│      period: "month",                                         │
│      days: 30,                                                │
│      strategy: {...},                                         │
│      posts: [                                                 │
│        {                                                      │
│          day: 1,                                              │
│          date: "2024-10-01",                                 │
│          funnelStage: "top",                                 │
│          contentType: "reel",                                │
│          hookType: "curiosity",                              │
│          title: "...",                                        │
│          hook: "...",                                         │
│          body: "...",                                         │
│          cta: "...",                                          │
│          whyItWorks: "..."                                    │
│        },                                                     │
│        // ... 29 more posts                                  │
│      ]                                                        │
│    },                                                         │
│    calendarId: "cal_123"                                     │
│  }                                                            │
└──────────────────────────────────────────────────────────────┘
```

---

## Funnel Stage Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    CONTENT FUNNEL                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TOP OF FUNNEL (TOFU) — AWARENESS                           │
│                                                               │
│  Purpose: Reach new people who don't know you                │
│  Content: Viral reels, trending topics, pain points          │
│  Hooks: Curiosity, controversy, storytelling                 │
│  CTAs: "Follow for more", "Save this", "Share"              │
│  Metrics: Views, shares, reach, profile visits               │
│                                                               │
│  Example:                                                     │
│  "I analyzed 10,000 posts. 97% are making this mistake"     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  MIDDLE OF FUNNEL (MOFU) — TRUST                            │
│                                                               │
│  Purpose: Prove you know what you're talking about           │
│  Content: Case studies, frameworks, how-to breakdowns        │
│  Hooks: Authority, education, proof                          │
│  CTAs: "Comment your thoughts", "DM me [word]", "Save"      │
│  Metrics: Saves, comments, engagement rate                   │
│                                                               │
│  Example:                                                     │
│  "After working with 100+ clients, here's the framework"    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  BOTTOM OF FUNNEL (BOFU) — CONVERSION                       │
│                                                               │
│  Purpose: Turn followers into customers                       │
│  Content: Testimonials, offers, urgency-driven posts         │
│  Hooks: Authority, proof, scarcity                           │
│  CTAs: "DM to work with me", "Link in bio", "Limited spots" │
│  Metrics: DMs, link clicks, applications, sales              │
│                                                               │
│  Example:                                                     │
│  "Client went from $0 to $10K/month in 60 days"             │
└─────────────────────────────────────────────────────────────┘
```

---

## Strategy Comparison

```
┌─────────────────────────────────────────────────────────────┐
│                    GROWTH STRATEGY                           │
│                                                               │
│  Funnel: 60% TOFU, 30% MOFU, 10% BOFU                       │
│  Content: 60% Reels, 30% Carousels, 10% Posts               │
│  Best for: New accounts, viral growth, follower acquisition  │
│  Focus: Reach, virality, new followers                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    NURTURE STRATEGY                          │
│                                                               │
│  Funnel: 30% TOFU, 50% MOFU, 20% BOFU                       │
│  Content: 40% Reels, 40% Carousels, 20% Posts               │
│  Best for: Building trust, authority, community engagement   │
│  Focus: Engagement, trust, authority                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  CONVERSION STRATEGY                         │
│                                                               │
│  Funnel: 20% TOFU, 40% MOFU, 40% BOFU                       │
│  Content: 30% Reels, 50% Carousels, 20% Posts               │
│  Best for: Monetization, lead generation, sales              │
│  Focus: Conversions, sales, leads                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   BALANCED STRATEGY                          │
│                                                               │
│  Funnel: 40% TOFU, 40% MOFU, 20% BOFU                       │
│  Content: 50% Reels, 30% Carousels, 20% Posts               │
│  Best for: Sustainable growth, all-around performance        │
│  Focus: Balanced growth across all metrics                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE TABLES                           │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  hook_library    │  ← Proven viral hooks (10,000+)
├──────────────────┤
│ id               │
│ hook             │
│ hook_type        │
│ platform         │
│ niche            │
│ viral_score      │
│ avg_views        │
│ avg_engagement   │
│ usage_count      │
│ source           │
└──────────────────┘

┌──────────────────┐
│ winning_patterns │  ← User's best-performing content
├──────────────────┤
│ id               │
│ user_id          │
│ post_id          │
│ platform         │
│ content_type     │
│ funnel_stage     │
│ hook             │
│ hook_type        │
│ structure        │
│ cta              │
│ niche            │
│ views            │
│ likes            │
│ comments         │
│ saves            │
│ engagement_rate  │
│ viral_score      │
└──────────────────┘

┌──────────────────────┐
│ brand_voice_profiles │  ← User's unique voice
├──────────────────────┤
│ id                   │
│ user_id              │
│ tone                 │
│ vocabulary           │
│ sentence_structure   │
│ punctuation_style    │
│ perspective          │
│ unique_patterns      │
│ voice_fingerprint    │
└──────────────────────┘

┌──────────────────┐
│ content_calendars│  ← Monthly content plans
├──────────────────┤
│ id               │
│ user_id          │
│ month            │
│ niche            │
│ platform         │
│ goal             │
│ strategy         │
│ posts            │
│ status           │
└──────────────────┘

┌──────────────────────┐
│ platform_training_data│  ← Platform-specific patterns
├──────────────────────┤
│ id                   │
│ platform             │
│ content_type         │
│ pattern              │
│ category             │
│ description          │
│ examples             │
│ effectiveness        │
└──────────────────────┘

┌──────────────────────┐
│ funnel_stage_training│  ← TOFU/MOFU/BOFU examples
├──────────────────────┤
│ id                   │
│ funnel_stage         │
│ purpose              │
│ content_types        │
│ hook_types           │
│ cta_types            │
│ examples             │
│ best_practices       │
└──────────────────────┘
```

---

## API Endpoints

```
┌─────────────────────────────────────────────────────────────┐
│                    API ENDPOINTS                             │
└─────────────────────────────────────────────────────────────┘

POST   /api/content-workflow/generate
       → Generate content workflow (week/2weeks/month)

POST   /api/content-workflow/analyze-batch
       → Analyze multiple posts at once

POST   /api/content-workflow/bulk-feedback
       → Submit performance feedback for multiple posts

POST   /api/brand-voice/analyze
       → Analyze user's brand voice from existing posts

GET    /api/brand-voice
       → Get user's brand voice profile

GET    /api/winning-patterns
       → Get user's winning patterns

GET    /api/hook-library
       → Get proven viral hooks

GET    /api/content-calendars
       → Get all content calendars

GET    /api/content-calendars/:id
       → Get single content calendar

PATCH  /api/content-calendars/:id
       → Update content calendar

DELETE /api/content-calendars/:id
       → Delete content calendar

GET    /api/funnel-skills
       → Get funnel stage skills (TOFU/MOFU/BOFU)

GET    /api/content-strategies
       → Get content mix and funnel distribution strategies
```

---

## Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│              EXISTING ORAVINI FEATURES                       │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐
│ Content Posts    │  ← Track performance
│ Tracking         │  → Feed winning patterns
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ AI Content Ideas │  ← Generate ideas
│                  │  → Use funnel skills
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Instagram/       │  ← Sync posts
│ YouTube Sync     │  → Analyze performance
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Performance      │  ← Track metrics
│ Analytics        │  → Calculate viral scores
└──────────────────┘
```

---

Built with 🔥 by Oravini

**NO MORE MANUAL PLANNING. JUST SMART, TRAINED CONTENT AT SCALE.**
