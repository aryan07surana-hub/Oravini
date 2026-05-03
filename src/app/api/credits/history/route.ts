import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // TODO: Get actual user ID from session/auth
    const userId = "user_123";

    const transactions = await prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: 50,
    });

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        id: t.id,
        action: t.action,
        creditsUsed: t.creditsUsed,
        timestamp: t.timestamp,
      })),
    });
  } catch (error) {
    console.error("Error fetching credit history:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
