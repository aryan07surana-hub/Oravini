import { useEffect, useRef, useState, Suspense } from "react";
import { useLocation } from "wouter";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sparkles, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const GOLD = "#FFD700";
const GOLD_BRIGHT = "#FFC700";

// 3D Animated Logo
function AnimatedLogo() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.2;
      meshRef.current.scale.setScalar(hovered ? 1.2 : 1);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <MeshDistortMaterial
          color={GOLD}
          attach="material"
          distort={0.4}
          speed={2}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      <Sparkles count={100} scale={3} size={2} speed={0.4} color={GOLD_BRIGHT} />
    </Float>
  );
}

// Particle System with Mouse Trail
function ParticleSystem() {
  const particlesRef = useRef<THREE.Points>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const trailRef = useRef<THREE.Vector3[]>([]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      };
      
      // Add to trail
      trailRef.current.push(new THREE.Vector3(
        mouseRef.current.x * 5,
        mouseRef.current.y * 5,
        0
      ));
      
      if (trailRef.current.length > 20) {
        trailRef.current.shift();
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame(() => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(Date.now() * 0.001 + i) * 0.002;
        
        // Attract to mouse
        const dx = mouseRef.current.x * 5 - positions[i];
        const dy = mouseRef.current.y * 5 - positions[i + 1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 2) {
          positions[i] += dx * 0.01;
          positions[i + 1] += dy * 0.01;
        }
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const particleCount = 200;
  const positions = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 10;
    positions[i + 1] = (Math.random() - 0.5) * 10;
    positions[i + 2] = (Math.random() - 0.5) * 5;
  }

  return (
    <>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.05} color={GOLD} transparent opacity={0.6} />
      </points>
      
      {/* Mouse Trail */}
      {trailRef.current.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color={GOLD} transparent opacity={1 - i / 20} />
        </mesh>
      ))}
    </>
  );
}

// Custom Cursor
function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMoving, setIsMoving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsMoving(true);
      
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setIsMoving(false), 100);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      <div
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: `2px solid ${GOLD}`,
          pointerEvents: "none",
          zIndex: 10000,
          transform: "translate(-50%, -50%)",
          transition: "width 0.2s, height 0.2s",
          ...(isMoving && { width: 30, height: 30 }),
        }}
      />
      <div
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          width: 4,
          height: 4,
          borderRadius: "50%",
          background: GOLD,
          pointerEvents: "none",
          zIndex: 10001,
          transform: "translate(-50%, -50%)",
        }}
      />
    </>
  );
}

