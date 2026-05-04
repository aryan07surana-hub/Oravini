import { NextRequest, NextResponse } from "next/server";

type WhopWebhookEvent = {
  action: "payment.succeeded" | "subscription.created" | "subscription.cancelled";
  data: {
    user_id: string;
    email: string;
    plan_id: string;
    addons?: string[];
  };
};

export async function POST(request: NextRequest) {
  try {
    const event = (await request.json()) as WhopWebhookEvent;

    // Verify webhook signature (implement your Whop webhook secret verification)
    const signature = request.headers.get("x-whop-signature");
    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 401 });
    }

    // Handle different webhook events
    switch (event.action) {
      case "payment.succeeded":
      case "subscription.created":
        await handleSubscriptionCreated(event.data);
        break;
      case "subscription.cancelled":
        await handleSubscriptionCancelled(event.data);
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function handleSubscriptionCreated(data: WhopWebhookEvent["data"]) {
  const hasVideoMarketing = data.addons?.includes("addon_videomarketing") || false;

  let tier = "tier1";
  let autoGrantVideoMarketing = false;
  let aiCreditsTotal = 20;

  if (data.plan_id.includes("free")) {
    tier = "tier1";
    aiCreditsTotal = 20;
  } else if (data.plan_id.includes("starter")) {
    tier = "tier2";
    aiCreditsTotal = 100;
  } else if (data.plan_id.includes("professional")) {
    tier = "tier3";
    aiCreditsTotal = 250;
  } else if (data.plan_id.includes("business")) {
    tier = "tier4";
    aiCreditsTotal = 500;
    autoGrantVideoMarketing = true;
  } else if (data.plan_id.includes("enterprise")) {
    tier = "tier5";
    aiCreditsTotal = 9999;
    autoGrantVideoMarketing = true;
  }

  const finalHasVideoMarketing = hasVideoMarketing || autoGrantVideoMarketing;
  const resetDate = new Date();
  resetDate.setMonth(resetDate.getMonth() + 1);

  console.log("Creating/updating user:", {
    userId: data.user_id,
    email: data.email,
    tier,
    hasVideoMarketing: finalHasVideoMarketing,
    aiCreditsTotal,
    aiCreditsRemaining: aiCreditsTotal,
  });

  // TODO: Update Prisma database
  // await prisma.user.upsert({
  //   where: { email: data.email },
  //   update: { 
  //     tier, 
  //     hasVideoMarketing: finalHasVideoMarketing,
  //     aiCreditsTotal,
  //     aiCreditsRemaining: aiCreditsTotal,
  //     creditsResetDate: resetDate
  //   },
  //   create: { 
  //     email: data.email, 
  //     tier, 
  //     hasVideoMarketing: finalHasVideoMarketing,
  //     aiCreditsTotal,
  //     aiCreditsRemaining: aiCreditsTotal,
  //     creditsResetDate: resetDate
  //   }
  // });
}

async function handleSubscriptionCancelled(data: WhopWebhookEvent["data"]) {
  console.log("Cancelling subscription for:", data.user_id);

  // TODO: Update Prisma database
  // await prisma.user.update({
  //   where: { email: data.email },
  //   data: { tier: "tier1", hasVideoMarketing: false }
  // });
}
