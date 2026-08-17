"use client";

import { useEffect, useRef, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Menu, Bell } from "lucide-react";
import Link from "next/link";

type NotificationItem = {
  id: string;
  message: string;
  email?: string | null;
  createdAt?: any;
};

const LAST_READ_KEY = "kiddovate_admin_notifications_last_read";

function formatRelativeTime(timestamp: any): string {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const [email, setEmail] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [lastReadAt, setLastReadAt] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setEmail(u?.email ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(LAST_READ_KEY) : null;
    setLastReadAt(stored ? Number(stored) : 0);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"), limit(10));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: NotificationItem[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            message: data.message || data.feedback || "New feedback received",
            email: data.email ?? null,
            createdAt: data.createdAt ?? null,
          });
        });
        setNotifications(list);
      },
      () => setNotifications([])
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => {
    const ts = n.createdAt?.toDate ? n.createdAt.toDate().getTime() : n.createdAt ? new Date(n.createdAt).getTime() : 0;
    return ts > lastReadAt;
  }).length;

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      const now = Date.now();
      setLastReadAt(now);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LAST_READ_KEY, String(now));
      }
    }
  };

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
          <div className="relative" ref={panelRef}>
            <Button variant="ghost" size="icon" aria-label="Notifications" onClick={toggleOpen}>
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
            {isOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <span className="text-sm font-semibold text-gray-900">Notifications</span>
                  <Link
                    href="/feedback"
                    className="text-xs font-medium text-primary-600 hover:underline"
                    onClick={() => setIsOpen(false)}
                  >
                    View all
                  </Link>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <Link
                        key={n.id}
                        href="/feedback"
                        className="block border-b border-gray-50 px-4 py-3 last:border-b-0 hover:bg-gray-50"
                        onClick={() => setIsOpen(false)}
                      >
                        <div className="text-sm text-gray-900 line-clamp-2">{n.message}</div>
                        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                          <span>{n.email ?? "Anonymous"}</span>
                          <span>{formatRelativeTime(n.createdAt)}</span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
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