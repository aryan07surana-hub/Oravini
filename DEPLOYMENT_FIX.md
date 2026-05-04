# 🚨 URGENT: Fix Your Oravini.com Deployment

## The Problem
Your site is crashing because **DATABASE_URL is missing** on Render. The server can't connect to a database.

## Quick Fix (5 minutes)

### Step 1: Create a PostgreSQL Database on Render

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Fill in:
   - **Name**: `oravini-db`
   - **Database**: `oravini`
   - **User**: `oravini`
   - **Region**: Same as your web service (probably Oregon)
   - **Plan**: Free (or paid if you need more)
4. Click **"Create Database"**
5. Wait 2-3 minutes for it to provision
6. Once ready, click on the database
7. Scroll down and **COPY** the "External Database URL" (starts with `postgresql://`)

### Step 2: Add Environment Variables to Your Web Service

1. Go back to https://dashboard.render.com
2. Click on your **"oravini"** web service
3. Go to **"Environment"** tab
4. Click **"Add Environment Variable"** and add these ONE BY ONE:

```
Key: DATABASE_URL
Value: <paste the External Database URL you copied>

Key: SESSION_SECRET
Value: oravini-super-secret-key-2024-production-xyz

Key: NODE_ENV
Value: production

Key: APP_URL
Value: https://oravini.com

Key: PORT
Value: 10000
```

### Step 3: Optional - Add OAuth Keys (if you use Google login)

If you have Google OAuth set up:
```
Key: GOOGLE_CLIENT_ID
Value: <your-google-client-id>

Key: GOOGLE_CLIENT_SECRET
Value: <your-google-client-secret>
```

### Step 4: Save and Deploy

1. Click **"Save Changes"**
2. Render will automatically redeploy (takes 2-3 minutes)
3. Watch the logs - you should see "Brandverse portal serving on port 10000"
4. Visit https://oravini.com - IT SHOULD WORK NOW! 🎉

---

## If It Still Doesn't Work

Check the logs:
1. Go to your web service on Render
2. Click **"Logs"** tab
3. Look for errors
4. Common issues:
   - Database connection timeout → Check DATABASE_URL is correct
   - Port already in use → Render handles this automatically
   - Build failed → Check the build logs

---

## Database Migration (Important!)

Once your site is up, you need to run migrations to create all tables:

1. Go to your web service on Render
2. Click **"Shell"** tab
3. Run these commands:
```bash
npm install
npx drizzle-kit push
```

This will create all the necessary tables in your database.

---

## Need Help?

If you're still stuck:
1. Check Render logs for specific errors
2. Make sure DATABASE_URL is exactly as copied (no extra spaces)
3. Verify the database is running (green status on Render)

Your site will be live in 5 minutes if you follow these steps! 💪
