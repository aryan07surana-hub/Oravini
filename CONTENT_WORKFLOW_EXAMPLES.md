# 🚀 CONTENT WORKFLOW ENGINE — QUICK START EXAMPLES

## Example 1: Generate October Content (30 Days)

```bash
curl -X POST http://localhost:5000/api/content-workflow/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "period": "month",
    "startDate": "2024-10-01",
    "platform": "instagram",
    "niche": "Business Coaching",
    "goal": "Grow followers and generate leads",
    "strategy": "balanced",
    "postsPerDay": 1
  }'
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
    ]
  },
  "calendarId": "cal_123"
}
```

---

## Example 2: Generate November Content (30 Days, Nurture Strategy)

```bash
curl -X POST http://localhost:5000/api/content-workflow/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
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

---

## Example 3: Weekly Sprint (7 Days, 2 Posts Per Day)

```bash
curl -X POST http://localhost:5000/api/content-workflow/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "period": "week",
    "startDate": "2024-10-01",
    "platform": "instagram",
    "niche": "Fitness Coaching",
    "goal": "Quick content sprint",
    "strategy": "growth",
    "postsPerDay": 2
  }'
```

---

## Example 4: Bi-Weekly Plan (14 Days)

```bash
curl -X POST http://localhost:5000/api/content-workflow/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "period": "2weeks",
    "startDate": "2024-10-01",
    "platform": "youtube",
    "niche": "Tech Reviews",
    "goal": "Consistent posting",
    "strategy": "balanced",
    "postsPerDay": 1
  }'
```

---

## Example 5: Analyze Content Batch

```bash
curl -X POST http://localhost:5000/api/content-workflow/analyze-batch \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "posts": [
      {
        "title": "I quit my 9-5 to build a $1M business",
        "platform": "instagram",
        "contentType": "reel",
        "views": 125000,
        "likes": 8500,
        "comments": 450,
        "saves": 3200
      },
      {
        "title": "5 tips to grow your business",
        "platform": "instagram",
        "contentType": "carousel",
        "views": 15000,
        "likes": 850,
        "comments": 45,
        "saves": 320
      }
    ],
    "niche": "Business Coaching"
  }'
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "totalPosts": 2,
    "winningPosts": 1,
    "averagePosts": 1,
    "poorPosts": 0,
    "avgViralScore": 6.1,
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
      "hookTypeDistribution": { "storytelling": 1, "education": 1 },
      "recommendation": "Your storytelling hooks perform best. Use more of these."
    }
  }
}
```

---

## Example 6: Submit Bulk Performance Feedback

```bash
curl -X POST http://localhost:5000/api/content-workflow/bulk-feedback \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "posts": [
      {
        "id": "post_123",
        "views": 125000,
        "likes": 8500,
        "comments": 450,
        "saves": 3200
      },
      {
        "id": "post_456",
        "views": 15000,
        "likes": 850,
        "comments": 45,
        "saves": 320
      }
    ],
    "niche": "Business Coaching"
  }'
```

---

## Example 7: Analyze Brand Voice

```bash
curl -X POST http://localhost:5000/api/brand-voice/analyze \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
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

## Example 8: Get Funnel Skills

