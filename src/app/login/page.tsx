"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const STATS = [
  { value: "6M+", label: "Network audience" },
  { value: "120", label: "Social channels" },
  { value: "750M+", label: "Monthly views" },
  { value: "100M+", label: "Monthly reach" },
];

function NorthlyMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="8" fill="#E8192C" />
      <path d="M8 9h5.2l6.8 12.6V9H25v18h-5.2L13 14.4V27H8V9z" fill="white" />
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
    <main
      className="flex min-h-screen"
      style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", background: "#080808" }}
    >
      {/* ── Global noise texture ── */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          opacity: 0.4,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ════════════════════════════════════════
          LEFT PANEL
      ════════════════════════════════════════ */}
      <div
        className="hidden lg:flex"
        style={{
          width: "58%",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          background: "#080808",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Red atmospheric glow */}
        <div aria-hidden style={{
          position: "absolute", top: "-20%", right: "-20%",
          width: "70%", height: "70%",
          background: "radial-gradient(circle at 70% 20%, rgba(232,25,44,0.22) 0%, transparent 65%)",
          pointerEvents: "none",
        }} />
        {/* Subtle bottom fade */}
        <div aria-hidden style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "30%",
          background: "linear-gradient(to top, rgba(8,8,8,0.8) 0%, transparent 100%)",
          pointerEvents: "none",
        }} />

        <div style={{
          position: "relative", zIndex: 1,
          display: "flex", flexDirection: "column",
          height: "100%", padding: "52px 64px",
        }}>

          {/* Logo — one, top left, clean */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <NorthlyMark />
            <div style={{ lineHeight: 1 }}>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 13.5, letterSpacing: "0.1em" }}>
                NORTHLY
              </div>
              <div style={{ color: "rgba(255,255,255,0.22)", fontWeight: 700, fontSize: 8.5, letterSpacing: "0.2em", marginTop: 3 }}>
                GROUP
              </div>
            </div>
          </div>

          {/* Headline — massive, editorial */}
          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div>
              <div style={{
                color: "#E8192C",
                fontSize: 11, fontWeight: 700,
                letterSpacing: "0.22em", textTransform: "uppercase",
                marginBottom: 22,
              }}>
                Canada&apos;s Largest
              </div>
              <h1 style={{
                color: "#fff",
                fontSize: "clamp(56px, 5.4vw, 84px)",
                fontWeight: 900,
                lineHeight: 0.94,
                letterSpacing: "-0.05em",
                margin: 0,
              }}>
                SOCIAL<br />
                PUBLISHING<br />
                <span style={{ color: "rgba(255,255,255,0.18)" }}>NETWORK.</span>
              </h1>
            </div>
          </div>

          {/* Stats */}
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            paddingTop: 30,
            display: "flex",
          }}>
            {STATS.map((s, i) => (
              <div
                key={s.label}
                style={{
                  flex: 1,
                  paddingRight: i < 3 ? 20 : 0,
                  marginRight: i < 3 ? 20 : 0,
                  borderRight: i < 3 ? "1px solid rgba(255,255,255,0.07)" : "none",
                }}
              >
                <div style={{
                  color: "#fff",
                  fontSize: "clamp(20px, 1.9vw, 28px)",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  marginBottom: 5,
                }}>
                  {s.value}
                </div>
                <div style={{
                  color: "rgba(255,255,255,0.28)",
                  fontSize: 11,
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

      {/* ════════════════════════════════════════
          RIGHT PANEL — dark glass sign-in
      ════════════════════════════════════════ */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0c0c0c",
        padding: "60px 32px",
        position: "relative",
      }}>
        {/* Very subtle glow bottom */}
        <div aria-hidden style={{
          position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "120%", height: "35%",
          background: "radial-gradient(ellipse at 50% 100%, rgba(232,25,44,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Mobile logo */}
        <div className="lg:hidden" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 52 }}>
          <NorthlyMark />
          <div style={{ lineHeight: 1 }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, letterSpacing: "0.1em" }}>NORTHLY</div>
            <div style={{ color: "rgba(255,255,255,0.22)", fontWeight: 700, fontSize: 9, letterSpacing: "0.2em", marginTop: 3 }}>GROUP</div>
          </div>
        </div>

        <div style={{ width: "100%", maxWidth: 360, position: "relative", zIndex: 1 }}>

          {/* Label */}
          <div style={{
            color: "#E8192C",
            fontSize: 10.5, fontWeight: 700,
            letterSpacing: "0.18em", textTransform: "uppercase",
            marginBottom: 20,
          }}>
            Proposal IQ
          </div>

          {/* Heading */}
          <h2 style={{
            color: "#fff",
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1.08,
            margin: "0 0 10px",
          }}>
            Welcome back.
          </h2>
          <p style={{
            color: "rgba(255,255,255,0.32)",
            fontSize: 14.5,
            lineHeight: 1.65,
            margin: "0 0 36px",
          }}>
            Sign in to access the Northly<br />internal sales platform.
          </p>

          {error && (
            <div style={{
              background: "rgba(232,25,44,0.08)",
              border: "1px solid rgba(232,25,44,0.25)",
              borderRadius: 10, padding: "12px 16px", marginBottom: 20,
              fontSize: 13, color: "#f87171", lineHeight: 1.5,
            }}>
              <strong>{error}</strong>{desc ? `: ${desc}` : ""}
            </div>
          )}

          {/* Google sign-in — dark, premium */}
          <button
            onClick={signInWithGoogle}
            style={{
              width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              padding: "14px 20px",
              borderRadius: 11,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              cursor: "pointer",
              fontSize: 15, fontWeight: 600, color: "#fff",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.09)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "24px 0" }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
            <span style={{ color: "rgba(255,255,255,0.16)", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em" }}>
              RESTRICTED ACCESS
            </span>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
          </div>

          <p style={{
            margin: 0,
            fontSize: 12.5,
            color: "rgba(255,255,255,0.22)",
            textAlign: "center",
            lineHeight: 1.6,
          }}>
            Limited to{" "}
            <span style={{ color: "rgba(232,25,44,0.9)", fontWeight: 600 }}>@northlygroup.com</span>{" "}
            accounts only.
          </p>

          {/* Footer */}
          <div style={{
            marginTop: 56,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: 4, background: "#E8192C",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 8.5, lineHeight: 1 }}>N</span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.14)", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em" }}>
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