// Splash Screen with 3D Animation
function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => onComplete(), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background: "#000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
    }}>
      {!error ? (
        <>
          <div style={{ width: "100%", height: "50vh" }}>
            <Canvas camera={{ position: [0, 0, 5] }} onError={() => setError(true)}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <Suspense fallback={null}>
                {phase >= 1 && <AnimatedLogo />}
              </Suspense>
            </Canvas>
          </div>
        </>
      ) : (
        <div style={{ fontSize: 60, marginBottom: 40 }}>✨</div>
      )}
      
      {phase >= 2 && (
        <div style={{
          fontSize: "clamp(48px, 8vw, 96px)",
          fontWeight: 900,
          background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: "0.1em",
          animation: "magicalAppear 1s ease-out",
        }}>
          ORAVINI
        </div>
      )}
      
      {phase >= 3 && (
        <div style={{
          fontSize: 14,
          color: "rgba(255,255,255,0.5)",
          marginTop: 20,
          animation: "fadeIn 0.8s ease-out",
        }}>
          Powered by AI Magic ✨
        </div>
      )}

      <style>{`
        @keyframes magicalAppear {
          0% { opacity: 0; transform: scale(0.5) rotateY(-180deg); filter: blur(20px); }
          50% { transform: scale(1.2) rotateY(0deg); }
          100% { opacity: 1; transform: scale(1) rotateY(0deg); filter: blur(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// Main Landing Page
export default function OraviniLanding3D() {
  const [, nav] = useLocation();
  const [showSplash, setShowSplash] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [canvasError, setCanvasError] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <div style={{
      background: "#000",
      color: "#fff",
      minHeight: "100vh",
      cursor: "none",
      fontFamily: "'Inter', sans-serif",
    }}>
      <CustomCursor />
      
      <style>{`
        * { cursor: none !important; }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px ${GOLD}66, 0 0 40px ${GOLD}44, 0 0 60px ${GOLD}22; }
          50% { box-shadow: 0 0 40px ${GOLD}88, 0 0 80px ${GOLD}66, 0 0 120px ${GOLD}44; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .glow-btn {
          animation: glow 2s ease-in-out infinite;
          transition: all 0.3s ease;
        }
        .glow-btn:hover {
          transform: scale(1.05);
          animation: glow 1s ease-in-out infinite;
        }
      `}</style>

      {/* Hero Section with 3D Background */}
      <section style={{
        position: "relative",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}>
        {/* 3D Canvas Background */}
        {!canvasError && (
          <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
            <Canvas camera={{ position: [0, 0, 8] }} onError={() => setCanvasError(true)}>
              <ambientLight intensity={0.3} />
              <pointLight position={[10, 10, 10]} intensity={1} color={GOLD} />
              <pointLight position={[-10, -10, -10]} intensity={0.5} color={GOLD_BRIGHT} />
              <Suspense fallback={null}>
                <ParticleSystem />
                <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
              </Suspense>
            </Canvas>
          </div>
        )}

        {/* Content */}
        <div style={{
          position: "relative",
          zIndex: 10,
          textAlign: "center",
          padding: "0 24px",
        }}>
          <div style={{
            fontSize: "clamp(14px, 2vw, 18px)",
            letterSpacing: "0.3em",
            color: GOLD,
            marginBottom: 30,
            animation: "float 3s ease-in-out infinite",
          }}>
            WELCOME TO
          </div>
          
          <h1 style={{
            fontSize: "clamp(64px, 12vw, 160px)",
            fontWeight: 900,
            background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD}, #FFE55C)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "0.1em",
            marginBottom: 40,
            filter: "drop-shadow(0 0 40px rgba(255,215,0,0.5))",
            animation: "float 4s ease-in-out infinite",
          }}>
            ORAVINI
          </h1>

          {/* Three Main Options */}
          <div style={{
            display: "flex",
            gap: 20,
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: 60,
          }}>
            <button
              onClick={() => nav("/audit")}
              className="glow-btn"
              style={{
                background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`,
                color: "#000",
                fontSize: 18,
                fontWeight: 800,
                padding: "20px 40px",
                border: "none",
                borderRadius: 15,
              }}
            >
              🎁 Get My Free Audit
            </button>
            
            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="glow-btn"
              style={{
                background: "rgba(255,215,0,0.1)",
                color: GOLD,
                fontSize: 18,
                fontWeight: 700,
                padding: "20px 40px",
                border: `2px solid ${GOLD}`,
                borderRadius: 15,
              }}
            >
              👀 See What's Inside
            </button>
            
            <button
              onClick={() => nav("/preview")}
              className="glow-btn"
              style={{
                background: "rgba(255,215,0,0.1)",
                color: GOLD,
                fontSize: 18,
                fontWeight: 700,
                padding: "20px 40px",
                border: `2px solid ${GOLD}`,
                borderRadius: 15,
              }}
            >
              🚀 Get a Live Preview
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div style={{
          position: "absolute",
          bottom: 40,
          left: "50%",
          transform: "translateX(-50%)",
          animation: "float 2s ease-in-out infinite",
        }}>
          <div style={{
            width: 30,
            height: 50,
            border: `2px solid ${GOLD}`,
            borderRadius: 20,
            position: "relative",
          }}>
            <div style={{
              width: 6,
              height: 6,
              background: GOLD,
              borderRadius: "50%",
              position: "absolute",
              top: 10,
              left: "50%",
              transform: "translateX(-50%)",
              animation: "scroll 1.5s ease-in-out infinite",
            }} />
          </div>
        </div>

        <style>{`
          @keyframes scroll {
            0% { top: 10px; opacity: 1; }
            100% { top: 30px; opacity: 0; }
          }
        `}</style>
      </section>

      {/* Features Section */}
      <section id="features" style={{
        padding: "120px 24px",
        background: "radial-gradient(ellipse at center, rgba(255,215,0,0.05), transparent)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 style={{
            fontSize: "clamp(36px, 6vw, 72px)",
            fontWeight: 900,
            textAlign: "center",
            marginBottom: 80,
            background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            All Platform Features
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 30,
          }}>
            {[
              { icon: "💡", title: "AI Content Ideas", desc: "Generate viral content ideas instantly" },
              { icon: "🎨", title: "Design Studio", desc: "Create stunning visuals with AI" },
              { icon: "🎬", title: "Video Editor", desc: "Edit videos like a pro" },
              { icon: "📊", title: "Analytics Dashboard", desc: "Track your growth in real-time" },
              { icon: "🤖", title: "AI Assistant", desc: "Your personal content coach" },
              { icon: "🔥", title: "Trend Analyzer", desc: "Stay ahead of trends" },
              { icon: "📱", title: "Social Scheduler", desc: "Auto-post to all platforms" },
              { icon: "💬", title: "Community", desc: "Connect with creators" },
              { icon: "🎯", title: "Target Audience", desc: "Find your perfect audience" },
            ].map((feature, i) => (
              <div
                key={i}
                className="glow-btn"
                style={{
                  background: "rgba(255,215,0,0.05)",
                  border: `1px solid ${GOLD}44`,
                  borderRadius: 20,
                  padding: 40,
                  textAlign: "center",
                  transition: "all 0.3s ease",
                }}
              >
                <div style={{ fontSize: 60, marginBottom: 20 }}>{feature.icon}</div>
                <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 15, color: GOLD }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Preview Section */}
      <section style={{
        padding: "120px 24px",
        background: "linear-gradient(180deg, transparent, rgba(255,215,0,0.05), transparent)",
      }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{
            fontSize: "clamp(36px, 6vw, 72px)",
            fontWeight: 900,
            marginBottom: 30,
            background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Get a Live Preview
          </h2>
          
          <p style={{
            fontSize: 20,
            color: "rgba(255,255,255,0.7)",
            marginBottom: 50,
            lineHeight: 1.8,
          }}>
            Explore the entire platform before you commit. See every tool, every feature, and experience the magic yourself.
          </p>

          <button
            onClick={() => nav("/preview")}
            className="glow-btn"
            style={{
              background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`,
              color: "#000",
              fontSize: 22,
              fontWeight: 800,
              padding: "25px 60px",
              border: "none",
              borderRadius: 20,
            }}
          >
            🎮 Launch Interactive Preview
          </button>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{
        padding: "120px 24px",
        background: "radial-gradient(ellipse at center, rgba(255,215,0,0.08), transparent)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 style={{
            fontSize: "clamp(36px, 6vw, 72px)",
            fontWeight: 900,
            textAlign: "center",
            marginBottom: 80,
            background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Simple Pricing
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 30,
          }}>
            {[
              { name: "Free", price: "$0", features: ["20 AI credits", "Basic tools", "Community access"], highlight: false },
              { name: "Starter", price: "$29", features: ["100 AI credits", "All tools", "Priority support"], highlight: false },
              { name: "Growth", price: "$59", features: ["250 AI credits", "Advanced AI", "No watermarks"], highlight: true },
              { name: "Pro", price: "$79", features: ["500 AI credits", "Everything", "VIP support"], highlight: false },
            ].map((plan, i) => (
              <div
                key={i}
                className={plan.highlight ? "glow-btn" : ""}
                style={{
                  background: plan.highlight ? `linear-gradient(135deg, ${GOLD}22, ${GOLD}11)` : "rgba(255,215,0,0.05)",
                  border: plan.highlight ? `2px solid ${GOLD}` : `1px solid ${GOLD}44`,
                  borderRadius: 20,
                  padding: 40,
                  textAlign: "center",
                  position: "relative",
                  transform: plan.highlight ? "scale(1.05)" : "scale(1)",
                }}
              >
                {plan.highlight && (
                  <div style={{
                    position: "absolute",
                    top: -15,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`,
                    color: "#000",
                    padding: "8px 20px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 800,
                  }}>
                    MOST POPULAR
                  </div>
                )}
                
                <h3 style={{ fontSize: 28, fontWeight: 700, marginBottom: 15, color: GOLD }}>
                  {plan.name}
                </h3>
                <div style={{ fontSize: 48, fontWeight: 900, marginBottom: 10, color: "#fff" }}>
                  {plan.price}
                </div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 30 }}>
                  per month
                </div>
                
                {plan.features.map((feature, j) => (
                  <div key={j} style={{
                    fontSize: 16,
                    color: "rgba(255,255,255,0.8)",
                    marginBottom: 15,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}>
                    <span style={{ color: GOLD }}>✓</span> {feature}
                  </div>
                ))}
                
                <button
                  onClick={() => nav("/audit")}
                  style={{
                    background: plan.highlight ? `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})` : "rgba(255,215,0,0.1)",
                    color: plan.highlight ? "#000" : GOLD,
                    fontSize: 16,
                    fontWeight: 700,
                    padding: "15px 30px",
                    border: plan.highlight ? "none" : `1px solid ${GOLD}`,
                    borderRadius: 10,
                    marginTop: 20,
                    width: "100%",
                  }}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Right Navigation */}
      <div style={{
        position: "fixed",
        top: 30,
        right: 30,
        zIndex: 1000,
        display: "flex",
        gap: 15,
      }}>
        <button
          onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
          style={{
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(10px)",
            color: GOLD,
            border: `1px solid ${GOLD}66`,
            padding: "12px 24px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Pricing
        </button>
        
        <button
          onClick={() => nav("/login")}
          style={{
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(10px)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.2)",
            padding: "12px 24px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Members Login
        </button>
      </div>

      {/* Footer */}
      <footer style={{
        padding: "60px 24px",
        borderTop: `1px solid ${GOLD}22`,
        textAlign: "center",
      }}>
        <div style={{
          fontSize: 14,
          color: "rgba(255,255,255,0.5)",
        }}>
          © 2024 Oravini. All rights reserved. | Powered by AI Magic ✨
        </div>
      </footer>
    </div>
  );
}
