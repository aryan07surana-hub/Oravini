import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

function GrainOverlay() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9000,
        opacity: 0.045,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "200px",
        mixBlendMode: "overlay",
      }}
    />
  );
}

function Nav() {
  return (
    <motion.nav
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 0.5 }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "28px 48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#f0ede8",
        }}
      >
        Studio
      </span>
      <div style={{ display: "flex", gap: 36 }}>
        {["Work", "About", "Contact"].map((item) => (
          <span
            key={item}
            style={{
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(240,237,232,0.45)",
              cursor: "pointer",
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </motion.nav>
  );
}

function SplitWords({
  text,
  delay = 0,
  style,
}: {
  text: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const words = text.split(" ");
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: "0.22em", ...style }}>
      {words.map((word, i) => (
        <span key={i} style={{ overflow: "hidden", display: "inline-block" }}>
          <motion.span
            initial={{ y: "108%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.95, ease: EASE, delay: delay + i * 0.08 }}
            style={{ display: "inline-block" }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

function RevealWords({
  text,
  style,
}: {
  text: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-12%" });
  const words = text.split(" ");
  return (
    <div ref={ref} style={{ display: "flex", flexWrap: "wrap", gap: "0.22em", ...style }}>
      {words.map((word, i) => (
        <span key={i} style={{ overflow: "hidden", display: "inline-block" }}>
          <motion.span
            initial={{ y: "108%" }}
            animate={inView ? { y: 0 } : {}}
            transition={{ duration: 0.8, ease: EASE, delay: i * 0.04 }}
            style={{ display: "inline-block" }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </div>
  );
}

function InfiniteMarquee({
  items,
  reverse,
  size = "md",
}: {
  items: string[];
  reverse?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const content = items.join("  ·  ") + "  ·  ";
  const fontSize = size === "lg" ? "clamp(48px, 7vw, 96px)" : size === "sm" ? 13 : 15;
  const fontWeight = size === "lg" ? 800 : 500;
  return (
    <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
      <motion.div
        style={{ display: "inline-block" }}
        animate={{ x: reverse ? ["0%", "50%"] : ["0%", "-50%"] }}
        transition={{ duration: size === "lg" ? 18 : 28, ease: "linear", repeat: Infinity }}
      >
        <span
          style={{
            fontSize,
            fontWeight,
            letterSpacing: size === "lg" ? "-0.02em" : "0.12em",
            textTransform: "uppercase",
            color: size === "lg" ? "rgba(240,237,232,0.06)" : "rgba(240,237,232,0.35)",
            paddingRight: "2em",
          }}
        >
          {content}
        </span>
        <span
          style={{
            fontSize,
            fontWeight,
            letterSpacing: size === "lg" ? "-0.02em" : "0.12em",
            textTransform: "uppercase",
            color: size === "lg" ? "rgba(240,237,232,0.06)" : "rgba(240,237,232,0.35)",
            paddingRight: "2em",
          }}
        >
          {content}
        </span>
      </motion.div>
    </div>
  );
}

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let frame: number;
    const start = performance.now();
    const dur = 1800;
    function tick(now: number) {
      const p = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setVal(Math.round(target * ease));
      if (p < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, target]);

  return <span ref={ref}>{val}{suffix}</span>;
}

function Hero() {
  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "0 48px 88px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 25% 60%, rgba(40,20,80,0.35) 0%, transparent 55%), radial-gradient(ellipse at 75% 20%, rgba(10,10,30,0.5) 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />

      {/* Background huge text */}
      <div
        style={{
          position: "absolute",
          bottom: -40,
          left: -20,
          right: 0,
          pointerEvents: "none",
        }}
      >
        <InfiniteMarquee items={["STUDIO", "CREATIVE", "MOTION", "3D", "TECH"]} size="lg" />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          style={{
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(240,237,232,0.35)",
            marginBottom: 40,
          }}
        >
          Creative Production Studio — Est. 2024
        </motion.div>

        <div
          style={{
            fontSize: "clamp(64px, 11vw, 160px)",
            fontWeight: 800,
            lineHeight: 0.9,
            letterSpacing: "-0.03em",
            textTransform: "uppercase",
            marginBottom: 56,
          }}
        >
          <div>
            <SplitWords text="A Creative" delay={0.1} />
          </div>
          <div>
            <SplitWords text="Production" delay={0.28} />
          </div>
          <div style={{ color: "rgba(240,237,232,0.18)" }}>
            <SplitWords text="Studio." delay={0.44} />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.0, ease: EASE }}
            style={{
              fontSize: 16,
              color: "rgba(240,237,232,0.4)",
              maxWidth: 380,
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            A worldwide team of specialists in design,
            <br />
            motion, 3D, and technology.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(240,237,232,0.25)",
              }}
            >
              Scroll
            </span>
            <motion.div
              animate={{ scaleY: [1, 0.5, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: 1,
                height: 48,
                background: "rgba(240,237,232,0.2)",
                transformOrigin: "top",
              }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

const MARQUEE_ITEMS = [
  "DESIGN",
  "MOTION",
  "TECHNOLOGY",
  "3D",
  "INTERACTIVE",
  "PRODUCTION",
  "CREATIVE",
  "STRATEGY",
];

function MarqueeStrip() {
  return (
    <div
      style={{
        borderTop: "1px solid rgba(240,237,232,0.08)",
        borderBottom: "1px solid rgba(240,237,232,0.08)",
        padding: "20px 0",
        overflow: "hidden",
      }}
    >
      <InfiniteMarquee items={MARQUEE_ITEMS} size="sm" />
    </div>
  );
}

function About() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);

  return (
    <section
      ref={ref}
      style={{ padding: "160px 48px", maxWidth: 1400, margin: "0 auto", width: "100%" }}
    >
      <motion.div style={{ y }}>
        <RevealWords
          text="We build immersive digital experiences that push the boundaries of creativity and technology."
          style={{
            fontSize: "clamp(30px, 4.5vw, 68px)",
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
            maxWidth: "85%",
          }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
        style={{
          marginTop: 72,
          display: "flex",
          gap: 56,
          flexWrap: "wrap",
        }}
      >
        <p
          style={{
            fontSize: 15,
            color: "rgba(240,237,232,0.4)",
            maxWidth: 340,
            lineHeight: 1.75,
            margin: 0,
          }}
        >
          From concept to execution with clarity and craft — we move fast without losing depth.
        </p>
        <p
          style={{
            fontSize: 15,
            color: "rgba(240,237,232,0.4)",
            maxWidth: 340,
            lineHeight: 1.75,
            margin: 0,
          }}
        >
          Our integrated approach means strategy, design, and technology work in sync from day one.
        </p>
      </motion.div>
    </section>
  );
}

const STATS = [
  { value: 58, suffix: "+", label: "Awards Won" },
  { value: 12, suffix: "+", label: "Years of Craft" },
  { value: 200, suffix: "+", label: "Projects Shipped" },
  { value: 40, suffix: "+", label: "Global Clients" },
];

function Stats() {
  return (
    <div
      style={{
        borderTop: "1px solid rgba(240,237,232,0.08)",
        borderBottom: "1px solid rgba(240,237,232,0.08)",
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
      }}
    >
      {STATS.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: i * 0.1, ease: EASE }}
          style={{
            padding: "80px 48px",
            borderRight:
              i < STATS.length - 1
                ? "1px solid rgba(240,237,232,0.08)"
                : "none",
          }}
        >
          <div
            style={{
              fontSize: "clamp(44px, 6vw, 88px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            <Counter target={stat.value} suffix={stat.suffix} />
          </div>
          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(240,237,232,0.3)",
            }}
          >
            {stat.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

const SERVICES = [
  {
    title: "Strategy",
    items: ["Brand positioning", "Market research", "UX strategy", "Campaign planning"],
  },
  {
    title: "Creative",
    items: ["Visual identity", "Art direction", "Motion design", "3D & CGI"],
  },
  {
    title: "Technology",
    items: ["WebGL / Three.js", "React & Next.js", "Real-time experiences", "AI integration"],
  },
  {
    title: "Production",
    items: ["Video production", "Photography", "Audio & music", "Post-production"],
  },
];

function ServiceCard({
  service,
  index,
}: {
  service: (typeof SERVICES)[0];
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.75, delay: index * 0.1, ease: EASE }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "64px 52px",
        borderTop: "1px solid rgba(240,237,232,0.08)",
        borderRight:
          index % 2 === 0 ? "1px solid rgba(240,237,232,0.08)" : "none",
        background: hovered ? "rgba(240,237,232,0.025)" : "transparent",
        transition: "background 0.4s ease",
        cursor: "default",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 36,
        }}
      >
        <div
          style={{
            fontSize: "clamp(28px, 3vw, 48px)",
            fontWeight: 700,
            letterSpacing: "-0.025em",
          }}
        >
          {service.title}
        </div>
        <motion.div
          animate={{ rotate: hovered ? 45 : 0 }}
          transition={{ duration: 0.3 }}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "1px solid rgba(240,237,232,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            color: "rgba(240,237,232,0.5)",
            flexShrink: 0,
            marginTop: 6,
          }}
        >
          +
        </motion.div>
      </div>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {service.items.map((item) => (
          <li
            key={item}
            style={{
              fontSize: 14,
              color: "rgba(240,237,232,0.35)",
              letterSpacing: "0.02em",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "rgba(240,237,232,0.2)",
                flexShrink: 0,
              }}
            />
            {item}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function Services() {
  return (
    <section style={{ padding: "120px 0 0" }}>
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        style={{
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(240,237,232,0.3)",
          marginBottom: 0,
          paddingLeft: 48,
          paddingBottom: 64,
        }}
      >
        What we do
      </motion.div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
        }}
      >
        {SERVICES.map((service, i) => (
          <ServiceCard key={service.title} service={service} index={i} />
        ))}
      </div>
    </section>
  );
}

const CLIENTS = [
  "Apple",
  "Google",
  "Sony",
  "Porsche",
  "Coca-Cola",
  "Nike",
  "Calvin Klein",
  "Max Mara",
  "Spotify",
  "Netflix",
  "Adobe",
  "Stripe",
];

function ClientsSection() {
  return (
    <div
      style={{
        padding: "140px 0",
        borderTop: "1px solid rgba(240,237,232,0.08)",
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        style={{
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(240,237,232,0.3)",
          marginBottom: 52,
          paddingLeft: 48,
        }}
      >
        Trusted by
      </motion.div>
      <InfiniteMarquee items={CLIENTS} size="sm" />
      <div style={{ marginTop: 20 }}>
        <InfiniteMarquee items={[...CLIENTS].reverse()} reverse size="sm" />
      </div>
    </div>
  );
}

function CTA() {
  return (
    <section
      style={{
        padding: "160px 48px 140px",
        borderTop: "1px solid rgba(240,237,232,0.08)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 52,
      }}
    >
      <RevealWords
        text="Let's work together"
        style={{
          fontSize: "clamp(48px, 9vw, 136px)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 0.93,
          textTransform: "uppercase",
          justifyContent: "center",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.75, delay: 0.35 }}
        style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}
      >
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: "16px 44px",
            background: "#f0ede8",
            color: "#080808",
            border: "none",
            borderRadius: 100,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Start a project
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: "16px 44px",
            background: "transparent",
            color: "#f0ede8",
            border: "1px solid rgba(240,237,232,0.18)",
            borderRadius: 100,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          hello@studio.co
        </motion.button>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(240,237,232,0.08)",
        padding: "36px 48px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16,
      }}
    >
      <span style={{ fontSize: 12, color: "rgba(240,237,232,0.2)" }}>
        © 2024 Studio. All rights reserved.
      </span>
      <div style={{ display: "flex", gap: 28 }}>
        {["Twitter / X", "Instagram", "LinkedIn"].map((s) => (
          <span
            key={s}
            style={{
              fontSize: 12,
              color: "rgba(240,237,232,0.25)",
              cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            {s}
          </span>
        ))}
      </div>
    </footer>
  );
}

export default function LusionInspired() {
  return (
    <div
      style={{
        background: "#080808",
        color: "#f0ede8",
        fontFamily:
          "'helvetica neue', helvetica, -apple-system, BlinkMacSystemFont, 'Segoe UI', arial, sans-serif",
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      <GrainOverlay />
      <Nav />
      <Hero />
      <MarqueeStrip />
      <About />
      <Stats />
      <Services />
      <ClientsSection />
      <CTA />
      <Footer />
    </div>
  );
}
