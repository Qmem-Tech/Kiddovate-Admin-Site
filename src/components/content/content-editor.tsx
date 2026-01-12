"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Save, Calendar, Mail } from "lucide-react";

interface AppLegalDocument {
  title?: string;
  body?: string;
  email?: string;
  last_updated?: string;
  updated_at?: unknown;
}

export function ContentEditor({
  documentId,
  title,
  isContact,
}: {
  documentId: string;
  title: string;
  isContact?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const [docTitle, setDocTitle] = useState("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const ref = doc(db, "app_legal", documentId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const d = snap.data() as AppLegalDocument;
          setDocTitle(d.title ?? "");
          setBody(d.body ?? "");
          setEmail(d.email ?? "");
          setLastUpdated(d.last_updated ?? "");
        } else {
          setDocTitle(title);
          setBody("");
          setEmail("support@kiddovate.com");
        }
      } catch {
        toast.error("Failed to load content");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [documentId, title]);

  const onSave = async () => {
    if (!docTitle.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString().split("T")[0];
      const ref = doc(db, "app_legal", documentId);
      const data: AppLegalDocument = {
        title: docTitle,
        body,
        last_updated: now,
        updated_at: serverTimestamp(),
      };
      if (isContact) data.email = email;
      await setDoc(ref, data, { merge: true });
      setLastUpdated(now);
      toast.success("Saved!");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
          <p className="text-gray-500">Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card className="border-0 shadow-kiddovate">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              {lastUpdated && (
                <CardDescription className="mt-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Last updated: {lastUpdated}
                </CardDescription>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreview((p) => !p)}>
                {preview ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                {preview ? "Edit" : "Preview"}
              </Button>
              <Button onClick={onSave} disabled={saving}>
                {saving ? (
                  <>
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {preview ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="text-xl font-semibold text-gray-900">{docTitle}</div>
                {isContact && email && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    {email}
                  </div>
                )}
              </div>
              <div className="prose max-w-none">
                <ReactMarkdown>{body}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Title
                </label>
                <Input
                  className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-300 focus:ring-2 focus:ring-primary-100 transition-all"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Enter title..."
                />
              </div>

              {isContact && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Support Email
                  </label>
                  <Input
                    className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-300 focus:ring-2 focus:ring-primary-100 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="support@kiddovate.com"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Body (Markdown supported)
                </label>
                <textarea
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 transition-all"
                  rows={18}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your content here..."
                />
                <p className="mt-2 text-sm text-gray-500">
                  Tip: Use Markdown like <code>**bold**</code>, <code># Heading</code>, <code>- list</code>.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

