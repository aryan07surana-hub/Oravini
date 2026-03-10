import { storage } from "./storage";
import { hashPassword } from "./auth";

export async function seedDatabase() {
  try {
    const existing = await storage.getUserByEmail("admin@brandverse.com");
    if (existing) return;

    const adminPassword = await hashPassword("Brandverse@2024");
    const admin = await storage.createUser({
      email: "admin@brandverse.com",
      password: adminPassword,
      name: "Brandverse Admin",
      role: "admin",
      program: "Admin",
    });

    const client1Password = await hashPassword("client123");
    const client1 = await storage.createUser({
      email: "sarah.johnson@gmail.com",
      password: client1Password,
      name: "Sarah Johnson",
      role: "client",
      program: "6-Month Monetization Accelerator",
      phone: "+1 (555) 234-5678",
      nextCallDate: new Date("2026-03-15T14:00:00"),
    });

    const client2Password = await hashPassword("client123");
    const client2 = await storage.createUser({
      email: "marcus.wright@gmail.com",
      password: client2Password,
      name: "Marcus Wright",
      role: "client",
      program: "90-Day Brand Builder",
      phone: "+1 (555) 345-6789",
      nextCallDate: new Date("2026-03-12T11:00:00"),
    });

    const client3Password = await hashPassword("client123");
    const client3 = await storage.createUser({
      email: "priya.sharma@gmail.com",
      password: client3Password,
      name: "Priya Sharma",
      role: "client",
      program: "6-Month Monetization Accelerator",
      phone: "+1 (555) 456-7890",
      nextCallDate: new Date("2026-03-20T16:00:00"),
    });

    await storage.upsertProgress({ clientId: client1.id, offerCreation: 75, funnelProgress: 60, contentProgress: 45, monetizationProgress: 30 });
    await storage.upsertProgress({ clientId: client2.id, offerCreation: 90, funnelProgress: 80, contentProgress: 70, monetizationProgress: 55 });
    await storage.upsertProgress({ clientId: client3.id, offerCreation: 40, funnelProgress: 25, contentProgress: 20, monetizationProgress: 10 });

    await storage.createDocument({
      clientId: client1.id,
      uploadedBy: admin.id,
      title: "Monetization Audit - March 2026",
      description: "Full audit of your current monetization strategy with recommendations",
      fileName: "monetization_audit_march.pdf",
      fileSize: "2.4 MB",
      fileType: "audit",
      fileUrl: "https://example.com/docs/audit.pdf",
      mimeType: "application/pdf",
    });

    await storage.createDocument({
      clientId: client1.id,
      uploadedBy: admin.id,
      title: "Content Strategy Blueprint",
      description: "Your personalized content strategy for Q1 2026",
      fileName: "content_strategy_q1.pdf",
      fileSize: "1.8 MB",
      fileType: "strategy",
      fileUrl: "https://example.com/docs/strategy.pdf",
      mimeType: "application/pdf",
    });

    await storage.createDocument({
      clientId: client1.id,
      uploadedBy: admin.id,
      title: "Signed Service Agreement",
      description: "Your signed contract for the 6-Month Monetization Accelerator program",
      fileName: "service_agreement.pdf",
      fileSize: "512 KB",
      fileType: "contract",
      fileUrl: "https://example.com/docs/contract.pdf",
      mimeType: "application/pdf",
    });

    await storage.createDocument({
      clientId: client2.id,
      uploadedBy: admin.id,
      title: "Brand Identity Worksheet",
      description: "Complete this worksheet to define your brand identity",
      fileName: "brand_identity_worksheet.pdf",
      fileSize: "1.1 MB",
      fileType: "worksheet",
      fileUrl: "https://example.com/docs/worksheet.pdf",
      mimeType: "application/pdf",
    });

    await storage.createDocument({
      clientId: client3.id,
      uploadedBy: admin.id,
      title: "Funnel Strategy Guide",
      description: "Your custom funnel strategy document",
      fileName: "funnel_strategy.pdf",
      fileSize: "980 KB",
      fileType: "strategy",
      fileUrl: "https://example.com/docs/funnel.pdf",
      mimeType: "application/pdf",
    });

    await storage.createCallFeedback({
      clientId: client1.id,
      title: "Week 8 Strategy Call",
      summary: "We discussed your offer positioning and reviewed the funnel metrics. Great progress on the content calendar.",
      feedbackNotes: "Sarah is making excellent progress. The offer is well-defined, need to focus on traffic now.",
      actionSteps: "1. Finalize offer page copy\n2. Launch first email sequence\n3. Post 3x this week on Instagram",
      callDate: new Date("2026-03-05T14:00:00"),
      recordingUrl: "",
    });

    await storage.createCallFeedback({
      clientId: client1.id,
      title: "Week 6 Strategy Call",
      summary: "Reviewed content performance and discussed new offer bundle ideas.",
      feedbackNotes: "The Instagram strategy is working well. Need to double down on email list building.",
      actionSteps: "1. Create lead magnet\n2. Set up email automation\n3. Record first testimonial video",
      callDate: new Date("2026-02-19T14:00:00"),
      recordingUrl: "",
    });

    await storage.createCallFeedback({
      clientId: client2.id,
      title: "Week 4 Brand Review",
      summary: "Marcus presented his brand direction and we worked on messaging clarity.",
      feedbackNotes: "Brand identity is strong. The messaging needs to be more specific to niche.",
      actionSteps: "1. Rewrite bio and pitch\n2. Design brand assets\n3. Create 10 pieces of content",
      callDate: new Date("2026-03-01T11:00:00"),
      recordingUrl: "",
    });

    await storage.createTask({ clientId: client1.id, title: "Finalize offer page copy", description: "Complete the copy for your sales page based on our call feedback", completed: false, dueDate: new Date("2026-03-14") });
    await storage.createTask({ clientId: client1.id, title: "Post 3x on Instagram this week", description: "Share Reels and carousel posts", completed: true, dueDate: new Date("2026-03-10") });
    await storage.createTask({ clientId: client1.id, title: "Record testimonial video", description: "Short 60-second testimonial video for your website", completed: false, dueDate: new Date("2026-03-20") });
    await storage.createTask({ clientId: client2.id, title: "Rewrite brand bio", description: "Create a compelling bio that speaks to your niche audience", completed: false, dueDate: new Date("2026-03-13") });
    await storage.createTask({ clientId: client2.id, title: "Complete brand identity worksheet", description: "Fill out the worksheet and send it back", completed: true, dueDate: new Date("2026-03-08") });
    await storage.createTask({ clientId: client3.id, title: "Set up your funnel tool", description: "Create a free account on the recommended platform", completed: false, dueDate: new Date("2026-03-15") });

    await storage.createMessage({ senderId: admin.id, receiverId: client1.id, content: "Hey Sarah! Great work on last week's call. Looking forward to seeing your offer page draft." });
    await storage.createMessage({ senderId: client1.id, receiverId: admin.id, content: "Thank you! I'm almost done with the copy. Should have it ready by Thursday." });
    await storage.createMessage({ senderId: admin.id, receiverId: client1.id, content: "Perfect! Don't forget to add the testimonials section we discussed." });

    await storage.createMessage({ senderId: admin.id, receiverId: client2.id, content: "Marcus, great progress on the brand identity! The direction you chose is really strong." });
    await storage.createMessage({ senderId: client2.id, receiverId: admin.id, content: "Thanks! I've been working on the content pillars you suggested. Making good progress." });

    await storage.createNotification({ clientId: client1.id, message: "New document uploaded: Monetization Audit - March 2026", type: "document" });
    await storage.createNotification({ clientId: client1.id, message: "Your next call is on March 15th at 2:00 PM", type: "reminder" });
    await storage.createNotification({ clientId: client2.id, message: "New task assigned: Rewrite brand bio", type: "task" });
    await storage.createNotification({ clientId: client3.id, message: "Welcome to Brandverse! Your portal is ready.", type: "welcome" });

    console.log("[seed] Database seeded successfully");
  } catch (err) {
    console.error("[seed] Error seeding database:", err);
  }
}
