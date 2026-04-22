"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

export default function AdminSidebar({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("ADMIN");

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("user");

      if (!rawUser) {
        setUserRole("ADMIN");
        return;
      }

      const parsedUser = JSON.parse(rawUser) as StoredUser;
      setUserRole(parsedUser?.role || "ADMIN");
    } catch {
      setUserRole("ADMIN");
    }
  }, []);

  const menuItems = useMemo(() => {
    if (userRole === "OPERATOR") {
      return [
        { href: "/operator/dashboard", label: "Dashboard", emoji: "🎟️" },
        { href: "/operator/events", label: "Eventos", emoji: "🎫" },
        { href: "/operator/orders", label: "Pedidos", emoji: "🧾" },
        { href: "/operator/checkin", label: "Check-in", emoji: "✅" },
      ];
    }

    return [
      { href: "/dashboard", label: "Dashboard", emoji: "🎟️" },
      { href: "/organizers", label: "Organizadores", emoji: "🏢" },
      { href: "/events", label: "Eventos", emoji: "🎫" },
      { href: "/orders", label: "Pedidos", emoji: "🧾" },
      { href: "/support", label: "Atendimentos", emoji: "💬" },
      { href: "/checkin", label: "Check-in", emoji: "✅" },
    ];
  }, [userRole]);

  function isActive(href: string) {
    if (pathname === href) return true;
    return pathname.startsWith(`${href}/`);
  }

  function goTo(href: string) {
    setOpen(false);
    window.location.href = href;
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-[60] flex h-11 w-11 items-center justify-center rounded-xl bg-black text-white shadow-lg"
        aria-label="Abrir menu"
      >
        ☰
      </button>

      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40"
          aria-label="Fechar menu"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-full w-[280px] bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-xl font-bold">
              {userRole === "OPERATOR" ? "Painel Operador" : "Painel Admin"}
            </h2>
            <p className="text-sm text-gray-500">Plataforma de ingressos</p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border"
            aria-label="Fechar menu"
          >
            ✕
          </button>
        </div>

        <nav className="space-y-2 p-4">
          {menuItems.map((item) => {
            const active = isActive(item.href);

            return (
              <button
                key={item.href}
                type="button"
                onClick={() => goTo(item.href)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                  active
                    ? "bg-black text-white"
                    : "text-gray-800 hover:bg-gray-100"
                }`}
              >
                <span>{item.emoji}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="block w-full rounded-xl bg-red-600 px-4 py-3 text-center font-medium text-white hover:bg-red-700"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="min-h-screen p-6 pt-20">{children}</main>
    </div>
  );
}