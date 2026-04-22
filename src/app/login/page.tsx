"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const STATS = [
  { value: "5.5M+", label: "Network Audience" },
  { value: "120", label: "Social Channels" },
  { value: "750M+", label: "Monthly Views" },
  { value: "100M+", label: "Monthly Reach" },
];

const BRANDS = [
  "Northly", "Waveroom", "Bites.", "Night Out",
  "Must Be.", "Got Deals", "Housing Watch", "Canada Blogs", "Penalty Room",
];

const PARTNERS = ["SHEIN", "Domino's", "Cineplex", "DoorDash", "No Frills", "Polymarket"];

function NorthlyMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="9" fill="#E8192C"/>
      <path d="M9 10h5.8l7.4 14.2V10H28v20h-5.8L14.8 15.8V30H9V10z" fill="white"/>
    </svg>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const desc = searchParams.get("desc");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: "implicit" } }
  );

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents",
      },
    });
  }

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      background: "#080808",
    }}>

      {/* ── LEFT BRAND PANEL ── */}
      <div
        className="lg:flex"
        style={{
          display: "none",
          width: "58%",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          background: "#080808",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Top-right red glow */}
        <div style={{
          position: "absolute", top: 0, right: 0,
          width: "75%", height: "60%",
          background: "radial-gradient(ellipse at 85% 0%, rgba(232,25,44,0.28) 0%, transparent 65%)",
          pointerEvents: "none",
        }} />
        {/* Bottom-left secondary glow */}
        <div style={{
          position: "absolute", bottom: 0, left: 0,
          width: "55%", height: "45%",
          background: "radial-gradient(ellipse at 0% 100%, rgba(232,25,44,0.10) 0%, transparent 65%)",
          pointerEvents: "none",
        }} />
        {/* Dot grid texture */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.018,
          backgroundImage: "radial-gradient(rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          pointerEvents: "none",
        }} />

        {/* Mountain silhouette — pure CSS */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "38%",
          background: "linear-gradient(to top, rgba(8,8,8,0.95) 0%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 0,
        }} />

        {/* ── Panel Content ── */}
        <div style={{
          position: "relative", zIndex: 1,
          display: "flex", flexDirection: "column",
          height: "100%", padding: "44px 56px",
        }}>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <NorthlyMark size={34} />
            <div style={{ lineHeight: 1 }}>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, letterSpacing: "0.07em" }}>NORTHLY</div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontWeight: 600, fontSize: 9.5, letterSpacing: "0.13em", marginTop: 2 }}>GROUP</div>
            </div>
          </div>

          {/* ── Center Content ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 44 }}>

            {/* Pill badge + headline */}
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                background: "rgba(232,25,44,0.1)", border: "1px solid rgba(232,25,44,0.22)",
                borderRadius: 100, padding: "5px 15px", marginBottom: 26,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#E8192C", boxShadow: "0 0 8px rgba(232,25,44,0.8)",
                }} />
                <span style={{
                  color: "#E8192C", fontSize: 10.5, fontWeight: 700,
                  letterSpacing: "0.14em", textTransform: "uppercase",
                }}>
                  Canada&apos;s Largest Social Publisher
                </span>
              </div>

              <h1 style={{
                color: "#fff", margin: 0,
                fontSize: "clamp(40px, 3.8vw, 62px)",
                fontWeight: 900, lineHeight: 1.03,
                letterSpacing: "-0.04em",
              }}>
                Connecting<br />
                <span style={{ color: "#E8192C" }}>Canadians</span><br />
                to their Cities<br />
                &amp; Culture.
              </h1>
            </div>

            {/* Stats row */}
            <div style={{
              display: "flex",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              paddingTop: 30,
            }}>
              {STATS.map((s, i) => (
                <div key={s.label} style={{
                  flex: 1,
                  paddingRight: i < STATS.length - 1 ? 20 : 0,
                  marginRight: i < STATS.length - 1 ? 20 : 0,
                  borderRight: i < STATS.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
                }}>
                  <div style={{
                    color: "#E8192C",
                    fontSize: "clamp(20px, 2vw, 28px)",
                    fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1,
                  }}>
                    {s.value}
                  </div>
                  <div style={{
                    color: "rgba(255,255,255,0.32)",
                    fontSize: 11, marginTop: 5,
                    fontWeight: 500, letterSpacing: "0.02em",
                  }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Brand network */}
            <div>
              <p style={{
                color: "rgba(255,255,255,0.2)", fontSize: 10,
                letterSpacing: "0.15em", textTransform: "uppercase",
                fontWeight: 700, margin: "0 0 13px",
              }}>Our Network</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {BRANDS.map((b) => (
                  <span key={b} style={{
                    background: "rgba(255,255,255,0.035)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 6, padding: "5px 13px",
                    color: "rgba(255,255,255,0.42)", fontSize: 11.5, fontWeight: 500,
                  }}>
                    {b}
                  </span>
                ))}
              </div>
            </div>

            {/* Trusted by */}
            <div>
              <p style={{
                color: "rgba(255,255,255,0.2)", fontSize: 10,
                letterSpacing: "0.15em", textTransform: "uppercase",
                fontWeight: 700, margin: "0 0 13px",
              }}>Trusted By</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {PARTNERS.map((p) => (
                  <span key={p} style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 6, padding: "5px 14px",
                    color: "rgba(255,255,255,0.28)", fontSize: 11, fontWeight: 600,
                    letterSpacing: "0.04em",
                  }}>
                    {p}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Footer tagline */}
          <p style={{ color: "rgba(255,255,255,0.14)", fontSize: 12, margin: 0, letterSpacing: "0.02em" }}>
            Bridging the gap between our audience and your brand.
          </p>
        </div>
      </div>

      {/* ── RIGHT SIGN-IN PANEL ── */}
      <div style={{
        flex: 1,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#0c0c0c",
        padding: "40px 24px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Subtle bottom glow */}
        <div style={{
          position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "120%", height: "40%",
          background: "radial-gradient(ellipse at 50% 100%, rgba(232,25,44,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Mobile-only logo */}
        <div
          className="lg:hidden"
          style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 40, zIndex: 1 }}
        >
          <NorthlyMark size={38} />
          <div style={{ lineHeight: 1 }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 16, letterSpacing: "0.07em" }}>NORTHLY</div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontWeight: 600, fontSize: 10, letterSpacing: "0.13em", marginTop: 2 }}>GROUP</div>
          </div>
        </div>

        {/* ── Sign-in box ── */}
        <div style={{ width: "100%", maxWidth: 360, position: "relative", zIndex: 1 }}>

          {/* Heading */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{
              fontSize: 28, fontWeight: 900,
              letterSpacing: "-0.04em", color: "#fff",
              margin: "0 0 8px",
            }}>
              Welcome back.
            </h2>
            <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 14, margin: 0, lineHeight: 1.55 }}>
              Sign in to access Proposal IQ —<br />your internal sales platform.
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: "rgba(255,255,255,0.04)",
            borderRadius: 16, padding: "24px",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>

            {error && (
              <div style={{
                background: "rgba(185,28,28,0.15)",
                border: "1px solid rgba(232,25,44,0.3)",
                borderRadius: 10, padding: "10px 14px", marginBottom: 16,
                fontSize: 13, color: "#fca5a5", lineHeight: 1.4,
              }}>
                <strong>{error}</strong>{desc ? `: ${desc}` : ""}
              </div>
            )}

            {/* Google sign-in */}
            <button
              onClick={signInWithGoogle}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                padding: "14px 20px", borderRadius: 11,
                border: "1px solid rgba(255,255,255,0.13)",
                background: "rgba(255,255,255,0.07)",
                cursor: "pointer", fontSize: 15, fontWeight: 600, color: "#fff",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.13)";
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div style={{
              marginTop: 18, paddingTop: 16,
              borderTop: "1px solid rgba(255,255,255,0.07)",
            }}>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.28)", textAlign: "center", lineHeight: 1.5 }}>
                Access restricted to{" "}
                <span style={{ color: "#E8192C", fontWeight: 700 }}>Northly</span>
                {" "}team members only.
              </p>
            </div>
          </div>

          {/* Bottom brand mark */}
          <div style={{ marginTop: 36, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 17, height: 17, borderRadius: 4,
                background: "#E8192C",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ color: "#fff", fontWeight: 900, fontSize: 9, letterSpacing: "-0.01em" }}>N</span>
              </div>
              <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>
                NORTHLY SALES OS
              </span>
            </div>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          </div>
        </div>
      </div>

    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
