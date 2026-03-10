import { storage } from "./storage";
import { hashPassword } from "./auth";

export async function seedDatabase() {
  try {
    const existing = await storage.getUserByEmail("admin@brandverse.com");
    if (existing) return;

    const adminPassword = await hashPassword("Brandverse@2024");
    await storage.createUser({
      email: "admin@brandverse.com",
      password: adminPassword,
      name: "Brandverse Admin",
      role: "admin",
      program: "Admin",
    });

    console.log("[seed] Admin account created successfully");
  } catch (err) {
    console.error("[seed] Error seeding database:", err);
  }
}
