"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "Visão geral", href: "/admin/super" },
  { label: "Organizadores", href: "/admin/super/organizers" },
  { label: "Eventos", href: "/admin/super/events" },
  { label: "Pedidos", href: "/admin/super/orders" },
  { label: "Receita", href: "/admin/super/finance" },
  { label: "Relatórios", href: "/admin/super/reports" },
  { label: "Operadores", href: "/admin/super/operators" },
  { label: "Taxas", href: "/admin/super/fees" },
  { label: "Suporte", href: "/admin/super/support" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin/super") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SuperAdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-2 rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
      {items.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
              active
                ? "bg-slate-950 text-white shadow-sm"
                : "text-slate-700 hover:bg-slate-950 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}

      <Link
        href="/admin/dashboard"
        className="ml-auto rounded-2xl bg-orange-50 px-4 py-3 text-sm font-black text-orange-700 ring-1 ring-orange-200 transition hover:bg-orange-600 hover:text-white"
      >
        Meu painel admin
      </Link>
    </nav>
  );
}