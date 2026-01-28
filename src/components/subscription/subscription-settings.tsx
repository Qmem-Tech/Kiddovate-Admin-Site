"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  addDoc,
  limit,
  updateDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, Search } from "lucide-react";

type GameAccessDoc = {
  gameId: string;
  label: string;
  isSubscriptionRequired: boolean;
  updated_at?: unknown;
};

export function SubscriptionSettings() {
  const [loading, setLoading] = useState(true);
  const [modeEnabled, setModeEnabled] = useState(false);
  const [games, setGames] = useState<Array<{ docId: string; gameId: string; label: string; isSubscriptionRequired: boolean }>>([]);
  const [legacyModeDocId, setLegacyModeDocId] = useState<string | null>(null);

  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingGameId, setEditingGameId] = useState("");
  const [editingLabel, setEditingLabel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Preferred schema: app_config/subscription { enabled: boolean }
    const unsubMode = onSnapshot(
      doc(db, "app_config", "subscription"),
      (snap) => {
        if (snap.exists()) {
          setModeEnabled(((snap.data() as { enabled?: boolean } | undefined)?.enabled) ?? false);
        }
      },
      () => toast.error("Failed to load subscription mode")
    );

    // Legacy schema fallback: app_config/{randomDoc} { subscription: true }
    const unsubModeLegacy = onSnapshot(
      query(collection(db, "app_config"), limit(25)),
      (snap) => {
        let found: { id: string; enabled: boolean } | null = null;
        snap.forEach((d) => {
          const data = d.data() as { subscription?: boolean; enabled?: boolean };
          if (typeof data.subscription === "boolean") {
            found = { id: d.id, enabled: data.subscription };
          } else if (typeof data.enabled === "boolean" && d.id !== "subscription") {
            // tolerate older naming
            found = { id: d.id, enabled: data.enabled };
          }
        });
        if (found !== null) {
          const foundValue: { id: string; enabled: boolean } = found;
          if (legacyModeDocId !== foundValue.id) {
            setLegacyModeDocId(foundValue.id);
            // Only apply legacy value if preferred doc isn't present
            setModeEnabled((current) => current || foundValue.enabled);
          }
        }
      },
      () => {
        // ignore, preferred doc is enough
      }
    );

    // New schema: game_access/{docId} { gameId: "gc_01", label: "Memory Flip", isSubscriptionRequired: true }
    const q = query(collection(db, "game_access"));
    const unsubGames = onSnapshot(
      q,
      (snap) => {
        const rows: Array<{ docId: string; gameId: string; label: string; isSubscriptionRequired: boolean }> = [];

        snap.forEach((d) => {
          const data = d.data() as GameAccessDoc;
          
          // New schema: must have gameId, label, and isSubscriptionRequired
          if (data.gameId && typeof data.gameId === "string" && 
              data.label && typeof data.label === "string" &&
              typeof data.isSubscriptionRequired === "boolean") {
            rows.push({
              docId: d.id,
              gameId: data.gameId,
              label: data.label,
              isSubscriptionRequired: data.isSubscriptionRequired,
            });
          }
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
      unsubModeLegacy();
      unsubGames();
    };
  }, [legacyModeDocId]);

  const sorted = useMemo(() => {
    let filtered = games;
    
    // Filter by search query (case-insensitive)
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = games.filter(
        (g) =>
          g.label.toLowerCase().includes(query) ||
          g.gameId.toLowerCase().includes(query)
      );
    }
    
    // Sort by label in ascending order
    return [...filtered].sort((a, b) => a.label.localeCompare(b.label));
  }, [games, searchQuery]);

  const toggleMode = async () => {
    try {
      // Prefer writing to the clean schema
      await setDoc(doc(db, "app_config", "subscription"), { enabled: !modeEnabled }, { merge: true });

      // If the project was using legacy schema, keep it in sync too
      if (legacyModeDocId) {
        await updateDoc(doc(db, "app_config", legacyModeDocId), { subscription: !modeEnabled });
      }
      toast.success(`Subscription mode ${!modeEnabled ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update subscription mode");
    }
  };

  const setLocked = async (docId: string, isSubscriptionRequired: boolean) => {
    try {
      await updateDoc(doc(db, "game_access", docId), { isSubscriptionRequired });
      toast.success("Updated");
    } catch {
      toast.error("Update failed");
    }
  };

  const addGame = async () => {
    const gameId = newId.trim();
    const label = newLabel.trim();
    if (!gameId) return toast.error("Game id is required (ex: gc_01)");
    if (!label) return toast.error("Label is required (ex: Memory Flip)");
    
    // Check if gameId already exists
    const existing = games.find(g => g.gameId === gameId);
    if (existing) {
      return toast.error(`Game with id "${gameId}" already exists`);
    }
    
    try {
      await addDoc(
        collection(db, "game_access"),
        {
          gameId,
          label,
          isSubscriptionRequired: true,
        }
      );
      setNewId("");
      setNewLabel("");
      toast.success("Added");
    } catch (error) {
      console.error("Failed to add game:", error);
      toast.error("Failed to add game");
    }
  };

  const startEditing = (docId: string, gameId: string, label: string) => {
    setEditingDocId(docId);
    setEditingGameId(gameId);
    setEditingLabel(label);
  };

  const cancelEditing = () => {
    setEditingDocId(null);
    setEditingGameId("");
    setEditingLabel("");
  };

  const saveEdit = async (docId: string) => {
    const gameId = editingGameId.trim();
    const label = editingLabel.trim();
    
    if (!gameId) {
      toast.error("Game id is required");
      return;
    }
    if (!label) {
      toast.error("Label is required");
      return;
    }

    // Check if gameId already exists (excluding the current document)
    const existing = games.find(g => g.gameId === gameId && g.docId !== docId);
    if (existing) {
      toast.error(`Game with id "${gameId}" already exists`);
      return;
    }

    try {
      await updateDoc(doc(db, "game_access", docId), {
        gameId,
        label,
      });
      cancelEditing();
      toast.success("Game updated");
    } catch {
      toast.error("Failed to update game");
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
          
          {games.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by label or game id..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          <div className="divide-y divide-gray-200 rounded-xl border border-gray-200">
            {sorted.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No game flags yet.</div>
            ) : (
              sorted.map((g) => (
                <div key={g.docId} className="flex items-center justify-between gap-3 p-4">
                  {editingDocId === g.docId ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editingGameId}
                        onChange={(e) => setEditingGameId(e.target.value)}
                        placeholder="Game id"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(g.docId);
                          if (e.key === "Escape") cancelEditing();
                        }}
                        autoFocus
                      />
                      <Input
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        placeholder="Label"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(g.docId);
                          if (e.key === "Escape") cancelEditing();
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => saveEdit(g.docId)}
                        title="Save"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelEditing}
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{g.label}</div>
                        <div className="text-sm text-gray-500">{g.gameId}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            g.isSubscriptionRequired ? "bg-primary-100 text-primary-900" : "bg-green-100 text-green-800"
                          }`}
                        >
                          {g.isSubscriptionRequired ? "Locked" : "Free"}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditing(g.docId, g.gameId, g.label)}
                          title="Edit game"
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setLocked(g.docId, !g.isSubscriptionRequired)}
                          title="Toggle lock"
                        >
                          {g.isSubscriptionRequired ? "Make Free" : "Make Locked"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

