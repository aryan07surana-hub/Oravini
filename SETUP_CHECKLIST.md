# ✅ CONTENT WORKFLOW ENGINE — SETUP CHECKLIST

## Quick Setup (5 Minutes)

### ✅ Step 1: Verify Database Migration
The Content Intelligence Engine migration should already be run. Verify:

```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM hook_library;"
```

If you get an error, run the migration:

```bash
psql $DATABASE_URL < migrations/add_content_intelligence_engine.sql
```

---

### ✅ Step 2: Restart Your Server
The new routes are already integrated. Just restart:

```bash
npm run dev
```

---

### ✅ Step 3: Test the API
Test the funnel skills endpoint:

```bash
curl http://localhost:5000/api/funnel-skills
```

You should see the funnel stage skills JSON response.

---

### ✅ Step 4: Generate Your First Workflow
Generate a week of content:

```bash
curl -X POST http://localhost:5000/api/content-workflow/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "period": "week",
    "startDate": "2024-10-01",
    "platform": "instagram",
    "niche": "Your Niche",
    "goal": "Grow followers",
    "strategy": "balanced",
    "postsPerDay": 1
  }'
```

---

### ✅ Step 5: Analyze Your Brand Voice
If you have existing content posts in the database:

```bash
curl -X POST http://localhost:5000/api/brand-voice/analyze \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

---

## 🎯 What You Can Do Now

### 1. **Generate Content Workflows**
- October content (30 days)
- November content (30 days)
- Weekly sprints (7 days)
- Bi-weekly plans (14 days)
- Custom periods (any number of days)

### 2. **Choose Your Strategy**
- **Growth**: 60% TOFU, 30% MOFU, 10% BOFU
- **Nurture**: 30% TOFU, 50% MOFU, 20% BOFU
- **Conversion**: 20% TOFU, 40% MOFU, 40% BOFU
- **Balanced**: 40% TOFU, 40% MOFU, 20% BOFU

### 3. **Analyze Content**
- Batch analyze multiple posts
- Calculate viral scores
- Extract hooks and patterns
- Get recommendations

### 4. **Train the AI**
- Submit performance feedback
- Build winning patterns library
- Analyze brand voice
- Get smarter over time

---

## 📁 Files You Have

### Core Engine
- `server/contentWorkflow.ts` — Workflow generator
- `server/contentWorkflowRoutes.ts` — API routes
- `server/contentIntelligence.ts` — Intelligence engine (already existed)
- `server/storage.ts` — Database methods (updated)

### Documentation
- `CONTENT_INTELLIGENCE_ENGINE.md` — Original engine docs
- `CONTENT_WORKFLOW_GUIDE.md` — Complete guide
- `CONTENT_WORKFLOW_EXAMPLES.md` — Usage examples
- `IMPLEMENTATION_SUMMARY.md` — What was built
- `SETUP_CHECKLIST.md` — This file

### Database
- `migrations/add_content_intelligence_engine.sql` — Already exists
- All tables already created

---

## 🚀 Quick Start Commands

### Generate October Content
```bash
curl -X POST http://localhost:5000/api/content-workflow/generate \
  -H "Content-Type: application/json" \
  -d '{"period":"month","startDate":"2024-10-01","platform":"instagram","niche":"Business Coaching","goal":"Grow followers","strategy":"balanced","postsPerDay":1}'
```

### Generate November Content
```bash
curl -X POST http://localhost:5000/api/content-workflow/generate \
  -H "Content-Type: application/json" \
  -d '{"period":"month","startDate":"2024-11-01","platform":"instagram","niche":"Business Coaching","goal":"Build trust","strategy":"nurture","postsPerDay":1}'
```

### Get Funnel Skills
```bash
curl http://localhost:5000/api/funnel-skills
```

### Get Content Strategies
```bash
curl http://localhost:5000/api/content-strategies
```

---

## 🎨 Frontend Integration

### React/TypeScript Example

```typescript
import { useState } from 'react';

interface WorkflowParams {
  period: 'week' | '2weeks' | 'month' | 'custom';
  startDate: string;
  platform: 'instagram' | 'youtube';
  niche: string;
  goal: string;
  strategy: 'growth' | 'nurture' | 'conversion' | 'balanced';
  postsPerDay: number;
}

export function ContentWorkflowGenerator() {
  const [loading, setLoading] = useState(false);
  const [workflow, setWorkflow] = useState(null);

  const generateWorkflow = async (params: WorkflowParams) => {
    setLoading(true);
    try {
      const response = await fetch('/api/content-workflow/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await response.json();
      setWorkflow(data.workflow);
    } catch (error) {
      console.error('Failed to generate workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Your UI here */}
      <button onClick={() => generateWorkflow({
        period: 'month',
        startDate: '2024-10-01',
        platform: 'instagram',
        niche: 'Business Coaching',
        goal: 'Grow followers',
        strategy: 'balanced',
        postsPerDay: 1
      })}>
        Generate October Content
      </button>
      
      {loading && <p>Generating...</p>}
      {workflow && <pre>{JSON.stringify(workflow, null, 2)}</pre>}
    </div>
  );
}
```

---

## 🔥 Pro Tips

1. **Start with brand voice analysis** — Let the AI learn your voice first
2. **Submit performance feedback** — The more data, the smarter it gets
3. **Use different strategies** — Test growth vs nurture vs conversion
4. **Review and edit** — Generated content is a starting point
5. **Track what works** — Submit feedback to improve future generations

---

## 📊 Expected Results

### Week 1
- Generate your first month of content
- Analyze your brand voice
- Submit performance feedback for existing posts

### Week 2
- Generate content with your trained brand voice
- See improved hook quality
- Notice better funnel stage distribution

### Week 3
- AI learns your winning patterns
- Content becomes more personalized
- Higher quality suggestions

### Week 4
- Fully trained AI
- Consistent, high-quality content
- Minimal editing required

---

## 🎯 Success Metrics

Track these to measure success:

1. **Time Saved**: From 2-3 hours/week to 30 seconds
2. **Content Quality**: Viral score improvement
3. **Consistency**: Never miss a posting day
4. **Engagement**: Better funnel stage distribution
5. **Conversions**: More BOFU content when needed

---

## 🆘 Troubleshooting

### Issue: "Table does not exist"
**Solution**: Run the migration:
```bash
psql $DATABASE_URL < migrations/add_content_intelligence_engine.sql
```

### Issue: "Not enough posts to analyze brand voice"
**Solution**: You need at least 5 posts in the database. Add more content posts first.

### Issue: "API endpoint not found"
**Solution**: Make sure you restarted the server after adding the new routes.

### Issue: "Session cookie required"
**Solution**: You need to be authenticated. Get your session cookie from the browser.

---

## 📞 Support

If you need help:
1. Check the documentation files
2. Review the examples
3. Test with the provided curl commands
4. Verify database migration is complete

---

## ✅ You're Ready!

Everything is set up and ready to use. Start generating content workflows now!

```bash
# Generate your first workflow
curl -X POST http://localhost:5000/api/content-workflow/generate \
  -H "Content-Type: application/json" \
  -d '{"period":"week","startDate":"2024-10-01","platform":"instagram","niche":"Your Niche","goal":"Grow","strategy":"balanced","postsPerDay":1}'
```

---

Built with 🔥 by Oravini

**NO MORE MANUAL PLANNING. JUST SMART, TRAINED CONTENT AT SCALE.**
