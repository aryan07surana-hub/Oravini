import { NextResponse } from "next/server";

export async function GET() {
  // Mock user - replace with actual auth
  // Example: Tier 4 user with video marketing
  const user = {
    id: "user_123",
    email: "demo@example.com",
    tier: "tier4",
    hasVideoMarketing: true,
  };

  return NextResponse.json({ user });
}
