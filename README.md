# DayMap AI - Video Marketing Platform

Complete AI-powered day planner with integrated video marketing platform.

## Features

### Core Features
- ✅ AI Day Planner with voice input
- ✅ Smart scheduling with fixed events and tasks
- ✅ OpenAI-powered parsing and planning

### Video Marketing Platform
- ✅ Public landing page (`/video-marketing`)
- ✅ Tier-based access control (Free, Pro, Enterprise)
- ✅ Video marketing add-on for Business & Enterprise tiers
- ✅ Live preview of webinar, video hosting, and video marketing platforms
- ✅ Whop checkout integration
- ✅ Feature gates based on user tier and `hasVideoMarketing` flag

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
# Copy environment variables
cp .env.local.example .env.local

# Edit .env.local and add your DATABASE_URL

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

### 3. Configure Whop
Add your Whop checkout URLs to `.env.local`:
- `NEXT_PUBLIC_WHOP_TIER1_URL`
- `NEXT_PUBLIC_WHOP_TIER2_URL`
- `NEXT_PUBLIC_WHOP_TIER3_URL`
- `NEXT_PUBLIC_WHOP_TIER4_URL`
- `NEXT_PUBLIC_WHOP_VIDEO_ADDON_URL`
- `WHOP_WEBHOOK_SECRET`

### 4. Run Development Server
```bash
npm run dev
```

## Routes

- `/` - AI Day Planner
- `/video-marketing` - Video Marketing Landing Page
- `/video-marketing/platform` - Video Marketing Platform (gated)
- `/pricing` - Pricing with tier selection and video marketing add-on
- `/api/webhooks/whop` - Whop webhook handler

## Database Schema

```prisma
model User {
  id                String   @id @default(cuid())
  email             String   @unique
  name              String?
  tier              String   @default("free") // free, pro, enterprise
  hasVideoMarketing Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

## Access Control

### Video Marketing Access
- **Can See**: Everyone (public landing page)
- **Can Use**: Users with `hasVideoMarketing = true` AND (`tier = "pro"` OR `tier = "enterprise"`)

### Tier Availability
- **Tier 1 (Starter)**: $29/mo - No video marketing
- **Tier 2 (Professional)**: $79/mo - No video marketing
- **Tier 3 (Business)**: $149/mo - Can add video marketing (+$99/mo)
- **Tier 4 (Enterprise)**: $299/mo - Can add video marketing (+$99/mo)

## Whop Integration

### Webhook Events
The app handles these Whop webhook events:
- `payment.succeeded`
- `subscription.created`
- `subscription.cancelled`

### Checkout Flow
1. User selects tier on `/pricing`
2. User toggles video marketing add-on (if tier 3 or 4)
3. User clicks "Proceed to Whop Checkout"
4. Redirected to Whop checkout page
5. After payment, Whop sends webhook to `/api/webhooks/whop`
6. User record created/updated with tier and `hasVideoMarketing` flag

## Live Preview Feature

On the pricing page, users can preview:
- **Webinar Platform**: Live streaming, chat, Q&A
- **Video Hosting**: Video library, custom player, analytics
- **Video Marketing**: AI generation, campaign analytics, publishing

## Environment Variables

```env
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL="postgresql://user:password@localhost:5432/daymap?schema=public"
WHOP_API_KEY=your_whop_api_key_here
WHOP_WEBHOOK_SECRET=your_whop_webhook_secret_here
NEXT_PUBLIC_WHOP_TIER1_URL=https://whop.com/checkout/plan_starter123
NEXT_PUBLIC_WHOP_TIER2_URL=https://whop.com/checkout/plan_professional456
NEXT_PUBLIC_WHOP_TIER3_URL=https://whop.com/checkout/plan_business789
NEXT_PUBLIC_WHOP_TIER4_URL=https://whop.com/checkout/plan_enterprise999
NEXT_PUBLIC_WHOP_VIDEO_ADDON_URL=https://whop.com/checkout/addon_videomarketing
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Tech Stack

- **Framework**: Next.js 16
- **Database**: PostgreSQL + Prisma
- **Payments**: Whop
- **AI**: OpenAI
- **Language**: TypeScript
- **Styling**: CSS Modules
