# Tool Heatmap - Quick Setup & Testing Guide

## ✅ What's Already Done

1. ✅ Backend API endpoints created (`/api/admin/tool-heatmap` and `/api/admin/tool-analytics`)
2. ✅ Frontend dashboard component created (`AdminToolHeatmap.tsx`)
3. ✅ Route already exists in App.tsx (`/admin/tool-heatmap`)
4. ✅ Uses existing database table (`credit_transactions`)
5. ✅ Admin authentication already in place

## 🚀 How to Access

### For You (Admin):
1. Make sure you're logged in as an admin
2. Navigate to: `http://localhost:5000/admin/tool-heatmap`
3. Or add a link to your admin sidebar (see below)

## 📊 Testing the Heatmap

### If You Have Existing Data:
Just visit `/admin/tool-heatmap` and you'll see:
- All users who have used tools
- Which tools they've used
- How many times
- When they used them

### If You Have NO Data Yet:
The heatmap will be empty. To generate test data:

1. **Use some tools as a regular user:**
   - Go to `/ai-ideas` and generate content ideas (costs 5 credits)
   - Go to `/carousel-studio` and create a carousel (costs 5 credits)
   - Go to `/tracking/competitor` and run an analysis (costs 12 credits)

2. **Or manually insert test data:**
```sql
-- Insert some test credit transactions
INSERT INTO credit_transactions (user_id, amount, type, description)
VALUES
  ('your-user-id', -5, 'ai_ideas', 'AI Content Ideas generation'),
  ('your-user-id', -5, 'carousel', 'Carousel Builder'),
  ('your-user-id', -12, 'competitor', 'Competitor Analysis');
```

3. **Refresh the heatmap page** and you'll see the data

## 🔗 Adding to Admin Sidebar

If you want to add a link to your admin sidebar, find your admin layout component and add:

```tsx
<Link href="/admin/tool-heatmap">
  <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 rounded-lg">
    <Flame className="w-5 h-5" />
    <span>Tool Heatmap</span>
  </div>
</Link>
```

## 🧪 Testing Checklist

- [ ] Can access `/admin/tool-heatmap` as admin
- [ ] Cannot access as regular user (should redirect)
- [ ] Overview cards show correct totals
- [ ] Heatmap tab displays user × tool matrix
- [ ] Sections tab groups tools correctly
- [ ] Top Users tab ranks by usage
- [ ] Tools tab shows popularity ranking
- [ ] Color coding works (gray → blue → green → yellow → orange → red)
- [ ] Hover effects work
- [ ] Responsive on mobile/tablet

## 📈 What Data You'll See

The system tracks every tool usage that costs credits:

| Tool Type | Credit Cost | Tracked As |
|-----------|-------------|------------|
| AI Content Ideas | 5 | `ai_ideas` |
| AI Script Generator | 2 | `ai_coach` |
| Content Report | 8 | `ai_report` |
| Carousel Builder | 5 | `carousel` |
| Carousel Images | 3 | `carousel_image` |
| Competitor Analysis | 12 | `competitor` |
| Reel Comparison | 5 | `competitor_reels` |
| Niche Intelligence | 10 | `niche_analysis` |
| Content DNA | 7 | `methodology` |
| Hashtag Suggestions | 1 | `hashtag_suggestions` |
| Steal Strategy | 10 | `steal_strategy` |

## 🐛 Troubleshooting

### "No data showing"
- Check if users have actually used any tools
- Verify `credit_transactions` table has records with `amount < 0`
- Check browser console for API errors

### "Unauthorized" error
- Make sure you're logged in as admin
- Check `req.user.role === 'admin'` in backend

### "Loading forever"
- Check backend logs for errors
- Verify database connection
- Check if API endpoints are responding

### "Heatmap looks weird"
- Clear browser cache
- Check if CSS is loading properly
- Verify Tailwind classes are working

## 🎯 Quick Wins

Once you have data, you can immediately:

1. **See your most engaged users** → Reach out for testimonials
2. **Identify underused tools** → Create tutorial content
3. **Spot power users** → Offer them beta features
4. **Track section popularity** → Prioritize development
5. **Monitor credit usage** → Optimize pricing

## 🔄 Refresh Data

The heatmap doesn't auto-refresh. To see new data:
1. Refresh the page manually
2. Or add a "Refresh" button that calls `fetchData()` again

## 📱 Mobile View

The heatmap is responsive but the matrix table might be wide. Users can:
- Scroll horizontally on the table
- Use the other tabs (Sections, Users, Tools) for better mobile experience

## 🚨 Important Notes

1. **Admin Only**: This page is only accessible to admin users
2. **No Real-Time**: Data updates on page refresh, not real-time
3. **Credit-Based**: Only tracks tools that cost credits
4. **Privacy**: Shows user names and emails (admin-only data)
5. **Performance**: Queries are optimized but may be slow with 1000+ users

## 🎨 Customization Ideas

Want to customize? Easy changes:

### Change Colors:
```tsx
// In AdminToolHeatmap.tsx, find getHeatColor function
const getHeatColor = (value: number, max: number) => {
  // Modify these color classes
  if (intensity < 0.2) return "bg-blue-100 text-blue-700";
  // ... etc
}
```

### Add Export Button:
```tsx
const exportToCSV = () => {
  const csv = /* convert data to CSV */;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tool-heatmap.csv';
  a.click();
};
```

### Add Date Filter:
```tsx
const [dateRange, setDateRange] = useState({ start: '', end: '' });
// Pass to API: /api/admin/tool-heatmap?start=2025-01-01&end=2025-01-31
```

## 🎉 You're Done!

The tool heatmap is now fully functional. Just:
1. Visit `/admin/tool-heatmap`
2. Explore the four tabs
3. Get insights from your data
4. Make data-driven decisions

Need help? Check the main docs: `TOOL_HEATMAP_DOCS.md`
