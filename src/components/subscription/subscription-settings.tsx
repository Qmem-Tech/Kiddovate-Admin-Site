"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type GameAccessDoc = {
  locked?: boolean;
  label?: string;
  updated_at?: unknown;
};

export function SubscriptionSettings() {
  const [loading, setLoading] = useState(true);
  const [modeEnabled, setModeEnabled] = useState(false);
  const [games, setGames] = useState<Array<{ id: string; locked: boolean; label?: string }>>([]);

  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    const unsubMode = onSnapshot(
      doc(db, "app_config", "subscription"),
      (snap) => {
        setModeEnabled(((snap.data() as { enabled?: boolean } | undefined)?.enabled) ?? false);
      },
      () => toast.error("Failed to load subscription mode")
    );

    const q = query(collection(db, "game_access"), orderBy("label"));
    const unsubGames = onSnapshot(
      q,
      (snap) => {
        const rows: Array<{ id: string; locked: boolean; label?: string }> = [];
        snap.forEach((d) => {
          const data = d.data() as GameAccessDoc;
          rows.push({ id: d.id, locked: Boolean(data.locked), label: data.label });
        });
        setGames(rows);
        setLoading(false);
      },
      () => {
        toast.error("Failed to load game access list");
        setLoading(false);
      }
    );

    return () => {
      unsubMode();
      unsubGames();
    };
  }, []);

  const sorted = useMemo(() => {
    // If label missing, keep stable but show id
    return [...games].sort((a, b) => (a.label ?? a.id).localeCompare(b.label ?? b.id));
  }, [games]);

  const toggleMode = async () => {
    try {
      await setDoc(doc(db, "app_config", "subscription"), { enabled: !modeEnabled }, { merge: true });
      toast.success(`Subscription mode ${!modeEnabled ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update subscription mode");
    }
  };

  const setLocked = async (id: string, locked: boolean) => {
    try {
      await setDoc(doc(db, "game_access", id), { locked }, { merge: true });
      toast.success("Updated");
    } catch {
      toast.error("Update failed");
    }
  };

  const addGame = async () => {
    const id = newId.trim();
    if (!id) return toast.error("Game id is required (ex: gc_01)");
    try {
      await setDoc(
        doc(db, "game_access", id),
        { label: newLabel.trim() || id, locked: true },
        { merge: true }
      );
      setNewId("");
      setNewLabel("");
      toast.success("Added");
    } catch {
      toast.error("Failed to add game");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
          <p className="text-gray-500">Loading subscription settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card className="border-0 shadow-kiddovate">
        <CardHeader>
          <CardTitle>Subscription Mode</CardTitle>
          <CardDescription>
            When disabled: all games are unlocked and the Subscribe button is hidden.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm text-gray-600">Current status</div>
            <div className="text-xl font-semibold text-gray-900">
              {modeEnabled ? "Enabled" : "Disabled"}
            </div>
          </div>
          <Button onClick={toggleMode}>
            {modeEnabled ? "Turn OFF subscription mode" : "Turn ON subscription mode"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-kiddovate">
        <CardHeader>
          <CardTitle>Game Locks</CardTitle>
          <CardDescription>
            These are the per-game flags (Firestore: <code>game_access</code>). Locked games require an active subscription when subscription mode is enabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input placeholder="Game id (ex: gc_01)" value={newId} onChange={(e) => setNewId(e.target.value)} />
            <Input placeholder="Label (ex: Smart Kids)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
            <Button onClick={addGame}>Add locked game</Button>
          </div>

          <div className="divide-y divide-gray-200 rounded-xl border border-gray-200">
            {sorted.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No game flags yet.</div>
            ) : (
              sorted.map((g) => (
                <div key={g.id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <div className="font-semibold text-gray-900">{g.label ?? g.id}</div>
                    <div className="text-sm text-gray-500">{g.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        g.locked ? "bg-primary-100 text-primary-900" : "bg-green-100 text-green-800"
                      }`}
                    >
                      {g.locked ? "Locked" : "Free"}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setLocked(g.id, !g.locked)}
                      title="Toggle lock"
                    >
                      {g.locked ? "Make Free" : "Make Locked"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

