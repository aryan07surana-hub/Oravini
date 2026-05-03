import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // TODO: Get actual user ID from session/auth
    const userId = "user_123";

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        aiCreditsRemaining: true,
        aiCreditsTotal: true,
        creditsResetDate: true,
        tier: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      remaining: user.aiCreditsRemaining,
      total: user.aiCreditsTotal,
      resetDate: user.creditsResetDate,
      tier: user.tier,
      percentageUsed: Math.round(((user.aiCreditsTotal - user.aiCreditsRemaining) / user.aiCreditsTotal) * 100),
    });
  } catch (error) {
    console.error("Error fetching credits:", error);
    return NextResponse.json({ error: "Failed to fetch credits" }, { status: 500 });
  }
}
