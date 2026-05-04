# Social Account Connection Setup

This document explains how to set up OAuth for Instagram, Facebook, LinkedIn, and X/Twitter on the Oravini platform.

## Overview

Users can now connect their social media accounts directly from the dashboard. The system supports:
- **Instagram** (via Meta/Facebook OAuth)
- **Facebook** (via Meta/Facebook OAuth)
- **LinkedIn**
- **X/Twitter**
- **YouTube** (already implemented)

## Database Migration

Run the migration to add the `meta_tokens` table and remove the old `canva_tokens` table:

```bash
psql $DATABASE_URL -f migrations/add_meta_tokens.sql
```

## Environment Variables

Add these to your `.env` file:

```bash
# Meta (Instagram/Facebook) OAuth
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret

# Alternative names (also supported)
FACEBOOK_APP_ID=your_meta_app_id
FACEBOOK_APP_SECRET=your_meta_app_secret

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# Twitter/X OAuth
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
```

## OAuth App Setup

### 1. Meta (Instagram/Facebook)

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app or use existing
3. Add **Facebook Login** product
4. Add **Instagram Basic Display** or **Instagram Graph API** product
5. Configure OAuth redirect URI: `https://yourdomain.com/api/oauth/meta/callback`
6. Required permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
   - `instagram_manage_messages`
7. Copy App ID and App Secret to `.env`

### 2. LinkedIn

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create a new app
3. Add **Sign In with LinkedIn** product
4. Configure OAuth redirect URI: `https://yourdomain.com/api/oauth/linkedin/callback`
5. Required permissions:
   - `openid`
   - `profile`
   - `email`
   - `w_member_social`
6. Copy Client ID and Client Secret to `.env`

### 3. X/Twitter

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app (requires paid API access for new apps)
3. Enable OAuth 2.0
4. Configure OAuth redirect URI: `https://yourdomain.com/api/oauth/twitter/callback`
5. Required scopes:
   - `tweet.read`
   - `tweet.write`
   - `users.read`
   - `offline.access`
6. Copy Client ID and Client Secret to `.env`

## How It Works

### User Flow

1. User clicks "Connect" button on dashboard
2. Redirected to OAuth provider (Instagram/Facebook/LinkedIn/Twitter)
3. User authorizes the app
4. Provider redirects back to callback URL with authorization code
5. Backend exchanges code for access token
6. Token saved to database
7. User redirected back to dashboard with success message

### Disconnect Flow

1. User clicks "Disconnect" button
2. Frontend calls disconnect API endpoint
3. Backend deletes token from database
4. Dashboard refreshes to show disconnected state

## API Endpoints

### Meta (Instagram/Facebook)
- `GET /api/oauth/meta/connect` - Initiate OAuth flow
- `GET /api/oauth/meta/callback` - OAuth callback handler
- `POST /api/oauth/meta/disconnect` - Disconnect account
- `GET /api/oauth/meta/status` - Check connection status

### LinkedIn
- `GET /api/oauth/linkedin/connect` - Initiate OAuth flow
- `GET /api/oauth/linkedin/callback` - OAuth callback handler
- `POST /api/oauth/linkedin/disconnect` - Disconnect account

### Twitter
- `GET /api/oauth/twitter/connect` - Initiate OAuth flow
- `GET /api/oauth/twitter/callback` - OAuth callback handler
- `POST /api/oauth/twitter/disconnect` - Disconnect account

## Dashboard Component

The `ConnectedPlatforms` component on the dashboard shows:
- Connection status for each platform
- Username/handle when connected
- Connect/Disconnect buttons
- Visual indicators (colored dots, borders)

## Privacy & Security

- All OAuth tokens are stored securely in the database
- Tokens are encrypted in transit (HTTPS)
- Users can disconnect at any time
- Privacy policy updated to explicitly state we never sell, share, or leak user data
- All social account connections are covered under the privacy policy

## Testing

1. Start the server: `npm run dev`
2. Navigate to dashboard
3. Click "Connect" on any platform
4. Complete OAuth flow
5. Verify connection shows as active
6. Test disconnect functionality

## Troubleshooting

**OAuth callback fails:**
- Check that redirect URI matches exactly in OAuth app settings
- Verify environment variables are set correctly
- Check that APP_URL is set correctly in `.env`

**Token not saving:**
- Check database connection
- Verify migration ran successfully
- Check server logs for errors

**Connection shows as disconnected:**
- Token may have expired
- Check token expiry in database
- User may need to reconnect

## Notes

- Canva integration has been removed
- Meta OAuth handles both Instagram and Facebook
- Twitter OAuth requires paid API access for new apps
- YouTube OAuth was already implemented and remains unchanged
