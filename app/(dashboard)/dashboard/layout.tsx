"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { FileText, GearSix, House, UserCircle } from "@phosphor-icons/react";
import { cn } from "@reactive-resume/utils";

const navigation = [
  { name: "Resumes", href: "/dashboard/resumes", icon: FileText },
  { name: "Profile", href: "/dashboard/profile", icon: UserCircle },
  { name: "Settings", href: "/dashboard/settings", icon: GearSix },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-secondary/30">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <House className="h-5 w-5" />
            NXResume
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/60 hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4">
          <div className="px-4 text-xs text-muted-foreground">
            <a
              href="https://webv1.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition"
            >
              Built by webv1.com
            </a>
          </div>
          <div className="border-t p-4">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="container py-8">{children}</div>
      </main>
    </div>
  );
}
