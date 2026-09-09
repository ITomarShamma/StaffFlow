"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 h-14">
      {items.map((it) => {
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`h-14 px-3 flex items-center text-white text-[15px] font-medium border-b-[3px] box-border hover:bg-navy-800 ${
              active ? "border-indigo-400 opacity-100" : "border-transparent opacity-80"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
