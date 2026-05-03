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

  let tier = "free";
  if (data.plan_id.includes("starter")) tier = "tier1";
  if (data.plan_id.includes("professional")) tier = "tier2";
  if (data.plan_id.includes("business")) tier = "tier3";
  if (data.plan_id.includes("enterprise")) tier = "tier4";

  // Update user in database (replace with actual DB logic)
  console.log("Creating/updating user:", {
    userId: data.user_id,
    email: data.email,
    tier,
    hasVideoMarketing,
  });

  // TODO: Update Prisma database
  // await prisma.user.upsert({
  //   where: { email: data.email },
  //   update: { tier, hasVideoMarketing },
  //   create: { email: data.email, tier, hasVideoMarketing }
  // });
}

async function handleSubscriptionCancelled(data: WhopWebhookEvent["data"]) {
  // Downgrade user to free tier
  console.log("Cancelling subscription for:", data.user_id);

  // TODO: Update Prisma database
  // await prisma.user.update({
  //   where: { email: data.email },
  //   data: { tier: "free", hasVideoMarketing: false }
  // });
}
