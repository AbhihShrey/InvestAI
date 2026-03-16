"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { logout } from "@/lib/auth";

export function AppBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [time, setTime] = useState("");

  useEffect(() => {
    const format = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    format();
    const id = setInterval(format, 1000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <header className="app-header">
      <div className="app-header-left">
        <span className="app-status-dot alive" aria-hidden />
        <h1>InvestAI</h1>
        <span className="app-header-tag running">v1.0</span>
        <nav className="app-header-links" style={{ marginLeft: 16 }}>
          <Link
            href="/"
            className={`app-header-link ${pathname === "/" ? "active" : ""}`}
          >
            CHARTS
          </Link>
        </nav>
      </div>
      <div className="app-header-right">
        <span className="app-header-clock" id="clock">
          {time}
        </span>
        <button
          type="button"
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title={theme === "light" ? "Switch to dark" : "Switch to light"}
          aria-label="Toggle theme"
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="app-header-link"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
