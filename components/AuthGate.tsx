"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function getDefaultPath(role: string): string {
  if (role === "super_admin") return "/super-admin";
  if (role === "employee") return "/employee-portal";
  return "/dashboard";
}

interface AuthGateProps {
  allowedRoles?: string[];
  children: React.ReactNode;
}

export default function AuthGate({ allowedRoles, children }: AuthGateProps) {
  const router = useRouter();

  useEffect(() => {
    // The credential is an httpOnly cookie (not readable here). Gate the UI on
    // the non-sensitive role/flag; the server still enforces real auth per API call.
    const loggedIn = localStorage.getItem("paynest_logged_in");
    const role = localStorage.getItem("role");

    if (!loggedIn || !role) {
      router.replace("/");
      return;
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
      router.replace(getDefaultPath(role));
    }
  }, [allowedRoles, router]);

  return <>{children}</>;
}
