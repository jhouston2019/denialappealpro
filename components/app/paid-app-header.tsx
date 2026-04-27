"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { createClient } from "@/lib/supabase/browser";
import { TEXT_ON_SLATE, TEXT_MUTED_ON_SLATE } from "@/lib/theme/app-shell";

const linkBase: CSSProperties = {
  color: "#86efac",
  fontWeight: 600,
  fontSize: 14,
  textDecoration: "none",
};
const linkActive: CSSProperties = {
  ...linkBase,
  textDecoration: "underline",
  textUnderlineOffset: 3,
};

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link href={href} style={active ? linkActive : linkBase} prefetch>
      {children}
    </Link>
  );
}

export default function PaidAppHeader() {
  const router = useRouter();

  const logout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      /* still navigate */
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <header
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
        padding: "10px 20px",
        background: "rgba(15, 23, 42, 0.95)",
        borderBottom: "1px solid rgba(148, 163, 184, 0.25)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 15, color: TEXT_ON_SLATE, marginRight: 8 }}>Denial Appeal Pro</span>
      <nav style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
        <NavLink href="/dashboard">Dashboard</NavLink>
        <NavLink href="/queue">Queue</NavLink>
        <NavLink href="/start">New denial</NavLink>
        <NavLink href="/account">Account</NavLink>
        <Link href="/pricing" style={linkBase}>
          Plans
        </Link>
      </nav>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12, color: TEXT_MUTED_ON_SLATE }}>Signed in</span>
        <button
          type="button"
          onClick={() => void logout()}
          style={{
            padding: "6px 12px",
            fontSize: 13,
            cursor: "pointer",
            background: "transparent",
            border: "1px solid rgba(148, 163, 184, 0.4)",
            color: TEXT_ON_SLATE,
            borderRadius: 6,
          }}
        >
          Log out
        </button>
      </div>
    </header>
  );
}
