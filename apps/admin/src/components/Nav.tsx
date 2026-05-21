"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearToken } from "@/lib/api";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/instances/new", label: "New instance" },
  { href: "/frames", label: "Frames" },
  { href: "/payments", label: "Payments" },
  { href: "/sessions", label: "Sessions" },
];

export function Nav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname.startsWith("/instances/");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="admin-header">
      <Link href="/dashboard" className="admin-header__brand">
        <span className="admin-wordmark">Event Lab</span>
        <span className="admin-header__title">
          Photobooth
          <span>Admin</span>
        </span>
      </Link>
      <nav className="admin-nav" aria-label="Main">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`admin-nav__link ${isActive(href) ? "admin-nav__link--active" : ""}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="admin-header__actions">
        <button
          type="button"
          className="btn secondary btn--sm"
          onClick={() => {
            clearToken();
            window.location.href = "/login";
          }}
        >
          Log out
        </button>
      </div>
    </header>
  );
}
