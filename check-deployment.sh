#!/bin/bash

echo "=== Oravini Deployment Diagnostics ==="
echo ""

echo "1. Checking if site is reachable..."
curl -I https://oravini.com 2>&1 | head -5
echo ""

echo "2. Checking DNS resolution..."
nslookup oravini.com 2>&1 | grep -A2 "Name:"
echo ""

echo "3. Testing build locally..."
cd /Users/aryansurana/Oravini
npm run build 2>&1 | tail -20
echo ""

echo "=== Diagnostics Complete ==="
echo ""
echo "Common fixes:"
echo "- If DNS fails: Check your domain registrar settings"
echo "- If build fails: Check the error above and fix dependencies"
echo "- If site returns 503/502: Check Render dashboard for deployment status"
echo "- Missing env vars: Add DATABASE_URL, SESSION_SECRET, GOOGLE_CLIENT_ID, etc. in Render"
