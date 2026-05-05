"use client";

import { useEffect, useState } from "react";
import CustomerHeader, {
  type CustomerHeaderUser,
} from "../../components/customer/CustomerHeader";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, setUser] = useState<CustomerHeaderUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!rawUser) {
      window.location.href = "/dashboard";
      return;
    }

    try {
      const parsedUser = JSON.parse(rawUser) as CustomerHeaderUser;
      const role = String(parsedUser.role || "").toUpperCase();

      if (role !== "ADMIN" && role !== "OPERATOR") {
        window.location.href = "/dashboard";
        return;
      }

      setUser(parsedUser);
    } catch (error) {
      console.error("Erro ao ler usuário:", error);
      window.location.href = "/login";
      return;
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-[#f6f7fb] px-4 py-10 text-slate-950">
        <div className="mx-auto max-w-[1180px] rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-bold text-slate-600">
            Carregando área administrativa...
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <CustomerHeader
        user={user}
        activeNav="dashboard"
        showSearch={false}
        searchPlaceholder="Buscar no painel"
      />

      <div className="min-h-[calc(100vh-81px)]">
        {children}
      </div>
    </div>
  );
}