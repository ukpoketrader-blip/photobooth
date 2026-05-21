"use client";

import type { ReactNode } from "react";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="admin-shell">
      <div className="admin-ambient" aria-hidden>
        <span className="admin-ambient__orb admin-ambient__orb--1" />
        <span className="admin-ambient__orb admin-ambient__orb--2" />
      </div>
      {children}
    </div>
  );
}
