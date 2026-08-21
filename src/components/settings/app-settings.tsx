"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Smartphone, Apple } from "lucide-react";

type VersionConfig = {
  android_min_version?: string;
  ios_min_version?: string;
  android_store_url?: string;
  ios_store_url?: string;
};

const VERSION_REGEX = /^\d+\.\d+\.\d+$/;

export function AppSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [androidMinVersion, setAndroidMinVersion] = useState("");
  const [iosMinVersion, setIosMinVersion] = useState("");
  const [androidStoreUrl, setAndroidStoreUrl] = useState("");
  const [iosStoreUrl, setIosStoreUrl] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "app_config", "version"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as VersionConfig;
          setAndroidMinVersion(data.android_min_version ?? "");
          setIosMinVersion(data.ios_min_version ?? "");
          setAndroidStoreUrl(data.android_store_url ?? "");
          setIosStoreUrl(data.ios_store_url ?? "");
        }
        setLoading(false);
      },
      () => {
        toast.error("Failed to load app settings");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const onSave = async () => {
    const android = androidMinVersion.trim();
    const ios = iosMinVersion.trim();

    if (android && !VERSION_REGEX.test(android)) {
      return toast.error("Android version must look like 1.2.0");
    }
    if (ios && !VERSION_REGEX.test(ios)) {
      return toast.error("iOS version must look like 1.2.0");
    }

    setSaving(true);
    try {
      await setDoc(
        doc(db, "app_config", "version"),
        {
          android_min_version: android,
          ios_min_version: ios,
          android_store_url: androidStoreUrl.trim(),
          ios_store_url: iosStoreUrl.trim(),
          updated_at: serverTimestamp(),
        },
        { merge: true }
      );
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
          <p className="text-gray-500">Loading app settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card className="border-0 shadow-kiddovate">
        <CardHeader>
          <CardTitle>Force App Update</CardTitle>
          <CardDescription>
            Set the minimum required app version per platform. If a signed-in client&apos;s
            installed version is older than the value below, they&apos;ll be blocked with a
            full-screen update prompt until they update from the store.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Smartphone className="h-4 w-4 text-gray-500" />
                Android minimum version
              </label>
              <Input
                className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-300 focus:ring-2 focus:ring-primary-100 transition-all"
                value={androidMinVersion}
                onChange={(e) => setAndroidMinVersion(e.target.value)}
                placeholder="e.g. 1.2.0"
              />
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Apple className="h-4 w-4 text-gray-500" />
                iOS minimum version
              </label>
              <Input
                className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-300 focus:ring-2 focus:ring-primary-100 transition-all"
                value={iosMinVersion}
                onChange={(e) => setIosMinVersion(e.target.value)}
                placeholder="e.g. 1.2.0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Smartphone className="h-4 w-4 text-gray-500" />
                Play Store URL
              </label>
              <Input
                className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-300 focus:ring-2 focus:ring-primary-100 transition-all"
                value={androidStoreUrl}
                onChange={(e) => setAndroidStoreUrl(e.target.value)}
                placeholder="https://play.google.com/store/apps/details?id=..."
              />
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Apple className="h-4 w-4 text-gray-500" />
                App Store URL
              </label>
              <Input
                className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-300 focus:ring-2 focus:ring-primary-100 transition-all"
                value={iosStoreUrl}
                onChange={(e) => setIosStoreUrl(e.target.value)}
                placeholder="https://apps.apple.com/app/id..."
              />
            </div>
          </div>

          <div className="flex justify-end">
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
        </CardContent>
      </Card>
    </div>
  );
}
