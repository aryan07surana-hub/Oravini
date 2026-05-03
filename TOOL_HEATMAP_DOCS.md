# Tool Usage Heatmap & Analytics System

## Overview
A comprehensive tool usage tracking system that allows admins to monitor which tools and sections users engage with most on the Oravini platform.

## Features Implemented

### 1. **Backend API Endpoints**

#### `/api/admin/tool-heatmap` (GET)
Returns a heatmap matrix showing which users are using which tools.

**Response:**
```json
{
  "toolStats": [
    {
      "tool": "ai_ideas",
      "totalUses": 150,
      "uniqueUsers": 25,
      "totalCredits": 750
    }
  ],
  "allTools": ["ai_ideas", "carousel", "competitor", ...],
  "userToolMatrix": [
    {
      "userId": "user-123",
      "userName": "John Doe",
      "tools": {
        "ai_ideas": 10,
        "carousel": 5,
        "competitor": 3
      }
    }
  ]
}
```

#### `/api/admin/tool-analytics` (GET)
Returns detailed analytics including timeline data, top users, section usage, and plan breakdowns.

**Response:**
```json
{
  "overview": {
    "total_users": 100,
    "total_actions": 5000,
    "total_credits_used": 25000
  },
  "timeline": [
    {
      "date": "2025-01-15",
      "tool": "ai_ideas",
      "uses": 50
    }
  ],
  "topUsers": [
    {
      "id": "user-123",
      "name": "John Doe",
      "email": "john@example.com",
      "plan": "elite",
      "total_uses": 200,
      "credits_used": 1000,
      "unique_tools_used": 8
    }
  ],
  "sectionUsage": [
    {
      "section": "AI Content Ideas",
      "uses": 1500,
      "unique_users": 50
    }
  ],
  "planBreakdown": [
    {
      "plan": "elite",
      "tool": "ai_ideas",
      "uses": 500
    }
  ]
}
```

### 2. **Frontend Dashboard**

Located at: `/admin/tool-heatmap`

#### **Four Main Tabs:**

1. **Heatmap Tab**
   - Visual matrix showing user × tool usage
   - Color-coded intensity (gray → blue → green → yellow → orange → red)
   - Sticky user column for easy scrolling
   - Hover effects for better UX

2. **Sections Tab**
   - Shows which platform sections are most popular
   - Groups tools into logical sections:
     - AI Content Ideas (ai_ideas, ai_coach, ai_report)
     - Design Studio (carousel, carousel_image)
     - Competitor Intelligence (competitor, competitor_reels, niche_analysis)
     - Content Tools (methodology, hashtag_suggestions)
   - Progress bars showing relative usage
   - User count badges

3. **Top Users Tab**
   - Ranked list of most active users
   - Shows total uses, unique tools used, and plan tier
   - Color-coded ranking badges
   - Plan tier badges (elite, pro, growth, starter, free)

4. **Tools Tab**
   - Ranked list of most popular tools
   - Shows total uses, unique users, and credits consumed
   - Progress bars showing relative popularity
   - Gradient color scheme (blue → purple)

#### **Overview Cards:**
- Total Users (with Users icon)
- Total Actions (with Activity icon)
- Credits Used (with Zap icon)

### 3. **Tool Name Mapping**

The system automatically formats internal tool names to user-friendly labels:

```typescript
ai_ideas → "AI Content Ideas"
ai_coach → "AI Script Generator"
ai_report → "Content Report"
carousel → "Carousel Builder"
carousel_image → "Carousel Images"
competitor → "Competitor Analysis"
competitor_reels → "Reel Comparison"
niche_analysis → "Niche Intelligence"
methodology → "Content DNA"
hashtag_suggestions → "Hashtag Suggestions"
steal_strategy → "Steal Strategy"
```

### 4. **Data Sources**

All data is pulled from the `credit_transactions` table where:
- `amount < 0` indicates a tool usage (credit deduction)
- `type` field contains the tool identifier
- `user_id` links to the user who used the tool
- `created_at` provides timestamp for timeline analysis

## How It Works

1. **Tracking**: Every time a user uses a tool that costs credits, a record is created in `credit_transactions` with a negative amount
2. **Aggregation**: The backend queries aggregate this data by tool, user, date, and section
3. **Visualization**: The frontend displays this data in multiple views for different insights

## Usage

### For Admins:
1. Navigate to `/admin/tool-heatmap`
2. View the overview cards for quick stats
3. Switch between tabs to see different perspectives:
   - **Heatmap**: See which users are using which tools
   - **Sections**: Understand which platform areas are most popular
   - **Top Users**: Identify power users and engagement patterns
   - **Tools**: See which tools are driving the most engagement

### Key Insights You Can Get:

1. **User Engagement Patterns**
   - Which users are most active?
   - What tools do they prefer?
   - Are users exploring multiple tools or sticking to one?

2. **Tool Popularity**
   - Which tools are most used?
   - Which tools have the highest unique user count?
   - Which tools consume the most credits?

3. **Section Performance**
   - Is AI Content Ideas more popular than Design Studio?
   - Are users engaging with Competitor Intelligence?
   - Which sections need more promotion?

4. **Plan Tier Analysis**
   - Do elite users use different tools than free users?
   - Which tools are most popular per plan tier?
   - Are paid features being utilized?

5. **Timeline Trends**
   - How has tool usage changed over the last 30 days?
   - Are there spikes on certain days?
   - Which tools are growing vs declining?

## Technical Details

### Database Queries
All queries use PostgreSQL with proper indexing on:
- `credit_transactions.user_id`
- `credit_transactions.type`
- `credit_transactions.created_at`
- `credit_transactions.amount`

### Performance
- Queries are optimized with aggregations at the database level
- Results are cached on the frontend
- No real-time updates (manual refresh required)

### Security
- All endpoints require admin authentication (`requireAdmin` middleware)
- No sensitive user data exposed (only names, emails, and usage stats)

## Future Enhancements

Potential additions:
1. Real-time updates via WebSocket
2. Export to CSV/Excel
3. Date range filters
4. Tool comparison charts
5. Predictive analytics (which users might churn based on low engagement)
6. Email alerts for unusual patterns
7. Custom dashboard widgets
8. A/B testing insights

## Files Modified/Created

### Backend:
- `/server/routes.ts` - Added two new endpoints

### Frontend:
- `/client/src/pages/AdminToolHeatmap.tsx` - New dashboard component
- `/client/src/App.tsx` - Route already existed

### Database:
- No schema changes required (uses existing `credit_transactions` table)

## Access

**URL**: `/admin/tool-heatmap`
**Permission**: Admin only
**Navigation**: Can be accessed from admin sidebar or directly via URL
