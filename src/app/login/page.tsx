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

function NorthlyMark({ size = 36, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#E8192C" />
      <path d="M9 10h5.8l7.4 14.2V10H28v20h-5.8L14.8 15.8V30H9V10z" fill="white" />
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
    }}>

      {/* ── TOP RED STRIPE ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0,
        height: 4, background: "#E8192C", zIndex: 100,
      }} />

      {/* ══════════════════════════════════════
          LEFT PANEL — dark brand
      ══════════════════════════════════════ */}
      <div
        className="lg:flex"
        style={{
          display: "none",
          width: "54%",
          flexDirection: "column",
          background: "#070707",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Fine grid overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          pointerEvents: "none",
        }} />

        {/* Red glow — top right */}
        <div style={{
          position: "absolute", top: "-15%", right: "-15%",
          width: "65%", height: "65%",
          background: "radial-gradient(circle, rgba(232,25,44,0.18) 0%, transparent 68%)",
          pointerEvents: "none",
        }} />

        {/* Content */}
        <div style={{
          position: "relative", zIndex: 1,
          display: "flex", flexDirection: "column",
          height: "100%", padding: "52px 60px",
        }}>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <NorthlyMark size={36} />
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, letterSpacing: "0.1em" }}>NORTHLY</div>
              <div style={{ color: "rgba(255,255,255,0.22)", fontWeight: 700, fontSize: 9, letterSpacing: "0.18em", marginTop: 2 }}>GROUP</div>
            </div>
          </div>

          {/* Centre hero */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: 16 }}>

            <div style={{
              color: "#E8192C",
              fontSize: 11, fontWeight: 700,
              letterSpacing: "0.2em", textTransform: "uppercase",
              marginBottom: 24,
            }}>
              Canada&apos;s Largest Social Publisher
            </div>

            <h1 style={{
              color: "#fff", margin: "0 0 52px",
              fontSize: "clamp(46px, 4.2vw, 68px)",
              fontWeight: 900, lineHeight: 1.02,
              letterSpacing: "-0.045em",
            }}>
              Connecting<br />
              <span style={{ color: "#E8192C" }}>Canadians</span><br />
              to their Cities<br />
              &amp; Culture.
            </h1>

            {/* 2×2 stats grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "28px 56px",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              paddingTop: 36,
            }}>
              {STATS.map((s) => (
                <div key={s.label}>
                  <div style={{
                    color: "#fff",
                    fontSize: "clamp(26px, 2.4vw, 38px)",
                    fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1,
                    marginBottom: 7,
                  }}>
                    {s.value}
                  </div>
                  <div style={{
                    color: "rgba(255,255,255,0.28)",
                    fontSize: 12, fontWeight: 500, letterSpacing: "0.04em",
                  }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer — trusted by as plain text */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 22 }}>
            <div style={{
              color: "rgba(255,255,255,0.14)", fontSize: 10,
              letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700,
              marginBottom: 10,
            }}>
              Trusted By
            </div>
            <div style={{
              color: "rgba(255,255,255,0.3)",
              fontSize: 13, fontWeight: 500, lineHeight: 1.9,
              letterSpacing: "0.01em",
            }}>
              SHEIN &nbsp;·&nbsp; Domino&apos;s &nbsp;·&nbsp; Cineplex &nbsp;·&nbsp; DoorDash &nbsp;·&nbsp; No Frills &nbsp;·&nbsp; Polymarket
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          RIGHT PANEL — clean white, corporate
      ══════════════════════════════════════ */}
      <div style={{
        flex: 1,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#ffffff",
        padding: "60px 32px",
        position: "relative",
      }}>

        {/* Very subtle top-left watermark visible only on white */}
        <div style={{
          position: "absolute", bottom: 32, left: 40,
          color: "rgba(0,0,0,0.06)", fontSize: 80, fontWeight: 900,
          letterSpacing: "-0.05em", lineHeight: 1,
          userSelect: "none", pointerEvents: "none",
        }}>
          N
        </div>

        {/* Mobile-only logo */}
        <div
          className="lg:hidden"
          style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}
        >
          <NorthlyMark size={36} />
          <div>
            <div style={{ color: "#0a0a0a", fontWeight: 800, fontSize: 16, letterSpacing: "0.08em" }}>NORTHLY</div>
            <div style={{ color: "rgba(0,0,0,0.25)", fontWeight: 700, fontSize: 10, letterSpacing: "0.14em", marginTop: 2 }}>GROUP</div>
          </div>
        </div>

        {/* Form area */}
        <div style={{ width: "100%", maxWidth: 376, position: "relative", zIndex: 1 }}>

          {/* Product label */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 6, padding: "5px 13px",
            marginBottom: 28,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#E8192C" }} />
            <span style={{ color: "#E8192C", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Proposal IQ
            </span>
          </div>

          {/* Heading */}
          <h2 style={{
            fontSize: 34, fontWeight: 900,
            letterSpacing: "-0.04em", color: "#080808",
            margin: "0 0 10px", lineHeight: 1.05,
          }}>
            Sign in to your<br />workspace.
          </h2>
          <p style={{
            color: "rgba(0,0,0,0.38)", fontSize: 15,
            margin: "0 0 36px", lineHeight: 1.6,
          }}>
            Internal platform for the Northly sales team.
          </p>

          {error && (
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10, padding: "12px 16px", marginBottom: 20,
              fontSize: 13, color: "#dc2626", lineHeight: 1.4,
            }}>
              <strong>{error}</strong>{desc ? `: ${desc}` : ""}
            </div>
          )}

          {/* Google button — light, corporate */}
          <button
            onClick={signInWithGoogle}
            style={{
              width: "100%", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 12,
              padding: "15px 24px", borderRadius: 10,
              border: "1.5px solid #e5e7eb",
              background: "#fff",
              cursor: "pointer", fontSize: 15, fontWeight: 600, color: "#111",
              transition: "all 0.15s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f9fafb";
              e.currentTarget.style.borderColor = "#d1d5db";
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.09)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.borderColor = "#e5e7eb";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.07)";
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          {/* OR divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "22px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#f0f0f0" }} />
            <span style={{ color: "rgba(0,0,0,0.2)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>
              RESTRICTED ACCESS
            </span>
            <div style={{ flex: 1, height: 1, background: "#f0f0f0" }} />
          </div>

          <p style={{
            margin: 0, fontSize: 12.5, color: "rgba(0,0,0,0.3)",
            textAlign: "center", lineHeight: 1.6,
          }}>
            Sign-in is limited to{" "}
            <span style={{ color: "#E8192C", fontWeight: 700 }}>@northlygroup.com</span>{" "}
            accounts.
          </p>

          {/* Bottom brand mark */}
          <div style={{
            marginTop: 52,
            borderTop: "1px solid #f3f4f6",
            paddingTop: 24,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: 4, background: "#E8192C",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 9 }}>N</span>
            </div>
            <span style={{ color: "rgba(0,0,0,0.18)", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em" }}>
              NORTHLY SALES OS
            </span>
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
