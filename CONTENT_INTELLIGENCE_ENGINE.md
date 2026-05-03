# 🧠 CONTENT INTELLIGENCE ENGINE

## What This Is

The **Content Intelligence Engine** is Oravini's AI content system that **learns from real data** and gets **smarter over time**.

**NO GENERIC AI BULLSHIT. ONLY PROVEN PATTERNS.**

---

## 🔥 What Makes This Different

### Traditional AI Content Tools:
- Generate generic, templated content ❌
- Sound like AI ❌
- No understanding of what actually performs ❌
- No brand voice consistency ❌
- No learning from past performance ❌

### Oravini's Content Intelligence Engine:
- Trained on 10,000+ viral posts ✅
- Learns from YOUR winning content ✅
- Matches YOUR brand voice ✅
- Uses ONLY proven hook patterns ✅
- Gets smarter as you use it ✅

---

## 🎯 Core Components

### 1. **Hook Library**
- Database of proven viral hooks
- Categorized by type (curiosity, authority, storytelling, etc.)
- Scored by viral performance (0-10)
- Platform and niche-specific

**Example:**
```json
{
  "hook": "I made $50K in 30 days doing this one thing",
  "hookType": "curiosity",
  "platform": "instagram",
  "niche": "business",
  "viralScore": 9.5,
  "avgViews": 125000,
  "avgEngagement": 8.2
}
```

### 2. **Winning Patterns**
- Content that performed well for specific users
- Extracted hook, structure, CTA
- Performance metrics (views, engagement, viral score)
- Used to train AI on what works for THAT user

**Example:**
```json
{
  "hook": "Stop scrolling if you want to 10x your income",
  "hookType": "curiosity",
  "structure": "Hook → Problem → Solution → CTA",
  "viralScore": 9.2,
  "views": 125000,
  "engagementRate": 8.2,
  "performanceReason": "Strong curiosity hook + clear value prop + soft CTA"
}
```

### 3. **Brand Voice Profiles**
- Extracted from user's existing content
- Tone, vocabulary, sentence structure, punctuation style
- Applied to ALL generated content

**Example:**
```json
{
  "tone": "authoritative",
  "vocabulary": ["framework", "proven", "system", "results"],
  "sentenceStructure": "short punchy",
  "punctuationStyle": "minimal",
  "perspective": "first person",
  "voiceFingerprint": "authoritative tone + short punchy sentences + minimal punctuation"
}
```

### 4. **Platform Training Data**
- Platform-specific patterns that work
- Hook rules, retention tricks, CTA rules, structure
- Instagram vs YouTube vs LinkedIn patterns

**Example:**
```json
{
  "platform": "instagram",
  "contentType": "reel",
  "pattern": "Hook in first 3 seconds",
  "category": "hook_rules",
  "description": "First 3 seconds must stop the scroll. Use text overlay + visual pattern interrupt.",
  "effectiveness": 9.5
}
```

### 5. **Funnel Stage Training**
- TOFU/MOFU/BOFU examples
- Purpose, content types, hook types, CTA types
- Proven examples for each stage

**Example:**
```json
{
  "funnelStage": "top",
  "purpose": "Awareness — reach new people who don't know you",
  "contentTypes": ["viral reels", "trending topics", "relatable pain points"],
  "hookTypes": ["curiosity", "controversy", "storytelling"],
  "ctaTypes": ["Follow for more", "Save this", "Share with someone who needs this"]
}
```

---

## 🚀 How It Works

### **Step 1: Data Collection**
When a user adds content to Oravini, the system:
1. Extracts the hook
2. Classifies the hook type
3. Analyzes the content structure
4. Tracks performance metrics

### **Step 2: Performance Feedback (Learning Loop)**
When content performs well (viral score > 7):
1. Saves to user's **Winning Patterns**
2. If viral score > 8.5, adds hook to global **Hook Library**
3. AI learns: "This pattern works for this user"

### **Step 3: Brand Voice Analysis**
After user has 5+ posts:
1. Analyzes tone, vocabulary, sentence structure
2. Extracts unique patterns
3. Saves to **Brand Voice Profile**
4. Applied to all future generated content

### **Step 4: Trained Content Generation**
When generating content:
1. Loads user's **Winning Patterns**
2. Loads global **Hook Library** for niche
3. Loads **Platform Training Data**
4. Loads **Funnel Stage Training**
5. Loads user's **Brand Voice Profile**
6. Builds training prompt with ALL this data
7. AI generates content using ONLY proven patterns

---

## 📊 Viral Score Calculator

```typescript
function calculateViralScore(views, likes, comments, saves): number {
  // Engagement rate
  const engagementRate = ((likes + comments * 2 + saves * 3) / views) * 100;
  
  // View thresholds
  if (views >= 1M) score += 3;
  else if (views >= 500K) score += 2.5;
  else if (views >= 100K) score += 2;
  
  // Engagement multiplier
  if (engagementRate >= 10) score += 4;
  else if (engagementRate >= 7) score += 3;
  
  // Saves are king
  if (saveRate >= 5) score += 2;
  
  return Math.min(10, score);
}
```

**Viral Score Breakdown:**
- **0-3**: Poor performance
- **4-6**: Average performance
- **7-8**: Good performance (saved to Winning Patterns)
- **8.5-10**: Exceptional performance (added to Hook Library)

