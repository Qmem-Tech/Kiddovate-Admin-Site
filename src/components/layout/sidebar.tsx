"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Users,
  Lock,
  LogOut,
  Gamepad2,
  BarChart3,
  Globe,
  Settings,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import toast from "react-hot-toast";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/content", label: "Content", icon: FileText },
  { href: "/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/users", label: "Users", icon: Users },
  { href: "/subscription", label: "Subscription", icon: Lock },
  { href: "/website", label: "Website", icon: Globe },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut(auth);
    toast.success("Logged out");
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-72 bg-white shadow-kiddovate-lg transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-20 items-center justify-between bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 px-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Gamepad2 className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-bold">Kiddovate</div>
              <div className="text-xs text-primary-100">Admin Panel</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 lg:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            ✕
          </Button>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Navigation
          </p>
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                  active
                    ? "bg-primary-50 text-primary-700 border-l-4 border-primary-500 shadow-sm"
                    : "text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                )}
                onClick={onClose}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    active
                      ? "text-primary-600"
                      : "text-gray-500 group-hover:text-primary-500"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <Button
            variant="destructive"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
    </>
  );
}