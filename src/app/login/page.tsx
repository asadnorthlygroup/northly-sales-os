"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";

const BRANDS = [
  "Waveroom", "Night Out", "Northly", "Penalty Room",
  "Got Deals", "Must Be.", "Housing Watch", "Canada Blogs", "Bites.",
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
          "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents",
      },
    });
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: #070707; }

        .login-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #070707;
          color: #fff;
          position: relative;
        }

        /* grain texture */
        .login-page::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 0.032;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }

        /* top red glow */
        .login-page::after {
          content: '';
          position: fixed;
          top: -30%;
          left: 50%;
          transform: translateX(-50%);
          width: 80%;
          height: 60%;
          background: radial-gradient(ellipse at 50% 0%, rgba(232,25,44,0.13) 0%, transparent 65%);
          pointer-events: none;
          z-index: 0;
        }

        /* ── Nav ── */
        .nav {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 48px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        @media (max-width: 640px) { .nav { padding: 20px 24px; } }

        .logo-lockup {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* ── Main hero ── */
        .hero {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 80px 24px 60px;
          position: relative;
          z-index: 1;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 14px;
          border-radius: 20px;
          background: rgba(232,25,44,0.08);
          border: 1px solid rgba(232,25,44,0.2);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: #E8192C;
          text-transform: uppercase;
          margin-bottom: 28px;
        }
        .eyebrow-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #E8192C;
          box-shadow: 0 0 6px rgba(232,25,44,0.9);
        }

        h1.headline {
          font-size: clamp(40px, 5.5vw, 72px);
          font-weight: 900;
          line-height: 1.02;
          letter-spacing: -0.05em;
          margin-bottom: 20px;
          background: linear-gradient(170deg, #ffffff 30%, rgba(255,255,255,0.48) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          max-width: 760px;
        }

        p.sub {
          font-size: 17px;
          color: rgba(255,255,255,0.38);
          line-height: 1.65;
          max-width: 420px;
          margin-bottom: 44px;
          font-weight: 400;
        }

        /* ── Form card ── */
        .form-card {
          width: 100%;
          max-width: 380px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 28px;
          margin-bottom: 20px;
        }

        .google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 11px;
          padding: 14px 20px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          color: #fff;
          font-family: inherit;
          transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
          margin-bottom: 20px;
        }
        .google-btn:hover {
          background: rgba(255,255,255,0.09);
          border-color: rgba(255,255,255,0.18);
          box-shadow: 0 0 0 3px rgba(232,25,44,0.1);
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.06); }
        .divider-text {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.15);
        }

        .restrict-note {
          font-size: 12.5px;
          color: rgba(255,255,255,0.22);
          text-align: center;
          line-height: 1.6;
        }

        /* ── Brand strip ── */
        .brand-strip {
          position: relative;
          z-index: 1;
          border-top: 1px solid rgba(255,255,255,0.05);
          padding: 32px 48px 40px;
          text-align: center;
        }
        @media (max-width: 640px) { .brand-strip { padding: 28px 24px 36px; } }

        .brand-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          color: rgba(255,255,255,0.18);
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .brand-list {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 0;
        }

        .brand-name {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.25);
          letter-spacing: 0.03em;
          padding: 6px 18px;
          border-right: 1px solid rgba(255,255,255,0.07);
          white-space: nowrap;
          transition: color 0.15s;
        }
        .brand-name:last-child { border-right: none; }
        .brand-name:hover { color: rgba(255,255,255,0.55); }
      `}</style>

      <div className="login-page">

        {/* ── NAV ── */}
        <nav className="nav">
          <div className="logo-lockup">
            <Image
              src="/asset_1.png"
              alt="Northly Group"
              width={148}
              height={48}
              style={{ objectFit: "contain", objectPosition: "left", filter: "brightness(0) invert(1)", opacity: 0.88 }}
              priority
            />
          </div>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
            color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
          }}>
            Internal Platform
          </div>
        </nav>

        {/* ── HERO ── */}
        <main className="hero">
          <div className="eyebrow">
            <div className="eyebrow-dot" />
            Proposal IQ
          </div>

          <h1 className="headline">
            The Sales OS for Canada&apos;s<br />
            Largest Social Publisher.
          </h1>

          <p className="sub">
            Build five-option proposals in minutes. Live pricing,
            AI drafts, and Google Docs export — all in one place.
          </p>

          {/* Form card */}
          <div className="form-card">
            {error && (
              <div style={{
                background: "rgba(232,25,44,0.08)", border: "1px solid rgba(232,25,44,0.22)",
                borderRadius: 10, padding: "12px 16px", marginBottom: 18,
                fontSize: 13, color: "#f87171", lineHeight: 1.5,
              }}>
                <strong>{error}</strong>{desc ? `: ${desc}` : ""}
              </div>
            )}

            <button className="google-btn" onClick={signInWithGoogle}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <div className="divider">
              <div className="divider-line" />
              <span className="divider-text">RESTRICTED ACCESS</span>
              <div className="divider-line" />
            </div>

            <p className="restrict-note">
              Limited to{" "}
              <span style={{ color: "#E8192C", fontWeight: 600 }}>@northlygroup.com</span>
              {" "}accounts only.
            </p>
          </div>
        </main>

        {/* ── BRAND STRIP ── */}
        <footer className="brand-strip">
          <p className="brand-label">Our Network — 9 Brands · 120 Channels · 6M+ Audience</p>
          <div className="brand-list">
            {BRANDS.map((b) => (
              <span className="brand-name" key={b}>{b}</span>
            ))}
          </div>
        </footer>

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
