import { storage } from "./storage";
import { hashPassword } from "./auth";

export async function seedDatabase() {
  try {
    const admins = [
      { email: "admin@brandverse.com", name: "Brandverse Admin", password: "Brandverse@2024" },
      { email: "admin1@brandverse.com", name: "Co-Founder Admin", password: "Brandverse2024" },
    ];

    for (const admin of admins) {
      const hashed = await hashPassword(admin.password);
      const existing = await storage.getUserByEmail(admin.email);
      if (existing) {
        await storage.updateUser(existing.id, { password: hashed, role: "admin" });
        console.log(`[seed] Admin password synced: ${admin.email}`);
      } else {
        await storage.createUser({
          email: admin.email,
          password: hashed,
          name: admin.name,
          role: "admin",
          program: "Admin",
        });
        console.log(`[seed] Admin account created: ${admin.email}`);
      }
    }
  } catch (err) {
    console.error("[seed] Error seeding database:", err);
  }
}
