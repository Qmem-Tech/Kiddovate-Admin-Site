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

type AccessRow = { docId: string; gameId: string; label: string; isSubscriptionRequired: boolean };

function AccessTable({ rows, editingDocId, editingGameId, editingLabel, onEdit, onSave, onCancel, onToggle, setEditingGameId, setEditingLabel }: {
  rows: AccessRow[];
  editingDocId: string | null;
  editingGameId: string;
  editingLabel: string;
  onEdit: (docId: string, gameId: string, label: string) => void;
  onSave: (docId: string) => void;
  onCancel: () => void;
  onToggle: (docId: string, newValue: boolean) => void;
  setEditingGameId: (v: string) => void;
  setEditingLabel: (v: string) => void;
}) {
  if (rows.length === 0) {
    return <div className="p-6 text-center text-gray-500 rounded-xl border border-gray-200">No entries yet.</div>;
  }
  return (
    <div className="divide-y divide-gray-200 rounded-xl border border-gray-200">
      {rows.map((g) => (
        <div key={g.docId} className="flex items-center justify-between gap-3 p-4">
          {editingDocId === g.docId ? (
            <div className="flex-1 flex items-center gap-2">
              <Input value={editingGameId} onChange={(e) => setEditingGameId(e.target.value)} placeholder="Game id" className="flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") onSave(g.docId); if (e.key === "Escape") onCancel(); }} autoFocus />
              <Input value={editingLabel} onChange={(e) => setEditingLabel(e.target.value)} placeholder="Label" className="flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") onSave(g.docId); if (e.key === "Escape") onCancel(); }} />
              <Button variant="outline" size="sm" onClick={() => onSave(g.docId)} title="Save"><Check className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={onCancel} title="Cancel"><X className="h-4 w-4" /></Button>
            </div>
          ) : (
            <>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{g.label}</div>
                <div className="text-sm text-gray-500 font-mono">{g.gameId}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${g.isSubscriptionRequired ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                  {g.isSubscriptionRequired ? "🔒 Locked" : "✅ Free"}
                </span>
                <Button variant="outline" size="sm" onClick={() => onEdit(g.docId, g.gameId, g.label)} title="Edit" className="h-8 w-8 p-0">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" onClick={() => onToggle(g.docId, !g.isSubscriptionRequired)}>
                  {g.isSubscriptionRequired ? "Make Free" : "Make Locked"}
                </Button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export function SubscriptionSettings() {
  const [loading, setLoading] = useState(true);
  const [modeEnabled, setModeEnabled] = useState(false);
  const [games, setGames] = useState<AccessRow[]>([]);
  const [learningGames, setLearningGames] = useState<AccessRow[]>([]);
  const [legacyModeDocId, setLegacyModeDocId] = useState<string | null>(null);

  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newLearningId, setNewLearningId] = useState("");
  const [newLearningLabel, setNewLearningLabel] = useState("");
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingCollection, setEditingCollection] = useState<"game_access" | "learning_access">("game_access");
  const [editingGameId, setEditingGameId] = useState("");
  const [editingLabel, setEditingLabel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLearningQuery, setSearchLearningQuery] = useState("");

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

    // game_access collection
    const unsubGames = onSnapshot(
      query(collection(db, "game_access")),
      (snap) => {
        const rows: AccessRow[] = [];
        console.group("🔥 [game_access] snapshot — %d docs", snap.docs.length);
        snap.forEach((d) => {
          const data = d.data() as GameAccessDoc;
          console.log("  📄 doc=%s | gameId=%s | label=%s | isSubscriptionRequired=%s | raw=", d.id, data.gameId, data.label, data.isSubscriptionRequired, data);
          if (data.gameId && typeof data.gameId === "string" &&
              data.label && typeof data.label === "string" &&
              typeof data.isSubscriptionRequired === "boolean") {
            rows.push({ docId: d.id, gameId: data.gameId, label: data.label, isSubscriptionRequired: data.isSubscriptionRequired });
          } else {
            console.warn("  ⚠️ SKIPPED doc=%s — missing/wrong field types", d.id, data);
          }
        });
        console.log("  ✅ Parsed %d rows:", rows.length, rows);
        console.groupEnd();
        setGames(rows);
        setLoading(false);
      },
      (err) => {
        console.error("❌ game_access listener error", err);
        toast.error("Failed to load game access list");
        setLoading(false);
      }
    );

    // learning_access collection
    const unsubLearning = onSnapshot(
      query(collection(db, "learning_access")),
      (snap) => {
        const rows: AccessRow[] = [];
        console.group("🔥 [learning_access] snapshot — %d docs", snap.docs.length);
        snap.forEach((d) => {
          const data = d.data() as GameAccessDoc;
          console.log("  📄 doc=%s | gameId=%s | label=%s | isSubscriptionRequired=%s | raw=", d.id, data.gameId, data.label, data.isSubscriptionRequired, data);
          if (data.gameId && typeof data.gameId === "string" &&
              data.label && typeof data.label === "string" &&
              typeof data.isSubscriptionRequired === "boolean") {
            rows.push({ docId: d.id, gameId: data.gameId, label: data.label, isSubscriptionRequired: data.isSubscriptionRequired });
          } else {
            console.warn("  ⚠️ SKIPPED doc=%s — missing/wrong field types", d.id, data);
          }
        });
        console.log("  ✅ Parsed %d rows:", rows.length, rows);
        console.groupEnd();
        setLearningGames(rows);
      },
      (err) => {
        console.error("❌ learning_access listener error", err);
        toast.error("Failed to load learning access list");
      }
    );

    return () => {
      unsubMode();
      unsubModeLegacy();
      unsubGames();
      unsubLearning();
    };
  }, [legacyModeDocId]);

  const sorted = useMemo(() => {
    let filtered = games;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = games.filter(g => g.label.toLowerCase().includes(q) || g.gameId.toLowerCase().includes(q));
    }
    return [...filtered].sort((a, b) => a.label.localeCompare(b.label));
  }, [games, searchQuery]);

  const sortedLearning = useMemo(() => {
    let filtered = learningGames;
    if (searchLearningQuery.trim()) {
      const q = searchLearningQuery.trim().toLowerCase();
      filtered = learningGames.filter(g => g.label.toLowerCase().includes(q) || g.gameId.toLowerCase().includes(q));
    }
    return [...filtered].sort((a, b) => a.label.localeCompare(b.label));
  }, [learningGames, searchLearningQuery]);

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

  const setLocked = async (collectionName: "game_access" | "learning_access", docId: string, isSubscriptionRequired: boolean) => {
    try {
      console.log(`🔒 [${collectionName}] Setting doc=${docId} isSubscriptionRequired=${isSubscriptionRequired}`);
      await updateDoc(doc(db, collectionName, docId), { isSubscriptionRequired });
      toast.success("Updated");
    } catch (err) {
      console.error(`❌ Failed to update ${collectionName} doc=${docId}`, err);
      toast.error("Update failed");
    }
  };

  const addGame = async () => {
    const gameId = newId.trim();
    const label = newLabel.trim();
    if (!gameId) return toast.error("Game id is required (ex: gc_01)");
    if (!label) return toast.error("Label is required (ex: Memory Flip)");
    if (games.find(g => g.gameId === gameId)) return toast.error(`Game with id "${gameId}" already exists`);
    try {
      console.log("➕ [game_access] Adding gameId=%s label=%s", gameId, label);
      await addDoc(collection(db, "game_access"), { gameId, label, isSubscriptionRequired: true });
      setNewId(""); setNewLabel("");
      toast.success("Added");
    } catch (error) {
      console.error("Failed to add game:", error);
      toast.error("Failed to add game");
    }
  };

  const addLearningGame = async () => {
    const gameId = newLearningId.trim();
    const label = newLearningLabel.trim();
    if (!gameId) return toast.error("Game id is required (ex: gc_01_l)");
    if (!label) return toast.error("Label is required");
    if (learningGames.find(g => g.gameId === gameId)) return toast.error(`Learning item with id "${gameId}" already exists`);
    try {
      console.log("➕ [learning_access] Adding gameId=%s label=%s", gameId, label);
      await addDoc(collection(db, "learning_access"), { gameId, label, isSubscriptionRequired: true });
      setNewLearningId(""); setNewLearningLabel("");
      toast.success("Added");
    } catch (error) {
      console.error("Failed to add learning item:", error);
      toast.error("Failed to add learning item");
    }
  };

  const startEditing = (collectionName: "game_access" | "learning_access", docId: string, gameId: string, label: string) => {
    setEditingCollection(collectionName);
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
    if (!gameId) return toast.error("Game id is required");
    if (!label) return toast.error("Label is required");

    const sourceList = editingCollection === "game_access" ? games : learningGames;
    if (sourceList.find(g => g.gameId === gameId && g.docId !== docId)) {
      return toast.error(`Id "${gameId}" already exists`);
    }
    try {
      console.log(`✏️ [${editingCollection}] Saving doc=${docId} gameId=${gameId} label=${label}`);
      await updateDoc(doc(db, editingCollection, docId), { gameId, label });
      cancelEditing();
      toast.success("Updated");
    } catch {
      toast.error("Failed to update");
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

      {/* ── game_access ── */}
      <Card className="border-0 shadow-kiddovate">
        <CardHeader>
          <CardTitle>Game Locks <span className="text-sm font-normal text-gray-400 ml-1">(Firestore: game_access)</span></CardTitle>
          <CardDescription>
            Controls which game tiles are locked on the <strong>Play</strong> tab. Locked games require an active subscription when subscription mode is on.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input placeholder="Game id (ex: gc_03)" value={newId} onChange={(e) => setNewId(e.target.value)} />
            <Input placeholder="Label (ex: Science)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
            <Button onClick={addGame}>Add</Button>
          </div>
          {games.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
          )}
          <AccessTable rows={sorted} editingDocId={editingDocId} editingGameId={editingGameId} editingLabel={editingLabel}
            onEdit={(docId, gameId, label) => startEditing("game_access", docId, gameId, label)}
            onSave={saveEdit} onCancel={cancelEditing}
            onToggle={(docId, val) => setLocked("game_access", docId, val)}
            setEditingGameId={setEditingGameId} setEditingLabel={setEditingLabel} />
        </CardContent>
      </Card>

      {/* ── learning_access ── */}
      <Card className="border-0 shadow-kiddovate">
        <CardHeader>
          <CardTitle>Learning Locks <span className="text-sm font-normal text-gray-400 ml-1">(Firestore: learning_access)</span></CardTitle>
          <CardDescription>
            Controls which learn tiles are locked on the <strong>Learn</strong> tab. <strong className="text-orange-600">This collection is also read by the app</strong> — a gc_03 entry here can lock &quot;Discover World&quot; even if it&apos;s free in game_access above.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input placeholder="Game id (ex: gc_03)" value={newLearningId} onChange={(e) => setNewLearningId(e.target.value)} />
            <Input placeholder="Label (ex: Discover World)" value={newLearningLabel} onChange={(e) => setNewLearningLabel(e.target.value)} />
            <Button onClick={addLearningGame}>Add</Button>
          </div>
          {learningGames.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search…" value={searchLearningQuery} onChange={(e) => setSearchLearningQuery(e.target.value)} className="pl-10" />
            </div>
          )}
          <AccessTable rows={sortedLearning} editingDocId={editingDocId} editingGameId={editingGameId} editingLabel={editingLabel}
            onEdit={(docId, gameId, label) => startEditing("learning_access", docId, gameId, label)}
            onSave={saveEdit} onCancel={cancelEditing}
            onToggle={(docId, val) => setLocked("learning_access", docId, val)}
            setEditingGameId={setEditingGameId} setEditingLabel={setEditingLabel} />
        </CardContent>
      </Card>
    </div>
  );
}

