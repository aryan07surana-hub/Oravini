# 🔧 Video Editor Troubleshooting Guide

## 🚨 Common Issues & Solutions

### Issue 1: "Captions don't appear when I upload a video"

**Root Cause:** Missing API keys or authentication issue

**Solutions:**

1. **Check API Keys:**
   ```bash
   # Open .env file
   cat .env | grep GROQ_API_KEY
   ```
   - Should show: `GROQ_API_KEY=gsk_xxxxx`
   - If commented out (starts with #), uncomment it
   - If missing, add it from https://console.groq.com/

2. **Restart Server:**
   ```bash
   # Stop server (Ctrl+C)
   # Start again
   npm run dev
   ```

3. **Check Browser Console:**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for errors like "401 Unauthorized" or "GROQ_API_KEY not configured"

4. **Verify Authentication:**
   - Make sure you're logged in
   - Try logging out and back in
   - Clear cookies and try again

---

### Issue 2: "Video upload fails"

**Possible Causes:**

**A. File too large (> 25MB)**
```
Error: "File too large for Whisper"
Solution: Compress video first or update UI to show 25MB limit
```

**B. Unsupported format**
```
Supported: MP4, MOV, WebM, AVI, MKV, M4V
Solution: Convert to MP4 using ffmpeg:
ffmpeg -i input.avi -c:v libx264 -c:a aac output.mp4
```

**C. Upload directory doesn't exist**
```bash
# Create uploads directory
mkdir -p /Users/aryansurana/Oravini/server/uploads
chmod 755 /Users/aryansurana/Oravini/server/uploads
```

**D. Disk space full**
```bash
# Check disk space
df -h
# Clean up old uploads if needed
find /Users/aryansurana/Oravini/server/uploads -mtime +7 -delete
```

---

### Issue 3: "Transcription stuck at 'Processing...'"

**Diagnosis:**

1. **Check server logs:**
   ```bash
   # In terminal where server is running
   # Look for "[video-studio] transcription error"
   ```

2. **Common errors:**

   **A. Groq API rate limit:**
   ```
   Error: "429 Too Many Requests"
   Solution: Wait 1 minute and try again
   Free tier: 14,400 requests/day
   ```

   **B. Video has no audio:**
   ```
   Error: "No audio stream found"
   Solution: Video must have audio track for transcription
   ```

   **C. Groq API key invalid:**
   ```
   Error: "401 Unauthorized"
   Solution: Verify key at https://console.groq.com/keys
   ```

3. **Manual retry:**
   - Refresh the page
   - Re-upload the video
   - Try a different video to isolate the issue

---

### Issue 4: "Caption generation returns empty results"

**Debugging Steps:**

1. **Check request payload:**
   ```javascript
   // Open DevTools → Network tab
   // Find POST to /api/video/generate-captions
   // Check Request Payload:
   {
     "script": "...",  // Should not be empty
     "title": "...",
     "duration": 30
   }
   ```

2. **Check response:**
   ```javascript
   // Should return:
   {
     "segments": [
       {
         "id": 1,
         "startSec": 0,
         "endSec": 3,
         "original": "...",
         "engaging": "...",
         "viral": "...",
         "punchy": "..."
       }
     ]
   }
   ```

3. **Common issues:**
   - Script is empty or too short
   - Groq API returned invalid JSON
   - LLM model is down (check https://status.groq.com/)

4. **Test endpoint directly:**
   ```bash
   curl -X POST http://localhost:5001/api/video/generate-captions \
     -H "Content-Type: application/json" \
     -H "Cookie: connect.sid=your-session-cookie" \
     -d '{
       "script": "Hey everyone! Today I am showing you something amazing.",
       "title": "Test Video",
       "duration": 10
     }'
   ```

---

### Issue 5: "Rendering fails or takes forever"

**Possible Causes:**

**A. Shotstack API key missing:**
```bash
# Check .env
grep SHOTSTACK_API_KEY .env

# Should show:
SHOTSTACK_API_KEY=xxxxx

# If missing, add from https://dashboard.shotstack.io/
```

**B. Shotstack sandbox limit reached:**
```
Free tier: 20 renders/month
Solution: Upgrade to paid plan or wait for next month
Check usage: https://dashboard.shotstack.io/
```

**C. Invalid video URL:**
```
Error: "Unable to download source"
Solution: Video URL must be publicly accessible
Check: Can you access the video URL in browser?
```

**D. Render stuck in queue:**
```bash
# Check render status
curl -X GET https://api.shotstack.io/v1/render/{renderId} \
  -H "x-api-key: your_shotstack_key"

# Possible statuses:
# - queued: Waiting in queue
# - rendering: In progress (2-5 min)
# - done: Complete
# - failed: Error occurred
```

**E. Timeout:**
```
If rendering takes > 10 minutes:
1. Check Shotstack dashboard for errors
2. Try a shorter video
3. Simplify effects (remove color grading, etc.)
```

---

### Issue 6: "Silence removal doesn't work"

**Diagnosis:**

1. **Check silence detection:**
   ```javascript
   // After transcription, check edit object:
   {
     "silences": [
       { "start": 5.2, "end": 7.8 },
       { "start": 12.1, "end": 14.5 }
     ]
   }
   ```

2. **If silences array is empty:**
   - Video might not have any silence > 0.5 seconds
   - Transcription might have failed
   - Word timestamps might be missing

3. **Check Shotstack timeline:**
   ```javascript
   // In buildShotstackTimeline function
   // Should have clips with adjusted start times
   ```

4. **Manual verification:**
   - Download rendered video
   - Check if silent parts are actually removed
   - Compare duration: original vs rendered

---

### Issue 7: "Captions don't sync with audio"

**Root Cause:** Word-level timestamps are off

**Solutions:**

1. **Check transcript quality:**
   ```javascript
   // After transcription, inspect words array:
   {
     "words": [
       { "word": "Hey", "start": 0.0, "end": 0.3 },
       { "word": "everyone", "start": 0.3, "end": 0.8 }
     ]
   }
   ```

2. **Common issues:**
   - Background music too loud
   - Multiple speakers overlapping
   - Poor audio quality
   - Accents/dialects

3. **Workarounds:**
   - Use cleaner audio
   - Manually adjust timing in VideoEditorStudio
   - Try different Whisper model (currently using whisper-large-v3)

---

### Issue 8: "B-roll images don't generate"

**Possible Causes:**

**A. Runware API key missing:**
```bash
grep RUNWARE_API_KEY .env
# Add from https://runware.ai/
```

**B. Rate limit reached:**
```
Free tier: 100 images/month
Solution: Upgrade or wait for next month
```

**C. Prompt too complex:**
```
Error: "Image generation failed"
Solution: Simplify the prompt or try different keywords
```

**D. WebSocket timeout:**
```
Error: "Runware timed out after 60s"
Solution: Try again or check Runware status
```

---

### Issue 9: "YouTube import doesn't work"

**Possible Causes:**

**A. YouTube API key missing:**
```bash
grep YOUTUBE_API_KEY .env
# Add from https://console.cloud.google.com/
```

**B. Invalid video URL:**
```
Supported formats:
- https://www.youtube.com/watch?v=VIDEO_ID
- https://youtu.be/VIDEO_ID
- https://www.youtube.com/embed/VIDEO_ID
```

**C. Video has no transcript:**
```
Error: "NO_TRANSCRIPT"
Solution: Video must have captions/subtitles enabled
```

**D. YouTube API quota exceeded:**
```
Free tier: 10,000 units/day
Each video import: ~100 units
Solution: Wait for quota reset (midnight PST)
```

---

### Issue 10: "Instagram import fails"

**Possible Causes:**

**A. Apify token missing:**
```bash
grep APIFY_TOKEN .env
# Add from https://console.apify.com/
```

**B. Instagram URL format:**
```
Supported:
- https://www.instagram.com/p/POST_ID/
- https://www.instagram.com/reel/REEL_ID/

Not supported:
- Stories
- IGTV (deprecated)
- Private accounts
```

**C. Rate limiting:**
```
Instagram has strict rate limits
Solution: Wait 5-10 minutes between imports
```

---

## 🔍 Debugging Checklist

When something doesn't work, go through this checklist:

### 1. Environment Variables
```bash
# Check all required keys are set
cat .env | grep -E "GROQ|SHOTSTACK|RUNWARE|YOUTUBE"
```

### 2. Server Logs
```bash
# Watch logs in real-time
tail -f /path/to/server.log

# Or check terminal where server is running
# Look for errors in red
```

### 3. Browser Console
```
F12 → Console tab
Look for:
- 401 Unauthorized (auth issue)
- 500 Internal Server Error (server issue)
- Network errors (API down)
```

### 4. Network Tab
```
F12 → Network tab
Filter: XHR
Check:
- Request payload (is data correct?)
- Response (what error is returned?)
- Status code (200 = success, 4xx = client error, 5xx = server error)
```

### 5. Database
```bash
# Check if video edit was created
psql -d aryansurana -c "SELECT * FROM video_edits ORDER BY created_at DESC LIMIT 5;"
```

### 6. File System
```bash
# Check if video was uploaded
ls -lh /Users/aryansurana/Oravini/server/uploads/

# Check file permissions
ls -la /Users/aryansurana/Oravini/server/uploads/
```

---

## 🆘 Emergency Fixes

### Nuclear Option 1: Restart Everything
```bash
# Stop server (Ctrl+C)
# Clear node modules
rm -rf node_modules
npm install

# Restart database
brew services restart postgresql

# Start server
npm run dev
```

### Nuclear Option 2: Clear All Data
```bash
# WARNING: This deletes all video edits
psql -d aryansurana -c "TRUNCATE video_edits CASCADE;"

# Clear uploads
rm -rf /Users/aryansurana/Oravini/server/uploads/*
```

### Nuclear Option 3: Check Service Status
```bash
# Check if external APIs are down
curl https://api.groq.com/openai/v1/models
curl https://api.shotstack.io/v1/
curl https://api.runware.ai/

# Check status pages
# Groq: https://status.groq.com/
# Shotstack: https://status.shotstack.io/
```

---

## 📞 Getting Help

### 1. Check Documentation
- Groq: https://console.groq.com/docs
- Shotstack: https://shotstack.io/docs/
- Runware: https://docs.runware.ai/

### 2. Search Issues
- GitHub Issues (if open source)
- Stack Overflow
- Discord/Slack communities

### 3. Contact Support
- Groq: support@groq.com
- Shotstack: support@shotstack.io
- Runware: support@runware.ai

### 4. Debug Mode
```bash
# Enable verbose logging
NODE_ENV=development DEBUG=* npm run dev
```

---

## 📊 Performance Optimization

### If things are slow:

**1. Database queries:**
```sql
-- Add indexes
CREATE INDEX idx_video_edits_user_id ON video_edits(user_id);
CREATE INDEX idx_video_edits_status ON video_edits(status);
```

**2. File uploads:**
```javascript
// Compress videos before upload
// Use ffmpeg to reduce file size
ffmpeg -i input.mp4 -vcodec h264 -acodec aac -b:v 1M output.mp4
```

**3. API calls:**
```javascript
// Cache template suggestions
// Cache B-roll library
// Use Redis for session storage
```

**4. Rendering:**
```javascript
// Use Shotstack's "fast" render mode
// Reduce video resolution if not needed
// Simplify effects
```

---

## ✅ Health Check Script

Create this script to verify everything is working:

```bash
#!/bin/bash
# health-check.sh

echo "🏥 Running health checks..."

# 1. Check server
if curl -s http://localhost:5001/api/health > /dev/null; then
  echo "✅ Server is running"
else
  echo "❌ Server is down"
fi

# 2. Check database
if psql -d aryansurana -c "SELECT 1" > /dev/null 2>&1; then
  echo "✅ Database is connected"
else
  echo "❌ Database is down"
fi

# 3. Check API keys
if grep -q "^GROQ_API_KEY=gsk_" .env; then
  echo "✅ Groq API key is set"
else
  echo "❌ Groq API key is missing"
fi

if grep -q "^SHOTSTACK_API_KEY=" .env; then
  echo "✅ Shotstack API key is set"
else
  echo "❌ Shotstack API key is missing"
fi

# 4. Check uploads directory
if [ -d "server/uploads" ]; then
  echo "✅ Uploads directory exists"
else
  echo "❌ Uploads directory missing"
  mkdir -p server/uploads
fi

# 5. Check disk space
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 90 ]; then
  echo "✅ Disk space OK ($DISK_USAGE% used)"
else
  echo "⚠️  Disk space low ($DISK_USAGE% used)"
fi

echo ""
echo "Health check complete!"
```

---

## 🎯 Quick Fixes Summary

| Issue | Quick Fix |
|-------|-----------|
| Captions don't appear | Add GROQ_API_KEY to .env |
| Upload fails | Check file size < 25MB |
| Transcription stuck | Wait 1 min, retry |
| Rendering fails | Add SHOTSTACK_API_KEY |
| Silence removal doesn't work | Check word timestamps exist |
| Captions out of sync | Use cleaner audio |
| B-roll doesn't generate | Add RUNWARE_API_KEY |
| YouTube import fails | Add YOUTUBE_API_KEY |
| Instagram import fails | Add APIFY_TOKEN |
| Everything is broken | Restart server |

---

## 🚀 You Got This!

Most issues are just missing API keys or authentication problems. Follow this guide and you'll be back up and running in minutes.

If you're still stuck, check the server logs - they usually tell you exactly what's wrong.

Good luck! 🎬
