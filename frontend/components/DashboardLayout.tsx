"use client";

import { usePathname } from "next/navigation";
import { AppBar } from "./AppBar";

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage =
    pathname === "/login" || pathname === "/register";

  return (
    <>
      {!isAuthPage && <AppBar />}
      {children}
    </>
  );
}
