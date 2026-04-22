"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const STATS = [
  { value: "6M+", label: "Network Reach" },
  { value: "120", label: "Social Channels" },
  { value: "750M+", label: "Monthly Views" },
  { value: "100M+", label: "Monthly Reach" },
];

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
        scopes:
          "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents",
      },
    });
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          min-height: 100vh;
          display: flex;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #080808;
          color: #fff;
        }

        /* ── noise texture ── */
        .noise::after {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }

        /* ── LEFT ── */
        .left-panel {
          display: none;
          width: 58%;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px 64px 52px;
          position: relative;
          overflow: hidden;
          border-right: 1px solid rgba(255,255,255,0.055);
        }
        @media (min-width: 1024px) { .left-panel { display: flex; } }

        .glow-1 {
          position: absolute;
          top: -10%; right: -8%;
          width: 55%; height: 55%;
          background: radial-gradient(circle at 60% 30%, rgba(232,25,44,0.2) 0%, transparent 65%);
          pointer-events: none;
        }
        .glow-2 {
          position: absolute;
          bottom: -5%; left: -5%;
          width: 40%; height: 40%;
          background: radial-gradient(circle, rgba(232,25,44,0.07) 0%, transparent 65%);
          pointer-events: none;
        }

        /* ── RIGHT ── */
        .right-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 32px;
          background: #0b0b0b;
          position: relative;
        }

        .form-wrap {
          width: 100%;
          max-width: 368px;
          position: relative;
          z-index: 1;
        }

        /* ── Google button ── */
        .google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 11px;
          padding: 13px 20px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.04);
          cursor: pointer;
          font-size: 14.5px;
          font-weight: 600;
          color: #fff;
          font-family: inherit;
          transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
        }
        .google-btn:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.16);
          box-shadow: 0 0 0 3px rgba(232,25,44,0.08);
        }

        /* ── Logo mark ── */
        .n-mark {
          width: 34px; height: 34px;
          background: #E8192C;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        /* ── Stat dividers ── */
        .stat-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 0;
          border-top: 1px solid rgba(255,255,255,0.07);
          padding-top: 28px;
        }
        .stat-item {
          padding-right: 24px;
          border-right: 1px solid rgba(255,255,255,0.07);
          margin-right: 24px;
        }
        .stat-item:last-child {
          padding-right: 0;
          border-right: none;
          margin-right: 0;
        }
      `}</style>

      <div className="login-root noise">

        {/* ════════════════════════════ LEFT PANEL ════════════════════════════ */}
        <div className="left-panel">
          <div className="glow-1" />
          <div className="glow-2" />

          {/* ── TOP: Logo + nav ── */}
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div className="n-mark">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M2 2.5h3.5l5 9.2V2.5H14V15.5h-3.5L5.5 6.3V15.5H2V2.5z" fill="white" />
                </svg>
              </div>
              <div>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 13, letterSpacing: "0.09em", lineHeight: 1 }}>NORTHLY</div>
                <div style={{ color: "rgba(255,255,255,0.2)", fontWeight: 600, fontSize: 8.5, letterSpacing: "0.2em", marginTop: 3 }}>GROUP</div>
              </div>
            </div>
            <div style={{
              background: "rgba(232,25,44,0.1)",
              border: "1px solid rgba(232,25,44,0.2)",
              borderRadius: 20,
              padding: "5px 14px",
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "#E8192C",
              textTransform: "uppercase",
            }}>
              Internal Platform
            </div>
          </div>

          {/* ── CENTER: Hero headline ── */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.2em",
              textTransform: "uppercase", color: "#E8192C",
              marginBottom: 20,
            }}>
              Canada&apos;s Largest Social Publisher
            </p>

            <h1 style={{
              fontSize: "clamp(52px, 4.8vw, 76px)",
              fontWeight: 900,
              lineHeight: 0.96,
              letterSpacing: "-0.05em",
              marginBottom: 28,
              background: "linear-gradient(165deg, #ffffff 0%, rgba(255,255,255,0.55) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              The Sales OS<br />
              for Northly&apos;s<br />
              team.
            </h1>

            <p style={{
              fontSize: 15,
              color: "rgba(255,255,255,0.38)",
              lineHeight: 1.7,
              maxWidth: 380,
              fontWeight: 400,
            }}>
              Build five-option proposals in minutes. Live pricing,
              AI drafts, and Google Docs export — all in one place.
            </p>
          </div>

          {/* ── BOTTOM: Stats ── */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="stat-grid">
              {STATS.map((s) => (
                <div className="stat-item" key={s.label}>
                  <div style={{
                    fontSize: "clamp(22px, 2vw, 30px)",
                    fontWeight: 900,
                    letterSpacing: "-0.03em",
                    color: "#fff",
                    lineHeight: 1,
                    marginBottom: 6,
                  }}>
                    {s.value}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.28)",
                    fontWeight: 500,
                    letterSpacing: "0.02em",
                  }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════════════════════════════ RIGHT PANEL ════════════════════════════ */}
        <div className="right-panel">
          {/* Subtle bottom glow */}
          <div style={{
            position: "absolute", bottom: 0, left: "50%",
            transform: "translateX(-50%)",
            width: "100%", height: "40%",
            background: "radial-gradient(ellipse at 50% 100%, rgba(232,25,44,0.055) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Mobile-only logo */}
          <div
            style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 52, position: "relative", zIndex: 1 }}
            className="mobile-logo"
          >
            <style>{`.mobile-logo { display: flex; } @media (min-width: 1024px) { .mobile-logo { display: none; } }`}</style>
            <div className="n-mark">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 2.5h3.5l5 9.2V2.5H14V15.5h-3.5L5.5 6.3V15.5H2V2.5z" fill="white" />
              </svg>
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, letterSpacing: "0.09em" }}>NORTHLY</div>
              <div style={{ color: "rgba(255,255,255,0.2)", fontWeight: 600, fontSize: 9, letterSpacing: "0.2em", marginTop: 3 }}>GROUP</div>
            </div>
          </div>

          <div className="form-wrap">
            {/* Label */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              marginBottom: 24,
              padding: "5px 12px",
              borderRadius: 20,
              background: "rgba(232,25,44,0.08)",
              border: "1px solid rgba(232,25,44,0.18)",
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#E8192C", boxShadow: "0 0 6px rgba(232,25,44,0.8)" }} />
              <span style={{ color: "#E8192C", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                Proposal IQ
              </span>
            </div>

            {/* Heading */}
            <h2 style={{
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "#fff",
              lineHeight: 1.1,
              marginBottom: 8,
            }}>
              Welcome back.
            </h2>
            <p style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.35)",
              lineHeight: 1.65,
              marginBottom: 32,
            }}>
              Sign in to access your internal<br />sales platform.
            </p>

            {/* Error */}
            {error && (
              <div style={{
                background: "rgba(232,25,44,0.08)",
                border: "1px solid rgba(232,25,44,0.22)",
                borderRadius: 10, padding: "12px 16px", marginBottom: 20,
                fontSize: 13, color: "#f87171", lineHeight: 1.5,
              }}>
                <strong>{error}</strong>{desc ? `: ${desc}` : ""}
              </div>
            )}

            {/* Google button */}
            <button className="google-btn" onClick={signInWithGoogle}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", color: "rgba(255,255,255,0.15)" }}>
                RESTRICTED ACCESS
              </span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>

            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.22)", textAlign: "center", lineHeight: 1.6 }}>
              Limited to{" "}
              <span style={{ color: "#E8192C", fontWeight: 600 }}>@northlygroup.com</span>{" "}
              accounts.
            </p>

            {/* Footer */}
            <div style={{
              marginTop: 56,
              paddingTop: 24,
              borderTop: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.12)", letterSpacing: "0.06em" }}>
                © 2025 Northly Group
              </span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.12)", letterSpacing: "0.06em" }}>
                Proposal IQ v2
              </span>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
