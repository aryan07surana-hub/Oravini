import { NextResponse } from "next/server";

export async function GET() {
  // Mock user - replace with actual auth
  const user = {
    id: "user_123",
    email: "demo@example.com",
    tier: "pro",
    hasVideoMarketing: true,
  };

  return NextResponse.json({ user });
}
