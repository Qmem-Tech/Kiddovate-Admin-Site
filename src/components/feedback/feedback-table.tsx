"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Search, Mail, Calendar } from "lucide-react";

type Feedback = {
  id: string;
  user_email?: string | null;
  subject?: string;
  message: string;
  type?: "suggestion" | "bug" | "question" | "compliment" | string;
  status?: "new" | "in_progress" | "resolved" | string;
  created_at?: unknown;
};

const typeBadge: Record<string, string> = {
  suggestion: "bg-blue-100 text-blue-800",
  bug: "bg-red-100 text-red-800",
  question: "bg-yellow-100 text-yellow-800",
  compliment: "bg-green-100 text-green-800",
};
const statusBadge: Record<string, string> = {
  new: "bg-orange-100 text-orange-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
};

export function FeedbackTable() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Feedback[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    const q = query(collection(db, "user_feedback"), orderBy("created_at", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Feedback[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Feedback, "id">) }));
        setRows(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading feedback:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("permission") || errorMessage.includes("PERMISSION_DENIED")) {
          toast.error("Permission denied. Please ensure your account has admin custom claims set.");
        } else {
          toast.error(`Failed to load feedback: ${errorMessage}`);
        }
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return rows
      .filter((r) => (type === "all" ? true : r.type === type))
      .filter((r) => (status === "all" ? true : r.status === status))
      .filter((r) => {
        if (!search.trim()) return true;
        const s = search.toLowerCase();
        return (
          (r.message ?? "").toLowerCase().includes(s) ||
          (r.user_email ?? "").toLowerCase().includes(s)
        );
      });
  }, [rows, search, type, status]);

  const formatDate = (ts: unknown) => {
    if (!ts) return "N/A";
    const d = ts && typeof ts === "object" && "toDate" in ts && typeof ts.toDate === "function" ? ts.toDate() : new Date(ts as number | string | Date);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  };

  const setRowStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "user_feedback", id), { status: newStatus });
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const removeRow = async (id: string) => {
    if (!confirm("Delete this feedback?")) return;
    try {
      await deleteDoc(doc(db, "user_feedback", id));
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
          <p className="text-gray-500">Loading feedback...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Card className="border-0 shadow-kiddovate">
        <CardHeader>
          <CardTitle>Feedback</CardTitle>
          <CardDescription>Manage feedback coming from the mobile app</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search message or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All types</option>
            <option value="suggestion">Suggestion</option>
            <option value="bug">Bug</option>
            <option value="question">Question</option>
            <option value="compliment">Compliment</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All status</option>
            <option value="new">New</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-kiddovate">
        <CardHeader>
          <CardTitle>Messages ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-500">No feedback found.</div>
          ) : (
            <div className="space-y-4">
              {filtered.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-gray-200 p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            typeBadge[r.type ?? ""] ?? "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {r.type ?? "other"}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            statusBadge[r.status ?? ""] ?? "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {r.status ?? "new"}
                        </span>
                      </div>

                      {r.user_email && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{r.user_email}</span>
                        </div>
                      )}

                      <div className="whitespace-pre-wrap text-gray-900">{r.message}</div>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {formatDate(r.created_at)}
                      </div>
                    </div>

                    <div className="flex gap-2 lg:flex-col">
                      <select
                        value={r.status ?? "new"}
                        onChange={(e) => setRowStatus(r.id, e.target.value)}
                        className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="new">New</option>
                        <option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option>
                      </select>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeRow(r.id)}
                        aria-label="Delete feedback"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