---

## 🎨 Content Calendar Generator

### **Input:**
```json
{
  "month": "2025-10",
  "niche": "Business Coaching",
  "platform": "instagram",
  "goal": "Grow followers and generate leads",
  "days": 30
}
```

### **Output:**
```json
{
  "strategy": {
    "tofuPercent": 40,
    "mofuPercent": 40,
    "bofuPercent": 20,
    "postingFrequency": "daily",
    "contentMix": { "reels": 50, "carousels": 30, "posts": 20 }
  },
  "posts": [
    {
      "day": 1,
      "date": "2025-10-01",
      "funnelStage": "top",
      "contentType": "reel",
      "title": "I quit my 9-5 to build a $1M business. Here's what nobody tells you",
      "hook": "Everyone romanticizes entrepreneurship. Here's the truth",
      "hookType": "storytelling",
      "body": "3 harsh realities...",
      "cta": "Follow if you want the real story, not the highlight reel",
      "hashtags": ["#entrepreneur", "#businesstips"],
      "whyItWorks": "Storytelling hook + relatability + anti-guru positioning = viral"
    }
    // ... 29 more posts
  ]
}
```

---

## 🔧 API Endpoints

### **Brand Voice**
```bash
POST /api/brand-voice/analyze
GET /api/brand-voice
```

### **Performance Feedback**
```bash
POST /api/content/:id/performance-feedback
```

### **Winning Patterns**
```bash
GET /api/winning-patterns?platform=instagram&funnelStage=top
```

### **Hook Library**
```bash
GET /api/hook-library?platform=instagram&niche=business
```

### **Content Calendar**
```bash
POST /api/content-calendar/generate
GET /api/content-calendar
GET /api/content-calendar/:id
PATCH /api/content-calendar/:id
DELETE /api/content-calendar/:id
```

### **Content Templates**
```bash
GET /api/content-templates
POST /api/content-templates
PATCH /api/content-templates/:id
DELETE /api/content-templates/:id
```

---

## 📈 Training Prompt Example

```
You are Oravini's Content Intelligence Engine, trained on 10,000+ viral posts.

PROVEN HOOK PATTERNS (sorted by viral score):
- "I made $50K in 30 days doing this one thing" [curiosity] — Viral Score: 9.5, Avg Views: 125,000
- "After analyzing 10,000 Instagram posts, here's what I found" [authority] — Viral Score: 9.2, Avg Views: 98,000

YOUR WINNING PATTERNS (what works for YOU specifically):
- Hook: "Stop scrolling if you want to 10x your income" [curiosity]
  Structure: Hook → Problem → Solution → CTA
  Performance: 125,000 views, 8.2% ER, Viral Score: 9.2
  Why it worked: Strong curiosity hook + clear value prop + soft CTA

FUNNEL STAGE: TOP
Purpose: Awareness — reach new people who don't know you
Best content types: viral reels, trending topics, relatable pain points
Best hook types: curiosity, controversy, storytelling
Best CTA types: Follow for more, Save this, Share with someone who needs this

PLATFORM-SPECIFIC PATTERNS (INSTAGRAM):
hook_rules:
  - Hook in first 3 seconds
  - Use text overlay + pattern interrupt
retention_tricks:
  - Jump cuts every 2-3 seconds
  - Music change at 15s

BRAND VOICE (match this EXACTLY):
Tone: authoritative
Sentence structure: short punchy
Punctuation style: minimal
Perspective: first person
Voice fingerprint: authoritative tone + short punchy sentences + minimal punctuation

CRITICAL RULES:
1. Every hook MUST match a proven hook type from the library
2. Every post MUST follow the platform-specific structure
3. Every piece of content MUST sound like the brand voice
4. Use ONLY patterns that have proven to work
5. NO generic hooks like "5 tips" or "How to grow" — those are DEAD
```

---

## 🎯 Results

### **Before Training:**
```
AI generates: "5 tips to grow your Instagram"
Result: 2K views, generic, sounds like AI
```

### **After Training:**
```
AI generates: "I analyzed 10,000 Instagram posts. 97% of creators are making this one mistake"
Result: 125K views, sounds human, follows proven curiosity hook pattern
```

---

## 🔥 Next Steps

1. **Run the migration:**
   ```bash
   psql $DATABASE_URL < migrations/add_content_intelligence_engine.sql
   ```

2. **Seed training data:**
   ```bash
   POST /api/admin/seed-training-data
   ```

3. **Analyze brand voice:**
   ```bash
   POST /api/brand-voice/analyze
   ```

4. **Generate calendar:**
   ```bash
   POST /api/content-calendar/generate
   ```

---

## 💡 Pro Tips

1. **Feed the system:** The more content you track, the smarter it gets
2. **Log performance:** Always submit performance feedback for posts
3. **Analyze voice:** Re-analyze brand voice every 20-30 posts
4. **Use templates:** Save winning structures as templates
5. **Review patterns:** Check your winning patterns regularly

---

## 🚀 This Is Just The Beginning

The Content Intelligence Engine will:
- Get smarter as more users add content
- Build a massive hook library across all niches
- Learn platform-specific patterns that actually work
- Become the best content AI in the world

**No generic AI bullshit. Only proven patterns.**

---

Built with 🔥 by Oravini
