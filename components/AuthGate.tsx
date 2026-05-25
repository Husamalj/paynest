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
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || !role) {
      router.replace("/");
      return;
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
      router.replace(getDefaultPath(role));
    }
  }, [allowedRoles, router]);

  return <>{children}</>;
}
