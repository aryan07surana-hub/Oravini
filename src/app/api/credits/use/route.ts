import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { action, creditsNeeded } = await request.json();

    // TODO: Get actual user ID from session/auth
    const userId = "user_123";

    // Get current user credits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { aiCreditsRemaining: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has enough credits
    if (user.aiCreditsRemaining < creditsNeeded) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient credits",
          remaining: user.aiCreditsRemaining,
          needed: creditsNeeded,
        },
        { status: 400 }
      );
    }

    // Deduct credits and create transaction
    const [updatedUser, transaction] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          aiCreditsRemaining: {
            decrement: creditsNeeded,
          },
        },
      }),
      prisma.creditTransaction.create({
        data: {
          userId,
          action,
          creditsUsed: creditsNeeded,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      remaining: updatedUser.aiCreditsRemaining,
      transaction: {
        id: transaction.id,
        action: transaction.action,
        creditsUsed: transaction.creditsUsed,
        timestamp: transaction.timestamp,
      },
    });
  } catch (error) {
    console.error("Error using credits:", error);
    return NextResponse.json({ error: "Failed to use credits" }, { status: 500 });
  }
}
