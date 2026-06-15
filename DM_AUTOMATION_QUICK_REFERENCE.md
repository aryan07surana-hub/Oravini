# 🚀 DM AUTOMATION - QUICK REFERENCE GUIDE

## 📋 FEATURE LOCATIONS

### **Tab 1: Auto-Replies**
- Create keyword triggers
- Set match type (exact/contains/starts with)
- Auto-reply messages
- Toggle active/inactive
- View trigger count

### **Tab 2: Sequences**
- Create multi-step campaigns
- Set delays between steps
- Auto-enroll by keyword
- View enrollments
- Track completion

### **Tab 3: Leads**
- Pipeline view (kanban)
- List view (table)
- Add/edit/delete leads
- Quick status change
- Search & filter
- **Export CSV** 🆕
- **Filter by tags** 🆕
- **Filter by opt-out status** 🆕

### **Tab 4: Broadcasts** 🆕
- Schedule mass DMs
- Set date & time
- Target by tags
- Target by status
- View scheduled/sent/cancelled
- Cancel pending broadcasts

### **Tab 5: Webhooks** 🆕
- Add webhook URLs
- Select trigger events
- Test webhooks
- View fire count
- Toggle active/inactive

### **Tab 6: Tracking** 🆕
- Generate tracking links
- Copy short URLs
- View click counts
- Total clicks dashboard
- Label links

### **Tab 7: Custom Fields** 🆕
- Define custom fields
- Choose field type
- Delete fields
- View all fields

### **Tab 8: Send DM**
- Send individual DMs
- Use quick reply templates
- View connection status
- Character counter

### **Tab 9: Templates**
- Create quick replies
- Copy templates
- Delete templates
- AI refinement

### **Tab 10: Settings** 🆕
- **Welcome DM config**
- **Instagram connection**
- **CSV export**

---

## 🎯 LEAD DETAIL DIALOG

When you click on any lead, you get:

### **Section 1: Quick Status Change**
- Click any status badge to change
- Visual color-coded buttons

### **Section 2: Tags** 🆕
- Add new tags
- Remove tags
- Quick-add from existing
- Visual tag badges

### **Section 3: AI Lead Score** 🆕
- Click "Score Lead"
- View score (1-10)
- Read reasoning
- Priority badge
- Re-score anytime

### **Section 4: Subscription Status** 🆕
- Toggle opt-out
- Visual status indicator
- Auto-exclude from broadcasts

### **Section 5: Custom Fields** 🆕
- Edit custom field values
- Different input types
- Save changes

---

## ⚡ QUICK ACTIONS

### **Schedule a Broadcast:**
1. Go to Broadcasts tab
2. Click "Schedule Broadcast"
3. Fill form
4. Click "Schedule Broadcast"

### **Tag a Lead:**
1. Open lead
2. Scroll to Tags
3. Type tag name
4. Click "Add"

### **Set Up Webhook:**
1. Go to Webhooks tab
2. Click "Add Webhook"
3. Enter URL
4. Select event
5. Click "Create Webhook"

### **Generate Tracking Link:**
1. Go to Tracking tab
2. Click "Create Link"
3. Enter URL
4. Click "Create Link"
5. Copy tracking URL

### **Create Custom Field:**
1. Go to Custom Fields tab
2. Click "Add Field"
3. Enter label
4. Select type
5. Click "Create Field"

### **Score a Lead:**
1. Open lead
2. Scroll to AI Lead Score
3. Click "Score Lead"
4. View results

### **Configure Welcome DM:**
1. Go to Settings tab
2. Toggle "Enable Welcome DM"
3. Set delay
4. Write message
5. Click "Save"

### **Opt Out a Lead:**
1. Open lead
2. Scroll to Subscription Status
3. Toggle switch

### **Export Leads:**
1. Go to Leads tab
2. Click "Export CSV"
3. Download file

---

## 🔍 FILTERS & SEARCH

### **Available Filters:**
- **Search:** Name or Instagram handle
- **Status:** All, New, Hot, Warm, Cold, Converted, Lost
- **Tags:** Filter by specific tag 🆕
- **Opt-Out:** All, Subscribed, Opted Out 🆕

### **How to Use:**
1. Go to Leads tab
2. Use search box for text search
3. Use dropdowns for filters
4. Combine multiple filters

---

## 🎨 BADGES & INDICATORS

### **Status Badges:**
- 🆕 New (gray)
- 🔥 Hot (red)
- 🌡️ Warm (amber)
- ❄️ Cold (blue)
- ✅ Converted (green)
- ❌ Lost (muted)

### **Opt-Out Badge:** 🆕
- 🚫 Opted Out (red)

### **AI Score Badge:** 🆕
- ⭐ 8-10 (green) - High Priority
- ⭐ 5-7 (amber) - Medium Priority
- ⭐ 1-4 (red) - Low Priority

### **Tag Badges:** 🆕
- # Tag name (secondary)

---

## 🔗 WEBHOOK EVENTS

Available trigger events:
1. **lead_created** - New lead added
2. **lead_updated** - Lead modified
3. **status_changed** - Status changed
4. **tag_added** - Tag added
5. **opted_out** - Lead opted out
6. **trigger_fired** - Auto-reply triggered
7. **sequence_enrolled** - Enrolled in sequence
8. **sequence_completed** - Completed sequence

---

## 📝 CUSTOM FIELD TYPES

1. **Text** - Free text input
2. **Number** - Numeric values
3. **Date** - Date picker
4. **Yes/No** - Boolean toggle

---

## 💬 MESSAGE VARIABLES

Use in Welcome DM and broadcasts:
- `{{first_name}}` - First name
- `{{last_name}}` - Last name
- `{{name}}` - Full name
- `{{instagram}}` - @handle
- `{{email}}` - Email (if set)
- `{{phone}}` - Phone (if set)

---

## 🎯 BEST PRACTICES

### **Broadcasts:**
- Schedule during peak hours
- Target specific segments
- Use clear CTAs
- Include tracking links

### **Tagging:**
- Use consistent naming
- Create tags for segments
- Tag by interest/behavior
- Use for targeting

### **Webhooks:**
- Test before activating
- Monitor fire counts
- Use for CRM sync
- Connect to Zapier/Make

### **Click Tracking:**
- Label all links
- Track different campaigns
- Monitor click rates
- Use in broadcasts

### **Custom Fields:**
- Keep fields relevant
- Use appropriate types
- Don't over-complicate
- Update regularly

### **AI Scoring:**
- Score new leads
- Re-score periodically
- Prioritize high scores
- Review reasoning

### **Welcome DM:**
- Keep it friendly
- Use variables
- Set appropriate delay
- Test message

### **Opt-Out:**
- Respect opt-outs
- Make it easy
- Auto-exclude from broadcasts
- Stay compliant

---

## 🚨 IMPORTANT NOTES

### **Instagram Policy:**
- Can only DM users who messaged you first
- 24-hour messaging window
- Requires instagram_manage_messages permission

### **Token Expiry:**
- Instagram tokens expire in ~60 days
- Reconnect in Settings tab
- Check connection status

### **Broadcasts:**
- Opted-out leads auto-excluded
- Requires Instagram connection
- Check recipient count before sending

### **Data Export:**
- Includes all lead data
- Includes tags
- Includes custom fields
- Timestamped filename

---

## 📞 SUPPORT

If something doesn't work:
1. Check Instagram connection
2. Check browser console for errors
3. Verify backend is running
4. Check API endpoints
5. Review error messages

---

## 🎉 YOU'RE ALL SET!

**Everything is ready to use. Start automating! 🚀**
