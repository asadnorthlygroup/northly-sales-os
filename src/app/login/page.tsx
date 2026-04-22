"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";

const STATS = [
  { value: "6M", label: "Network audience" },
  { value: "120", label: "Social channels" },
  { value: "750M", label: "Monthly views" },
  { value: "100M", label: "Monthly reach" },
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
        scopes: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents",
      },
    });
  }

  return (
    <main className="flex min-h-screen" style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>

      {/* ══════════════════════════════════════
          LEFT — brand panel with real banner image
          hidden on mobile, visible lg+
      ══════════════════════════════════════ */}
      <div className="hidden lg:flex" style={{
        width: "56%",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Banner image — fills the panel, cropped to show mountains */}
        <Image
          src="/asset_0.jpg"
          alt="Northly Group"
          fill
          style={{ objectFit: "cover", objectPosition: "left center" }}
          priority
        />

        {/* Dark overlay so text is always readable */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.5) 100%)",
        }} />

        {/* Bottom gradient — strong, for stats legibility */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "45%",
          background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%)",
        }} />

        {/* Content layer */}
        <div style={{
          position: "relative", zIndex: 1,
          display: "flex", flexDirection: "column",
          height: "100%", padding: "44px 52px",
        }}>

          {/* Real Northly Group logo (white version) */}
          <div>
            <Image
              src="/asset_2.png"
              alt="Northly Group"
              width={180}
              height={60}
              style={{ objectFit: "contain", objectPosition: "left" }}
            />
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Headline — mimics the banner typography */}
          <div style={{ marginBottom: 40 }}>
            <div style={{
              color: "#E8192C",
              fontSize: 12, fontWeight: 800,
              letterSpacing: "0.18em", textTransform: "uppercase",
              marginBottom: 12,
            }}>
              Canada&apos;s Largest
            </div>
            <h1 style={{
              color: "#fff", margin: 0,
              fontSize: "clamp(36px, 3.6vw, 54px)",
              fontWeight: 900, lineHeight: 1.06,
              letterSpacing: "-0.04em",
            }}>
              Social Publishing<br />Network.
            </h1>
          </div>

          {/* Stats row — exactly as in banner */}
          <div style={{
            display: "flex",
            gap: 0,
            borderTop: "1px solid rgba(255,255,255,0.15)",
            paddingTop: 28,
            marginBottom: 0,
          }}>
            {STATS.map((s, i) => (
              <div key={s.label} style={{
                flex: 1,
                paddingRight: i < STATS.length - 1 ? 24 : 0,
                marginRight: i < STATS.length - 1 ? 24 : 0,
                borderRight: i < STATS.length - 1 ? "1px solid rgba(255,255,255,0.12)" : "none",
              }}>
                <div style={{
                  color: "#fff",
                  fontSize: "clamp(20px, 2vw, 30px)",
                  fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1,
                  marginBottom: 5,
                }}>
                  {s.value}
                </div>
                <div style={{
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 11, fontWeight: 500, letterSpacing: "0.02em",
                  lineHeight: 1.3,
                }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════
          RIGHT — clean white sign-in panel
      ══════════════════════════════════════ */}
      <div style={{
        flex: 1,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#ffffff",
        padding: "60px 32px",
        position: "relative",
        borderLeft: "1px solid #f0f0f0",
      }}>

        {/* Mobile-only logo */}
        <div className="lg:hidden" style={{ marginBottom: 48 }}>
          <Image
            src="/asset_1.png"
            alt="Northly Group"
            width={160}
            height={54}
            style={{ objectFit: "contain" }}
          />
        </div>

        <div style={{ width: "100%", maxWidth: 380, position: "relative" }}>

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
              Proposal IQ — Internal
            </span>
          </div>

          {/* Heading */}
          <h2 style={{
            fontSize: 34, fontWeight: 900,
            letterSpacing: "-0.04em", color: "#080808",
            margin: "0 0 10px", lineHeight: 1.06,
          }}>
            Sign in to your<br />workspace.
          </h2>
          <p style={{
            color: "rgba(0,0,0,0.38)", fontSize: 15,
            margin: "0 0 36px", lineHeight: 1.6,
          }}>
            Northly Sales OS — your internal tool for<br />
            building and closing proposals.
          </p>

          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 10, padding: "12px 16px", marginBottom: 20,
              fontSize: 13, color: "#dc2626", lineHeight: 1.4,
            }}>
              <strong>{error}</strong>{desc ? `: ${desc}` : ""}
            </div>
          )}

          {/* Google button */}
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

          <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "22px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#f0f0f0" }} />
            <span style={{ color: "rgba(0,0,0,0.2)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>
              RESTRICTED ACCESS
            </span>
            <div style={{ flex: 1, height: 1, background: "#f0f0f0" }} />
          </div>

          <p style={{ margin: 0, fontSize: 13, color: "rgba(0,0,0,0.3)", textAlign: "center", lineHeight: 1.6 }}>
            Limited to{" "}
            <span style={{ color: "#E8192C", fontWeight: 700 }}>@northlygroup.com</span>{" "}
            accounts only.
          </p>

          {/* Footer brand */}
          <div style={{
            marginTop: 52, borderTop: "1px solid #f3f4f6", paddingTop: 24,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Image
              src="/asset_1.png"
              alt="Northly Group"
              width={100}
              height={34}
              style={{ objectFit: "contain", opacity: 0.12 }}
            />
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
