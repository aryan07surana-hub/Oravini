import { storage } from "./storage";
import { hashPassword } from "./auth";
import { pool } from "./storage";

export async function seedSuperAdminDocs() {
  try {
    const SUPER_ID = "seed_oravini_super";
    const SOPS_ID = "seed_oravini_sops";

    await pool.query(`
      INSERT INTO super_admin_doc_files (id, name, parent_id)
      VALUES ($1, 'Oravini', NULL)
      ON CONFLICT (id) DO NOTHING
    `, [SUPER_ID]);

    await pool.query(`
      INSERT INTO super_admin_doc_files (id, name, parent_id)
      VALUES ($1, 'Oravini SOPS', $2)
      ON CONFLICT (id) DO NOTHING
    `, [SOPS_ID, SUPER_ID]);

    const LEARNINGS_ID = "seed_oravini_learnings";
    await pool.query(`
      INSERT INTO super_admin_doc_files (id, name, parent_id)
      VALUES ($1, 'Oravini Learnings', $2)
      ON CONFLICT (id) DO NOTHING
    `, [LEARNINGS_ID, SUPER_ID]);

    const learningDocs = [
      { id: "seed_learn_trad_vs_organic", name: "Oravini Traditional Marketing vs Organic Marketing", url: "https://docs.google.com/document/d/1oS8fdxChF4so59ZUvjnx5JAkNeTxOlySojgpFG40sOY/edit?usp=sharing" },
      { id: "seed_learn_offer_ladder", name: "Oravini 7 Level Offer Ladder", url: "https://docs.google.com/document/d/1KovMEhY30Zs969MveUVj48N5RBkokB6oaVv_vydfqCc/edit?usp=sharing" },
      { id: "seed_learn_funnel_types", name: "Oravini Funnel Types", url: "https://docs.google.com/document/d/1b_1dsHBmWjpQQqeAhkTvl9C4JthllyHgnwkDu3uijyk/edit?usp=sharing" },
      { id: "seed_learn_systems_ops", name: "Oravini Systems and Operations", url: "https://docs.google.com/document/d/1GY-sws12PKkQXFbmVnyoVHkNqrBTu0ELJzfPCXQ64Sk/edit?usp=sharing" },
      { id: "seed_learn_profile_funnel", name: "Oravini Intro to Profile Funnel", url: "https://docs.google.com/document/d/15BWc8I2Eeij6BBpUa5Vcb16uq8RPqsnJLDQNVm41wzc/edit?usp=sharing" },
    ];

    for (const doc of learningDocs) {
      await pool.query(`
        INSERT INTO super_admin_docs (id, file_id, name, type, url, content)
        VALUES ($1, $2, $3, 'link', $4, '')
        ON CONFLICT (id) DO NOTHING
      `, [doc.id, LEARNINGS_ID, doc.name, doc.url]);
    }

    const CONTENT_ID = "seed_oravini_content";
    await pool.query(`
      INSERT INTO super_admin_doc_files (id, name, parent_id)
      VALUES ($1, 'Oravini Content', $2)
      ON CONFLICT (id) DO NOTHING
    `, [CONTENT_ID, SUPER_ID]);

    const contentDocs = [
      { id: "seed_content_types", name: "Oravini Content Types", url: "https://docs.google.com/document/d/1ODmMFGgkxIG1PGIdxjpCAKKPHI8W26s_HS3517XrHWI/edit?usp=sharing" },
      { id: "seed_content_brandverse_ideas", name: "Oravini (Brandverse) Content Ideas", url: "https://docs.google.com/document/d/1fkDNylIabxjGn9UTD1eA22veKFbO0VmKny-WRon0Ch0/edit?usp=sharing" },
      { id: "seed_content_ideas", name: "Oravini Content Ideas", url: "https://docs.google.com/document/d/1WrklTl-OtXItoEnpiDTNFWLc591o64vmcwvJMt3z-HQ/edit?usp=sharing" },
    ];

    for (const doc of contentDocs) {
      await pool.query(`
        INSERT INTO super_admin_docs (id, file_id, name, type, url, content)
        VALUES ($1, $2, $3, 'link', $4, '')
        ON CONFLICT (id) DO NOTHING
      `, [doc.id, CONTENT_ID, doc.name, doc.url]);
    }

    const docs = [
      { id: "seed_doc_automation_sop", name: "Oravini Automation SOP", url: "https://docs.google.com/document/d/1MWxrIPdjpsD7EapxhexjTvK2DNvWQZIulBVAaMZHRvw/edit?usp=sharing" },
      { id: "seed_doc_consulting_sop", name: "Oravini Consulting SOP", url: "https://docs.google.com/document/d/1LKvtNM0nWlja8VrxkN3OfuPyjD0pMOcYDE_PBX-tdtc/edit?usp=sharing" },
      { id: "seed_doc_software_sop", name: "Oravini Software SOP", url: "https://docs.google.com/document/d/1a0A-SA1mk2h-3vAPSxqZcVCx1jzY4idXzHcpRo3v8P8/edit?usp=sharing" },
      { id: "seed_doc_webinar_sop", name: "Oravini Webinar SOP", url: "https://docs.google.com/document/d/1SrtCugSpKDDOZcccVlWj6nxIsbFjQrwRYJFO7gdl5j0/edit?usp=sharing" },
      { id: "seed_doc_partnership_guide", name: "Oravini Client Partnership Guide", url: "https://docs.google.com/document/d/1qzimB0qHeoVE9_JSZ2JHPL1uCnpKx2KWGQhrMsIT060/edit?usp=sharing" },
    ];

    for (const doc of docs) {
      await pool.query(`
        INSERT INTO super_admin_docs (id, file_id, name, type, url, content)
        VALUES ($1, $2, $3, 'link', $4, '')
        ON CONFLICT (id) DO NOTHING
      `, [doc.id, SOPS_ID, doc.name, doc.url]);
    }

    console.log("[seed] Super admin docs seeded: Oravini > Oravini SOPS");
  } catch (err) {
    console.warn("[seed] Super admin docs seed skipped (tables may not exist yet):", (err as any).message);
  }
}

export async function seedDatabase() {
  try {
    const admins = [
      { email: "admin@brandverse.com", name: "Oravini Admin Paddle", password: "Brandverse@2024" },
      { email: "admin1@brandverse.com", name: "Co-Founder Admin", password: "Brandverse2024" },
      { email: "oravini@gmail.com", name: "Oravini", password: "Oravini123" },
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
