# 🔑 Quick Setup Guide - Get Your API Keys in 15 Minutes

## Step 1: Groq API (FREE - Most Important)

**What it does:** AI transcription (Whisper) + Caption generation (LLM)

1. Go to: https://console.groq.com/
2. Sign up with Google/GitHub
3. Click "API Keys" in sidebar
4. Click "Create API Key"
5. Copy the key (starts with `gsk_`)
6. Add to `.env`:
   ```bash
   GROQ_API_KEY=gsk_your_key_here
   ```

**Free Tier:** 14,400 requests/day - More than enough for launch!

---

## Step 2: Shotstack API (FREE Trial)

**What it does:** Video rendering with captions, silence removal, effects

1. Go to: https://dashboard.shotstack.io/register
2. Sign up (no credit card required for sandbox)
3. Go to "API Keys" tab
4. Copy your key
5. Add to `.env`:
   ```bash
   SHOTSTACK_API_KEY=your_key_here
   ```

**Free Tier:** 20 renders/month in sandbox mode

---

## Step 3: Runware API (FREE Trial)

**What it does:** AI image generation for B-roll and thumbnails

1. Go to: https://runware.ai/
2. Sign up
3. Go to dashboard → API Keys
4. Create new key
5. Add to `.env`:
   ```bash
   RUNWARE_API_KEY=your_key_here
   ```

**Free Tier:** 100 images/month

---

## Step 4: YouTube API (FREE)

**What it does:** Import YouTube videos, fetch metadata

1. Go to: https://console.cloud.google.com/
2. Create new project or select existing
3. Enable "YouTube Data API v3"
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy the key
6. Add to `.env`:
   ```bash
   YOUTUBE_API_KEY=your_key_here
   ```

**Free Tier:** 10,000 quota units/day (enough for ~100 video imports)

---

## Step 5: Apify (Optional - For Instagram)

**What it does:** Instagram content scraping

1. Go to: https://console.apify.com/
2. Sign up
3. Go to "Settings" → "Integrations"
4. Copy your API token
5. Add to `.env`:
   ```bash
   APIFY_TOKEN=your_token_here
   APIFY_INSTAGRAM_TOKEN=your_token_here
   ```

**Free Tier:** $5 credit/month

---

## Step 6: Anthropic (Optional - Better AI)

**What it does:** Advanced AI features (fallback to Groq if not set)

1. Go to: https://console.anthropic.com/
2. Sign up
3. Add payment method (required)
4. Create API key
5. Add to `.env`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-your_key_here
   ```

**Pricing:** Pay-as-you-go (~$0.01 per request)

---

## Step 7: OpenRouter (Optional - Multi-Model)

**What it does:** Access to multiple AI models

1. Go to: https://openrouter.ai/
2. Sign up
3. Go to "Keys" → "Create Key"
4. Add to `.env`:
   ```bash
   OPENROUTER_API_KEY=sk-or-your_key_here
   ```

**Free Tier:** Limited free credits

---

## 🚀 Final .env Configuration

Open `/Users/aryansurana/Oravini/.env` and update:

```bash
NODE_ENV=development
PORT=5001

# Database
DATABASE_URL=postgresql://aryansurana@localhost:5432/aryansurana
SESSION_SECRET=change-me-to-a-long-random-secret

# App URL
APP_URL=http://localhost:5000

# ============================================
# REQUIRED FOR VIDEO EDITOR
# ============================================

# AI Services (REQUIRED)
GROQ_API_KEY=gsk_xxxxx                    # Get from console.groq.com
SHOTSTACK_API_KEY=xxxxx                   # Get from dashboard.shotstack.io

# Image Generation (REQUIRED for B-roll)
RUNWARE_API_KEY=xxxxx                     # Get from runware.ai

# Social Media (REQUIRED for imports)
YOUTUBE_API_KEY=xxxxx                     # Get from console.cloud.google.com

# ============================================
# OPTIONAL (But Recommended)
# ============================================

# Advanced AI
ANTHROPIC_API_KEY=sk-ant-xxxxx            # Better AI quality
OPENROUTER_API_KEY=sk-or-xxxxx            # Multi-model access

# Instagram Features
APIFY_TOKEN=xxxxx                         # Instagram scraping
APIFY_INSTAGRAM_TOKEN=xxxxx               # Instagram-specific

# Google Services
GOOGLE_API_KEY_IMAGE=xxxxx                # Image search
GOOGLE_CLIENT_ID=xxxxx                    # OAuth login
GOOGLE_CLIENT_SECRET=xxxxx                # OAuth login
```

---

## ✅ Verify Setup

Run the test script:

```bash
cd /Users/aryansurana/Oravini
./test-video-editor.sh
```

You should see:
- ✅ Server is running
- ✅ GROQ_API_KEY is set
- ✅ SHOTSTACK_API_KEY is set
- ✅ All endpoints exist

---

## 🎬 Test the Full Pipeline

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Open the app:**
   ```
   http://localhost:5000
   ```

3. **Login/Signup**

4. **Go to Video Editor**

5. **Test Caption Generation:**
   - Click "Caption Studio"
   - Enter a script: "Hey everyone! Today I'm showing you something amazing."
   - Click "Generate Captions"
   - Should see 4 variations: Original, Engaging, Viral, Punchy

6. **Test Video Upload:**
   - Go to "Video Editor Studio"
   - Upload a short video (< 25MB)
   - Wait for transcription (~30 seconds)
   - Should see word-level timestamps

7. **Test Rendering:**
   - Select caption style (Netflix/Bold/Minimal/Karaoke)
   - Enable silence removal
   - Click "Render Video"
   - Wait 2-5 minutes
   - Download final video

---

## 🚨 Troubleshooting

### "GROQ_API_KEY not configured"
- Make sure the key is uncommented in `.env`
- Restart the server after adding keys

### "Whisper error: 413"
- File is too large (> 25MB)
- Compress the video first

### "Shotstack error"
- Check if API key is valid
- Verify you're using sandbox mode for free tier

### "No transcript available"
- Video might not have audio
- Try a different video format

---

## 📊 Cost Estimate (First Month)

With free tiers:
- **Groq:** $0 (14,400 requests/day free)
- **Shotstack:** $0 (20 renders/month free)
- **Runware:** $0 (100 images/month free)
- **YouTube API:** $0 (10,000 units/day free)

**Total: $0 for first 20 videos!**

After free tier:
- Groq: ~$0.10 per video
- Shotstack: ~$0.50 per render
- Runware: ~$0.05 per image

**Estimated: $0.65 per video**

---

## 🎉 You're Ready to Launch!

Once all keys are added and tests pass:

1. Create a demo video
2. Write your announcement post
3. Share on social media
4. Monitor for feedback
5. Scale as needed

**Good luck! 🚀**
