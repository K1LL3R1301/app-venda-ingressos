"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import CustomerHeader, {
  type CustomerHeaderUser,
} from "../../components/customer/CustomerHeader";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<CustomerHeaderUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    try {
      const rawUser = localStorage.getItem("user");

      if (!rawUser) {
        setUser(null);
        return;
      }

      const parsedUser = JSON.parse(rawUser) as CustomerHeaderUser;
      setUser(parsedUser);
    } catch (error) {
      console.error("Erro ao ler usuário do localStorage:", error);
      setUser(null);
    }
  }, []);

  function getActiveNav():
    | "dashboard"
    | "orders"
    | "wallet"
    | "support" {
    if (pathname.startsWith("/customer/orders")) return "orders";
    if (pathname.startsWith("/customer/wallet")) return "wallet";
    if (pathname.startsWith("/customer/support")) return "support";
    return "dashboard";
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-gray-900">
      <CustomerHeader user={user} activeNav={getActiveNav()} />
      {children}
    </div>
  );
}