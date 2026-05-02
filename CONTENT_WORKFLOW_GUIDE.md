# 🚀 CONTENT WORKFLOW ENGINE — COMPLETE GUIDE

## What This Is

The **Content Workflow Engine** is Oravini's bulk content generation system that creates **weeks or months of content in one click** using funnel-stage intelligence.

**NO MORE MANUAL PLANNING. JUST SMART, TRAINED CONTENT AT SCALE.**

---

## 🔥 What Makes This Different

### Traditional Content Planning:
- Manual brainstorming for every post ❌
- Generic content ideas ❌
- No funnel strategy ❌
- Time-consuming ❌
- Inconsistent quality ❌

### Oravini's Content Workflow Engine:
- Generate 7, 14, or 30 days of content in seconds ✅
- Trained on YOUR winning patterns ✅
- Funnel-stage optimized (TOFU/MOFU/BOFU) ✅
- Platform-specific (Instagram/YouTube) ✅
- Brand voice matched ✅

---

## 🎯 Core Features

### 1. **Funnel-Stage Skills**
Every piece of content is optimized for its funnel stage:

#### **Top of Funnel (TOFU) — Awareness**
- **Purpose**: Reach new people who don't know you
- **Content Types**: Viral reels, trending topics, relatable pain points
- **Hook Types**: Curiosity, controversy, storytelling, question
- **CTA Types**: "Follow for more", "Save this", "Share with someone"
- **Goals**: Reach, virality, new followers, brand awareness
- **Metrics**: Views, shares, reach, profile visits

#### **Middle of Funnel (MOFU) — Trust**
- **Purpose**: Prove you know what you're talking about
- **Content Types**: Case studies, frameworks, how-to breakdowns, value bombs
- **Hook Types**: Authority, education, proof, storytelling
- **CTA Types**: "Comment your thoughts", "DM me [word]", "Save this framework"
- **Goals**: Engagement, trust building, authority, community
- **Metrics**: Saves, comments, engagement rate, time spent

#### **Bottom of Funnel (BOFU) — Conversion**
- **Purpose**: Turn followers into customers
- **Content Types**: Testimonials, offers, urgency-driven posts, results
- **Hook Types**: Authority, proof, scarcity, controversy
- **CTA Types**: "DM to work with me", "Link in bio", "Limited spots"
- **Goals**: Conversions, sales, leads, applications
- **Metrics**: DMs, link clicks, applications, sales

### 2. **Content Mix Strategies**
Choose your content distribution:

- **Growth**: 60% Reels, 30% Carousels, 10% Posts
- **Engagement**: 40% Reels, 40% Carousels, 20% Posts
- **Conversion**: 30% Reels, 50% Carousels, 20% Posts
- **Balanced**: 50% Reels, 30% Carousels, 20% Posts

### 3. **Funnel Distribution Strategies**
Choose your funnel focus:

- **Growth**: 60% TOFU, 30% MOFU, 10% BOFU
- **Nurture**: 30% TOFU, 50% MOFU, 20% BOFU
- **Conversion**: 20% TOFU, 40% MOFU, 40% BOFU
- **Balanced**: 40% TOFU, 40% MOFU, 20% BOFU

### 4. **Time Periods**
Generate content for:
- **1 Week** (7 days)
- **2 Weeks** (14 days)
- **1 Month** (30 days)
- **Custom** (any number of days)

---

## 🚀 How to Use

### **Step 1: Generate a Content Workflow**

```bash
POST /api/content-workflow/generate
```

**Request Body:**
```json
{
  "period": "month",
  "startDate": "2024-10-01",
  "platform": "instagram",
  "niche": "Business Coaching",
  "goal": "Grow followers and generate leads",
  "strategy": "balanced",
  "postsPerDay": 1
}
```

