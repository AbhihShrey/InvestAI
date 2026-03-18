"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { fetchMarketHours } from "@/lib/api";
import { logout } from "@/lib/auth";

export function AppBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [time, setTime] = useState("");
  const [marketOpen, setMarketOpen] = useState<boolean | null>(null);

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

  useEffect(() => {
    fetchMarketHours()
      .then((h) => setMarketOpen(h.equityMarketOpen))
      .catch(() => setMarketOpen(null));
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
        <span
          className={`app-header-tag ${
            marketOpen === true
              ? "running"
              : marketOpen === false
                ? "market-closed"
                : "running"
          }`}
          title={
            marketOpen === true
              ? "Market Open"
              : marketOpen === false
                ? "Market Closed"
                : "Market status"
          }
        >
          {marketOpen === true
            ? "Open"
            : marketOpen === false
              ? "Closed"
              : "v1.0"}
        </span>
        <nav className="app-header-links" style={{ marginLeft: 16 }}>
          <Link
            href="/"
            className={`app-header-link ${pathname === "/" ? "active" : ""}`}
          >
            CHARTS
          </Link>
          <Link
            href="/markets"
            className={`app-header-link ${pathname === "/markets" ? "active" : ""}`}
          >
            MARKETS
          </Link>
          <Link
            href="/gex"
            className={`app-header-link ${pathname === "/gex" ? "active" : ""}`}
          >
            GEX
          </Link>
          <Link
            href="/options"
            className={`app-header-link ${pathname === "/options" ? "active" : ""}`}
          >
            OPTIONS
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
