"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/browser";

type Props = { transparent?: boolean };

export default function MarketingNav({ transparent = true }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | undefined;
    try {
      const supabase = createClient();
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (mounted) setIsAuthenticated(!!session);
      });
      const sub = supabase.auth.onAuthStateChange((_event, session) => {
        setIsAuthenticated(!!session);
      });
      subscription = sub.data.subscription;
    } catch {
      /* env missing in some contexts */
    }
    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const navLinks: { label: string; href: string }[] = [
    { label: "New Appeal", href: "/start" },
    ...(isAuthenticated
      ? [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Queue", href: "/queue" },
        ]
      : []),
    { label: "Pricing", href: "/pricing" },
    { label: "History", href: "/appeal-history" },
  ];

  const isActive = (href: string) => {
    if (href === "/start") {
      return pathname.startsWith("/start") || pathname.startsWith("/upload");
    }
    if (href === "/dashboard") return pathname.startsWith("/dashboard");
    if (href === "/queue") return pathname.startsWith("/queue");
    return pathname === href || pathname.startsWith(href + "/");
  };

  const baseStyle: CSSProperties = transparent
    ? {
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }
    : { background: "#0f172a", borderBottom: "1px solid #1e293b" };

  const linkStyle = (href: string): CSSProperties => ({
    padding: "6px 14px",
    fontSize: 14,
    fontWeight: isActive(href) ? 600 : 500,
    color: isActive(href) ? "white" : "rgba(255,255,255,0.65)",
    textDecoration: "none",
    borderRadius: 6,
    background: isActive(href) ? "rgba(59,130,246,0.2)" : "transparent",
    border: isActive(href) ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
    transition: "all 0.15s ease",
  });

  const logout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      /* still navigate */
    }
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <nav
      style={{
        ...baseStyle,
        position: "sticky",
        top: 0,
        zIndex: 1000,
        fontFamily: '"Inter", -apple-system, sans-serif',
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .marketing-nav-desktop { display: none !important; }
          .marketing-nav-burger {
            display: flex !important;
            align-items: center;
            justify-content: center;
          }
        }
      `}</style>
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 60,
        }}
      >
        <Link
          href="/"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              background: "linear-gradient(135deg, #3b82f6, #1e40af)",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
              color: "white",
              flexShrink: 0,
            }}
          >
            M
          </div>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "white",
              letterSpacing: "-0.3px",
              whiteSpace: "nowrap",
            }}
          >
            Denial Appeal Pro
          </span>
        </Link>

        <div
          className="marketing-nav-desktop"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} prefetch style={linkStyle(link.href)}>
              {link.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => void logout()}
              style={{
                marginLeft: 8,
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.35)",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Log out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/login")}
              style={{
                marginLeft: 8,
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 600,
                color: "#0f172a",
                background: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Log in
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push("/start")}
            style={{
              marginLeft: 8,
              padding: "7px 18px",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              background: "#22c55e",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            New Appeal →
          </button>
        </div>

        <button
          type="button"
          className="marketing-nav-burger"
          onClick={() => setMenuOpen((o) => !o)}
          style={{
            display: "none",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            color: "white",
            fontSize: 22,
          }}
          aria-label="Toggle menu"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <div
          style={{
            background: "#0f172a",
            borderTop: "1px solid #1e293b",
            padding: "12px 24px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch
              onClick={() => setMenuOpen(false)}
              style={{
                padding: "10px 14px",
                fontSize: 15,
                fontWeight: 500,
                color: isActive(link.href) ? "white" : "rgba(255,255,255,0.7)",
                textDecoration: "none",
                borderRadius: 6,
                background: isActive(link.href) ? "rgba(59,130,246,0.2)" : "transparent",
              }}
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              if (isAuthenticated) {
                void logout();
              } else {
                router.push("/login");
                setMenuOpen(false);
              }
            }}
            style={{
              marginTop: 8,
              padding: "10px 18px",
              fontSize: 15,
              fontWeight: 600,
              color: "white",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: 6,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {isAuthenticated ? "Log out" : "Log in"}
          </button>
          <button
            type="button"
            onClick={() => {
              router.push("/start");
              setMenuOpen(false);
            }}
            style={{
              marginTop: 8,
              padding: "10px 18px",
              fontSize: 15,
              fontWeight: 600,
              color: "#fff",
              background: "#22c55e",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            New Appeal →
          </button>
        </div>
      )}
    </nav>
  );
}