**Response:**
```json
{
  "success": true,
  "workflow": {
    "period": "month",
    "days": 30,
    "startDate": "2024-10-01",
    "endDate": "2024-10-31",
    "strategy": {
      "name": "balanced",
      "funnelDistribution": { "top": 40, "middle": 40, "bottom": 20 },
      "contentMix": { "reels": 50, "carousels": 30, "posts": 20 },
      "postsPerDay": 1,
      "totalPosts": 30
    },
    "posts": [
      {
        "day": 1,
        "date": "2024-10-01",
        "funnelStage": "top",
        "contentType": "reel",
        "hookType": "curiosity",
        "title": "I analyzed 10,000 business coaching posts. 97% are making this mistake",
        "hook": "Stop scrolling if you want to know the truth about business coaching",
        "body": "Most people think business coaching is about X. Wrong...",
        "cta": "Follow for more",
        "whyItWorks": "Curiosity hook + authority positioning + pattern interrupt = viral"
      }
      // ... 29 more posts
    ],
    "summary": {
      "totalPosts": 30,
      "byFunnelStage": { "top": 12, "middle": 12, "bottom": 6 },
      "byContentType": { "reel": 15, "carousel": 9, "post": 6 }
    }
  },
  "calendarId": "cal_123"
}
```

### **Step 2: Analyze Content Batch**

Upload your existing content to analyze performance:

```bash
POST /api/content-workflow/analyze-batch
```

**Request Body:**
```json
{
  "posts": [
    {
      "title": "I quit my 9-5 to build a $1M business",
      "platform": "instagram",
      "contentType": "reel",
      "views": 125000,
      "likes": 8500,
      "comments": 450,
      "saves": 3200
    }
  ],
  "niche": "Business Coaching"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "totalPosts": 1,
    "winningPosts": 1,
    "averagePosts": 0,
    "poorPosts": 0,
    "avgViralScore": 9.2,
    "topPerformers": [
      {
        "title": "I quit my 9-5 to build a $1M business",
        "viralScore": 9.2,
        "hook": "I quit my 9-5 to build a $1M business",
        "hookType": "storytelling",
        "structure": "Hook → Problem → Solution → CTA",
        "performance": "winning"
      }
    ],
    "insights": {
      "topHookType": "storytelling",
      "hookTypeDistribution": { "storytelling": 1 },
      "recommendation": "Your storytelling hooks perform best. Use more of these."
    }
  }
}
```

### **Step 3: Bulk Performance Feedback**

Submit performance data for multiple posts to train the AI:

```bash
POST /api/content-workflow/bulk-feedback
```

**Request Body:**
```json
{
  "posts": [
    {
      "id": "post_123",
      "views": 125000,
      "likes": 8500,
      "comments": 450,
      "saves": 3200
    }
  ],
  "niche": "Business Coaching"
}
```

**Response:**
```json
{
  "success": true,
  "processed": 1,
  "results": [
    { "postId": "post_123", "processed": true }
  ]
}
```

### **Step 4: Analyze Brand Voice**

Let the AI learn your unique voice:

```bash
POST /api/brand-voice/analyze
```

**Response:**
```json
{
  "success": true,
  "brandVoice": {
    "tone": "authoritative",
    "vocabulary": ["framework", "proven", "system", "results"],
    "sentenceStructure": "short punchy",
    "punctuationStyle": "minimal",
    "perspective": "first person",
    "uniquePatterns": ["conversational openers", "value-driven language"],
    "voiceFingerprint": "authoritative tone + short punchy sentences + minimal punctuation",
    "analyzedPostsCount": 20
  }
}
```

---

## 📊 API Endpoints

### **Content Workflow**
- `POST /api/content-workflow/generate` — Generate content workflow
- `POST /api/content-workflow/analyze-batch` — Analyze content batch
- `POST /api/content-workflow/bulk-feedback` — Submit bulk performance feedback

### **Brand Voice**
- `POST /api/brand-voice/analyze` — Analyze brand voice
- `GET /api/brand-voice` — Get brand voice profile

### **Winning Patterns**
- `GET /api/winning-patterns?platform=instagram&funnelStage=top` — Get winning patterns

