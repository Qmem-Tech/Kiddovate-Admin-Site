"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ShieldCheck, ShieldX } from "lucide-react";

type UserRow = {
  id: string; // doc id = uid
  email?: string | null;
  createdAt?: unknown;
  lastLoginAt?: unknown;
  premium_override?: boolean | null; // optional manual override
  is_subscribed?: boolean | null; // RevenueCat subscription status
  subscription_updated_at?: unknown;
  platform?: string | null;
};

function formatDate(ts: unknown) {
  if (!ts) return "—";
  const d = ts && typeof ts === "object" && "toDate" in ts && typeof ts.toDate === "function" ? ts.toDate() : new Date(ts as number | string | Date);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

export function UsersTable() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: UserRow[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<UserRow, "id">) }));
        setRows(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading users:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("permission") || errorMessage.includes("PERMISSION_DENIED")) {
          toast.error("Permission denied. Please ensure your account has admin custom claims set.");
        } else {
          toast.error(`Failed to load users: ${errorMessage}`);
        }
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) => {
      return (
        r.id.toLowerCase().includes(s) ||
        (r.email ?? "").toLowerCase().includes(s) ||
        (r.platform ?? "").toLowerCase().includes(s)
      );
    });
  }, [rows, search]);

  const setOverride = async (uid: string, value: boolean | null) => {
    try {
      // merge so you can create docs from admin too
      await setDoc(doc(db, "users", uid), { premium_override: value }, { merge: true });
      toast.success("Updated");
    } catch {
      toast.error("Update failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
          <p className="text-gray-500">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Card className="border-0 shadow-kiddovate">
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Lists documents in Firestore <code>users</code>. (If empty, the mobile app needs to write user profiles.)
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search uid, email, platform..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-sm text-gray-600 flex items-center justify-between md:justify-end">
            <span className="hidden md:inline">Total:</span>
            <span className="font-semibold text-gray-900">{filtered.length}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-kiddovate">
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-500">No users found.</div>
          ) : (
            <div className="divide-y divide-gray-200 rounded-xl border border-gray-200">
              {filtered.map((u) => (
                <div key={u.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 break-all">{u.email ?? "Anonymous / no email"}</div>
                    <div className="text-sm text-gray-500 break-all">uid: {u.id}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      created: {formatDate(u.createdAt)} • last seen: {formatDate(u.lastLoginAt)} • platform:{" "}
                      {u.platform ?? "—"}
                      {u.subscription_updated_at != null && (
                        <> • sub updated: {formatDate(u.subscription_updated_at)}</>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        u.is_subscribed === true
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      RevenueCat: {u.is_subscribed === true ? "Subscribed" : u.is_subscribed === false ? "Not Subscribed" : "Unknown"}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        u.premium_override === true
                          ? "bg-green-100 text-green-800"
                          : u.premium_override === false
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      override:{" "}
                      {u.premium_override === true ? "subscribed" : u.premium_override === false ? "locked" : "none"}
                    </span>

                    <Button variant="outline" size="sm" onClick={() => setOverride(u.id, true)}>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Force Premium
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setOverride(u.id, false)}>
                      <ShieldX className="mr-2 h-4 w-4" />
                      Force Locked
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setOverride(u.id, null)}>
                      Clear Override
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

