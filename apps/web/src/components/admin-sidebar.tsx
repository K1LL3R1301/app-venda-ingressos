"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", emoji: "🎟️" },
  { href: "/organizers", label: "Organizadores", emoji: "🏢" },
  { href: "/events", label: "Eventos", emoji: "🎫" },
  { href: "/orders", label: "Pedidos", emoji: "🧾" },
  { href: "/checkin", label: "Check-in", emoji: "✅" },
];

export default function AdminSidebar({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-[60] flex h-11 w-11 items-center justify-center rounded-xl bg-black text-white shadow-lg"
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
        className={`fixed top-0 left-0 z-50 h-full w-[280px] bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-xl font-bold">Painel Admin</h2>
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

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                  active
                    ? "bg-black text-white"
                    : "text-gray-800 hover:bg-gray-100"
                }`}
              >
                <span>{item.emoji}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t p-4">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="block w-full rounded-xl border px-4 py-3 text-center font-medium hover:bg-gray-50"
          >
            Voltar para dashboard
          </Link>
        </div>
      </aside>

      <main className="min-h-screen p-6 pt-20">{children}</main>
    </div>
  );
}