### **Hook Library**
- `GET /api/hook-library?platform=instagram&niche=business` — Get hook library

### **Content Calendars**
- `GET /api/content-calendars` — Get all calendars
- `GET /api/content-calendars/:id` — Get single calendar
- `PATCH /api/content-calendars/:id` — Update calendar
- `DELETE /api/content-calendars/:id` — Delete calendar

### **Funnel Skills**
- `GET /api/funnel-skills` — Get funnel stage skills

### **Content Strategies**
- `GET /api/content-strategies` — Get content mix and funnel distribution strategies

---

## 🎨 Example Workflows

### **October Content Plan (30 Days)**

```bash
curl -X POST http://localhost:5000/api/content-workflow/generate \
  -H "Content-Type: application/json" \
  -d '{
    "period": "month",
    "startDate": "2024-10-01",
    "platform": "instagram",
    "niche": "Business Coaching",
    "goal": "Grow followers and generate leads",
    "strategy": "growth",
    "postsPerDay": 1
  }'
```

### **November Content Plan (30 Days)**

```bash
curl -X POST http://localhost:5000/api/content-workflow/generate \
  -H "Content-Type: application/json" \
  -d '{
    "period": "month",
    "startDate": "2024-11-01",
    "platform": "instagram",
    "niche": "Business Coaching",
    "goal": "Build trust and authority",
    "strategy": "nurture",
    "postsPerDay": 1
  }'
```

### **Weekly Sprint (7 Days)**

```bash
curl -X POST http://localhost:5000/api/content-workflow/generate \
  -H "Content-Type: application/json" \
  -d '{
    "period": "week",
    "startDate": "2024-10-01",
    "platform": "instagram",
    "niche": "Business Coaching",
    "goal": "Quick content sprint",
    "strategy": "balanced",
    "postsPerDay": 2
  }'
```

### **Bi-Weekly Plan (14 Days)**

```bash
curl -X POST http://localhost:5000/api/content-workflow/generate \
  -H "Content-Type: application/json" \
  -d '{
    "period": "2weeks",
    "startDate": "2024-10-01",
    "platform": "instagram",
    "niche": "Business Coaching",
    "goal": "Consistent posting",
    "strategy": "balanced",
    "postsPerDay": 1
  }'
```

---

## 🔧 Integration with Content Intelligence Engine

The Content Workflow Engine is built on top of the **Content Intelligence Engine** and uses:

1. **Hook Library** — Proven viral hooks from 10,000+ posts
2. **Winning Patterns** — Your best-performing content
3. **Brand Voice** — Your unique voice and tone
4. **Platform Training** — Instagram/YouTube-specific patterns
5. **Funnel Stage Training** — TOFU/MOFU/BOFU examples

---

## 💡 Pro Tips

1. **Start with brand voice analysis** — Let the AI learn your voice first
2. **Submit performance feedback** — The more data, the smarter it gets
3. **Use different strategies** — Test growth vs nurture vs conversion
4. **Review and edit** — Generated content is a starting point, not final
5. **Track what works** — Submit feedback to improve future generations

---

## 🚀 Next Steps

1. **Run the migration** (if not already done):
   ```bash
   psql $DATABASE_URL < migrations/add_content_intelligence_engine.sql
   ```

2. **Analyze your brand voice**:
   ```bash
   POST /api/brand-voice/analyze
   ```

3. **Generate your first workflow**:
   ```bash
   POST /api/content-workflow/generate
   ```

4. **Submit performance feedback**:
   ```bash
   POST /api/content-workflow/bulk-feedback
   ```

---

## 📈 Results

### **Before:**
- Manual planning: 2-3 hours per week
- Generic content ideas
- No funnel strategy
- Inconsistent posting

### **After:**
- Generate 30 days in 30 seconds
- Trained on YOUR winning patterns
- Funnel-optimized content
- Consistent, strategic posting

---

Built with 🔥 by Oravini
