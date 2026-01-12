"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Menu, Bell } from "lucide-react";

export function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setEmail(u?.email ?? null));
    return () => unsub();
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onToggleSidebar}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden lg:block">
            <div className="text-lg font-semibold text-gray-900">
              Kiddovate Admin
            </div>
            <div className="text-sm text-gray-500">
              Manage content & feedback
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>
          <div className="hidden md:flex items-center gap-3 pl-3 border-l border-gray-200">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-secondary-600 to-primary-500 text-white text-sm font-semibold">
              {(email?.[0] ?? "A").toUpperCase()}
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {email?.split("@")[0] ?? "Admin"}
              </div>
              <div className="text-xs text-gray-500">Administrator</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