```bash
curl -X GET http://localhost:5000/api/funnel-skills \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Response:**
```json
{
  "success": true,
  "skills": {
    "top": {
      "purpose": "Awareness — reach new people who don't know you",
      "contentTypes": ["viral reels", "trending topics", "relatable pain points"],
      "hookTypes": ["curiosity", "controversy", "storytelling", "question"],
      "ctaTypes": ["Follow for more", "Save this", "Share with someone"],
      "goals": ["Reach", "Virality", "New followers"],
      "metrics": ["Views", "Shares", "Reach"]
    },
    "middle": {
      "purpose": "Trust — prove you know what you're talking about",
      "contentTypes": ["case studies", "frameworks", "how-to breakdowns"],
      "hookTypes": ["authority", "education", "proof"],
      "ctaTypes": ["Comment your thoughts", "DM me [word]", "Save this"],
      "goals": ["Engagement", "Trust building", "Authority"],
      "metrics": ["Saves", "Comments", "Engagement rate"]
    },
    "bottom": {
      "purpose": "Conversion — turn followers into customers",
      "contentTypes": ["testimonials", "offers", "urgency-driven posts"],
      "hookTypes": ["authority", "proof", "scarcity"],
      "ctaTypes": ["DM to work with me", "Link in bio", "Limited spots"],
      "goals": ["Conversions", "Sales", "Leads"],
      "metrics": ["DMs", "Link clicks", "Applications"]
    }
  }
}
```

---

## Example 9: Get Content Strategies

```bash
curl -X GET http://localhost:5000/api/content-strategies \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Response:**
```json
{
  "success": true,
  "strategies": {
    "funnelDistribution": {
      "growth": { "top": 60, "middle": 30, "bottom": 10 },
      "nurture": { "top": 30, "middle": 50, "bottom": 20 },
      "conversion": { "top": 20, "middle": 40, "bottom": 40 },
      "balanced": { "top": 40, "middle": 40, "bottom": 20 }
    },
    "contentMix": {
      "growth": { "reels": 60, "carousels": 30, "posts": 10 },
      "engagement": { "reels": 40, "carousels": 40, "posts": 20 },
      "conversion": { "reels": 30, "carousels": 50, "posts": 20 },
      "balanced": { "reels": 50, "carousels": 30, "posts": 20 }
    }
  }
}
```

---

## Example 10: Get All Content Calendars

```bash
curl -X GET http://localhost:5000/api/content-calendars \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

---

## Example 11: Get Single Calendar

```bash
curl -X GET http://localhost:5000/api/content-calendars/cal_123 \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

---

## Example 12: Update Calendar

```bash
curl -X PATCH http://localhost:5000/api/content-calendars/cal_123 \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "status": "active"
  }'
```

---

## Example 13: Delete Calendar

```bash
curl -X DELETE http://localhost:5000/api/content-calendars/cal_123 \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

---

## Strategy Comparison

### Growth Strategy (60% TOFU, 30% MOFU, 10% BOFU)
- **Best for**: New accounts, viral growth, follower acquisition
- **Content Mix**: 60% Reels, 30% Carousels, 10% Posts
- **Focus**: Reach, virality, new followers

### Nurture Strategy (30% TOFU, 50% MOFU, 20% BOFU)
- **Best for**: Building trust, establishing authority, community engagement
- **Content Mix**: 40% Reels, 40% Carousels, 20% Posts
- **Focus**: Engagement, trust, authority

### Conversion Strategy (20% TOFU, 40% MOFU, 40% BOFU)
- **Best for**: Monetization, lead generation, sales
- **Content Mix**: 30% Reels, 50% Carousels, 20% Posts
- **Focus**: Conversions, sales, leads

### Balanced Strategy (40% TOFU, 40% MOFU, 20% BOFU)
- **Best for**: Sustainable growth, all-around performance
- **Content Mix**: 50% Reels, 30% Carousels, 20% Posts
- **Focus**: Balanced growth across all metrics

---

## Integration with Frontend

```typescript
// Generate content workflow
const response = await fetch('/api/content-workflow/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    period: 'month',
    startDate: '2024-10-01',
    platform: 'instagram',
    niche: 'Business Coaching',
    goal: 'Grow followers and generate leads',
    strategy: 'balanced',
    postsPerDay: 1
  })
});

const { workflow, calendarId } = await response.json();

// Analyze brand voice
const voiceResponse = await fetch('/api/brand-voice/analyze', {
  method: 'POST'
});

const { brandVoice } = await voiceResponse.json();

// Get funnel skills
const skillsResponse = await fetch('/api/funnel-skills');
const { skills } = await skillsResponse.json();
```

---

Built with 🔥 by Oravini
