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

    const CALLS_ID = "seed_oravini_client_calls_sops";
    await pool.query(`
      INSERT INTO super_admin_doc_files (id, name, parent_id)
      VALUES ($1, 'Oravini Client Calls SOPS', $2)
      ON CONFLICT (id) DO NOTHING
    `, [CALLS_ID, SUPER_ID]);

    const callsDocs = [
      { id: "seed_calls_market_research", name: "Oravini Market Research", url: "https://docs.google.com/document/d/1RyoInm496GHjcK9EeUD8hclHa9CwlvttbFnN503bn0s/edit?usp=sharing" },
      { id: "seed_calls_client_discovery", name: "Oravini Client Discovery", url: "https://docs.google.com/document/d/1fUbxOPJNVLnH4BJ1cSTaF7PeAQLAhCeQVqpyt11Oodo/edit?usp=sharing" },
      { id: "seed_calls_consultation_sops", name: "Oravini Client Consultation SOPS", url: "https://docs.google.com/document/d/12sHOhvEb50hnjXSsjpM8G9QhwpljhEQKWbw3Em45WnE/edit?usp=sharing" },
    ];

    for (const doc of callsDocs) {
      await pool.query(`
        INSERT INTO super_admin_docs (id, file_id, name, type, url, content)
        VALUES ($1, $2, $3, 'link', $4, '')
        ON CONFLICT (id) DO NOTHING
      `, [doc.id, CALLS_ID, doc.name, doc.url]);
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

export async function seedCompulsoryReads() {
  const entries = [
    {
      id: "comp_four_things",
      text: `THE ONLY FOUR THINGS THAT MATTER

1. Solid foundations
2. Paradigm and worldview
3. Generating strategy sessions
4. Doing strategy sessions

You will be tempted to do anything other than the work and closing a sale. Keep it simple and execute on these four things daily.`,
      note: "Your daily anchor. Come back to this whenever you feel scattered.",
    },
    {
      id: "comp_paradigm_1",
      text: `PARADIGM & WORLDVIEW — Part 1

You have to learn to look out your window and observe the world, thinking about what lies these people are believing and what trends are prevailing.

What do you believe to be true? Understanding that perception of truth doesn't always mean the truth. Be open to taking a contrarian view on the market and be open to questioning everything you ever thought you knew. Your current beliefs, your current way of doing things, will only get you more of what you have now. If you want to change, it takes change to get it, and if you want to change the world or change your market, you had better start by changing yourself first.

Ask yourself this every day: What is something that you believe to be true that nobody else agrees with you on?

Most businesses are shouting, but all their market hears is noise. Volume without signal only frustrates people and hurts their ears. Instead of shouting, listen for feedback. Tune your message till it resonates deep into your market's bones.`,
      note: "Daily question: What do I believe that nobody else agrees with?",
    },
    {
      id: "comp_paradigm_2",
      text: `PARADIGM & WORLDVIEW — Part 2

We are not the highest version of ourselves that we can imagine. We are the lowest version of ourselves that we can accept. You will do nothing to achieve your dreams, but fight like hell to not breach your standards. Turn your dreams into irrefutable standards.

The key to all evolution is variation. When you start to grow tired of what is in the light, you must face what is in the dark. Lose the binary stance of one true right and wrong. Nothing is static — everything in this universe is forever becoming. The real question is: "Who am I becoming?"

It doesn't matter what is true, only what you believe is true, because with work, that will become true. I found the crown of consulting in the gutter, picked it up with a sword, and it was mine. Whatever crown you desire, it's lying in the gutter too. All you have to do is pick it up with work and put it on.

Most people's character has become so strong and defined that it's reversed the roles and is pulling the strings on its own master. Pin your character down. Define exactly who it is. If the character isn't fit for the job, design one who will achieve it with ease — and make the choice to grow into it. Your character is changeable. You pull the strings.`,
      note: "Standards > dreams. Character is changeable. You pull the strings.",
    },
    {
      id: "comp_truths_selling",
      text: `TRUTHS TO HOLD

• The self is nothing but an illusion built from mental programming
• All of life is simply a magnificent illusion created by your mind
• The only true judge of success is when it is put to test in the market
• There is not one definitive right and wrong — just what is popular belief
• Physical science is illusion, quantum science is the mind's material
• The victim has a story about why they can't. The winner has no story.
• Every action has an equal and opposite reaction. Inside reflects outside.
• It doesn't matter what is true, only what you believe is true — because with work, that will become true

ON SELLING

Truly masterful salesmen create separation from an agitated situation to a clearly defined current situation and a clearly defined desired situation. They then position themselves and their offer as the key to that desired situation.

Truly masterful salesmen don't sell things — they sell futures.`,
      note: "You don't sell things. You sell futures.",
    },
    {
      id: "comp_important_1",
      text: `IMPORTANT THINGS TO REMEMBER — Part 1

1. It doesn't matter what is true, only what you believe is true, because with work that will become true. The master algorithm of evolution is: Beliefs → Actions → Results → Feedback. Intercept your own algorithm at the beliefs stage. Take massive action. Experience results. Listen to feedback. Iterate again and again.

2. Where you are in life is all your doing. You built yourself and your life. You are solely responsible for where you are right now and where you go in the future. There is no external force, person or thing against you — it's all you.

3. We are not physical bodies bound to earth. We are the evolution of light, a waveform experiencing consciousness. What we perceive to be reality is simply a magnificent illusion. We create our own realities through our thoughts, beliefs and actions. Evolve yourself. Achieve whatever you want. Become whoever you want to be.

4. We are not the highest version of ourselves which we can imagine. We are the lowest version of ourselves which we can accept. You will do nothing to achieve your dreams but fight like hell to not breach your standards. Turn them into irrefutable standards.`,
      note: null,
    },
    {
      id: "comp_important_2",
      text: `IMPORTANT THINGS TO REMEMBER — Part 2

5. Be constantly aware of your own patterns of existence. You are in constant conflict between the person you are right now and the person you want to become. Take note of the highs and the lows. Look for markers to warn you of the turns so you can catch and correct them.

6. The key to all evolution is variation. When you grow tired of what is in the light, face what is in the dark. Lose the binary stance of one true right and wrong. Nothing is static. Everything is forever becoming. Who am I becoming?

7. Our minds are an on/off system programmed over time. Every experience stacks a rock on a scale — positive or negative. Whatever side has the most rocks, that is what you believe. What you believe is your reality.

8. Be constantly aware of mental feedback loops. What one thinks is what one thinks about. Mental feedback loops can build you to be the best in the world or break you completely. Catch the downs. Feed the ups.

9. Most people's character has reversed roles and is pulling the strings on its own master. Pin your character down. Define who it is. If it isn't fit for the job, design one who will achieve it with ease and make the conscious decision to grow into it. Your character is changeable. You pull the strings.`,
      note: null,
    },
    {
      id: "comp_affirmations_1",
      text: `AFFIRMATIONS I — Mindset, Action & Momentum

I always think and act today. I feel heroic, confident and exhilarated knowing my actions today will create momentum tomorrow — I feel unstoppable.

I am free of the fear of rejection. Rejection is necessary to achieve success. I act without fear and feel confident, strong-minded and energized.

I am good enough. I am smart, helpful and worthy of taking up anybody's time. I feel comfortable, confident and exhilarated.

I am free of the fear of mistakes and failure. Mistakes and failure are good and necessary. I act without fear and feel excited, heroic and unstoppable.

I love calling my prospects and customers. Each call is a new opportunity to build a relationship and help somebody out. I feel excited and confident.

Each and every call I start with an incredible level of positive expectation. Somewhere, someone's life is better because of my products and services.

I love to close the deal. I rejoice knowing my time has been well spent and feel confident about moving onto a new opportunity.

I love taking action. I feel courageous and exhilarated. I build extreme momentum and prosperity when taking action.

I love exercising every day. I am in perfect health. Going to the gym, exercising and taking a sauna make me feel well-rounded and accomplished.

I attract success. Success and good things are naturally attracted to me. I feel prosperous and amazing every day.

Success comes to me easily. Abundance and prosperity flow to me from every direction. I can't wait to wake up each day knowing success is guaranteed for me.

I see opportunity everywhere I look. I feel overwhelmingly confident and positive with the abundance of opportunity.

I feel amazing every morning I wake up. I bounce out of bed knowing the day has huge opportunity in store. I feel excited, confident and exhilarated.`,
      note: null,
    },
    {
      id: "comp_affirmations_2",
      text: `AFFIRMATIONS II — Marketing, Business & Self-Worth

I am an excellent marketer. I know how to generate a constant stream of leads and money for any business. I feel powerful, confident and assured.

I am an amazing copywriter. I know how to write copy that grabs attention and pulls incredible results. I feel powerful and assured.

I am an amazing speaker and produce some of the world's best videos. My videos impact people all over the world. I feel powerful, proud and skilled.

I am confident calling and talking to business owners of all success levels. I feel confident, excited and exhilarated.

I create the life of my dreams. My plans, goals and actions build my destiny. I feel powerful and in control.

I am an unstoppable human being and can achieve anything. I feel powerful, smart and determined.

I am a self-starter. All of my motivation comes from within and I can call on it at will. I feel unstoppable and powerful.

I am proud of myself and my success. I have achieved a great deal and this is just the beginning.

I am a powerful body, powerful mind and a powerful soul. I am deserving of the world's greatest levels of success.

I speak my word with confidence and conviction. My words are powerful and bring success to others when shared.

I am a happy person who is intoxicated with living. I enjoy life and life is good to me.

I excel at whatever I do. I have positive expectancy and I am known to win.

I am at peace with the world. I understand how it works and where I fit within it. I am deserving of huge financial wealth and respect.

I have inner strength, grit and the confidence to win at whatever I choose to do.`,
      note: null,
    },
    {
      id: "comp_affirmations_3",
      text: `AFFIRMATIONS III — Wealth & Abundance I

I am optimistic and filled with enthusiasm. The world continues to reward me at an accelerating rate. The future holds immeasurable happiness and prosperity.

I accomplish more in less time than ever before. I feel unstoppable, powerful and smart.

I effortlessly achieve my goals every single time. I set high goals and achieve them in record time.

I always give more than what I am paid for. All of my clients are happy and they spread the good word about me every single day.

I have a mindset of wealth and abundance. I can achieve anything that I want. I feel powerful and unstoppable.

Abundance is my natural state. I see abundance everywhere I look. Life will always be this way for me.

I am a people and money magnet. Good people and huge fortune are attracted towards me every single day.

Money flows to me easily, frequently and abundantly.

Prosperity is mine and I deserve it and I expect it.

I know my value. I honor my worth. I am worthy of receiving abundance.

Creative ideas for money and success flow from me. I feel powerful and gifted.

Money is positive energy that takes care of my worthy needs and desires. I am completely at ease receiving and managing huge amounts of money every single day.

My income is constantly increasing and I deserve it.

I am a positive resource and people love to do business with me.

I am now easily and effortlessly attracting unlimited financial prosperity and abundance into every aspect of my life.`,
      note: null,
    },
    {
      id: "comp_affirmations_4",
      text: `AFFIRMATIONS IV — Wealth & Abundance II

Everything I touch returns riches to me. I am unstoppable and I feel courageous and powerful.

I always have enough money for anything that I want to do in life. I feel at ease and gifted.

The more money I have, the more I can use to help myself and others. I am an excellent steward of money.

My work is always recognized positively. I am unique and my work is world-renowned.

I am a business genius. I am creative and make effective business choices. I feel intelligent and unstoppable.

Money comes to me in expected and unexpected ways — attracted from every different angle possible.

I give myself permission to live an abundant life. I deserve it. I will live the rest of my life from this position of abundance and power.

I love money and money loves me. The world is a better place because of what I do with my large amounts of money.

I have great skill at managing my finances and always have money in abundance.

I release all doubt, fears and negative beliefs about money. Money is a good thing and I deserve large sums of it.

I always attract the right clients at the right time. Great clients are attracted to me and there is never a shortage of them.

I have absolute certainty in my ability to generate any amount of income I choose. I am one of the smartest people in the world and I am rewarded for this every single day.

I release all of my past beliefs that have limited me from becoming rich. I now think from a position of power and abundance. I am rich and successful and I deserve what I have — and more.`,
      note: null,
    },
    {
      id: "comp_affirmations_5",
      text: `AFFIRMATIONS V — Growth, Gratitude & Unstoppable Success

I am successful in everything that I do. I am unstoppable and I feel gifted and recognized.

I easily and quickly learn the lessons life presents me with. A setback, struggle or failure is still a win and a step forward.

I welcome freedom into my mind. I am not restrained to anything and can do whatever I want. I feel free and empowered.

I am open to all possibilities. I keep an open mind at all times. I believe in my ability to figure things out and win.

I'm always in the right place at the right time. Winning comes easy to me.

I have a keen capacity to learn new skills. I am a quick learner and quickly rise to the top of any field I choose to play.

I embrace all change and use it to my higher good. I am an alchemist who can bring success from any situation.

I love and respect myself, and that allows me to have enriching relationships. I am an amazing person and I am proud of who I am.

I give thanks continuously as I move through each day. I am gifted and for that I am humble and thankful.

I possess the wisdom, the power, the motivation, the inspiration and the passion to accomplish anything and everything I choose.

I prosper in health. I prosper in finances. I prosper in love. I prosper in peace. I am an unstoppable human being.`,
      note: "End of compulsory reads. Now go execute.",
    },
  ];

  try {
    for (const e of entries) {
      await pool.query(
        `INSERT INTO super_admin_compulsory_reads (id, text, note)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [e.id, e.text, e.note]
      );
    }
    console.log("[seed] Compulsory reads seeded:", entries.length, "entries");
  } catch (err) {
    console.warn("[seed] Compulsory reads seed skipped:", (err as any).message);
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
