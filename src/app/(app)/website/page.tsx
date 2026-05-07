"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, User, Calendar, Users, Search, Filter } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

type WebsiteSubscription = {
  id: string;
  email: string;
  kidName: string;
  parentName: string;
  subscribedAt: any;
};

export default function WebsitePage() {
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<WebsiteSubscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<WebsiteSubscription[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "website"),
      (snapshot) => {
        const list: WebsiteSubscription[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            email: data.email || "",
            kidName: data.kidName || "",
            parentName: data.parentName || "",
            subscribedAt: data.subscribedAt || null,
          });
        });
        setSubscriptions(list);
        setFilteredSubscriptions(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading website subscriptions:", error);
        toast.error(`Failed to load data: ${error.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = subscriptions.filter(sub => 
        sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.kidName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSubscriptions(filtered);
    } else {
      setFilteredSubscriptions(subscriptions);
    }
  }, [searchTerm, subscriptions]);

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "—";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 p-8 text-white">
        <h1 className="text-3xl font-bold text-white mb-2">Website Subscriptions</h1>
        <p className="text-white/80 text-lg">
          Manage and track users who subscribed from the website landing page
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-0 shadow-kiddovate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-primary-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptions.length}</div>
            <p className="text-xs text-muted-foreground">Total website signups</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-kiddovate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Emails</CardTitle>
            <Mail className="h-4 w-4 text-primary-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(subscriptions.map(s => s.email)).size}
            </div>
            <p className="text-xs text-muted-foreground">Registered emails</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-kiddovate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
            <User className="h-4 w-4 text-primary-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptions.filter(s => s.parentName).length}
            </div>
            <p className="text-xs text-muted-foreground">With parent names</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-kiddovate">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Subscription List</CardTitle>
              <CardDescription>
                All users who subscribed from the website landing page
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by email, parent or kid name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-80"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSubscriptions.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No subscriptions found. Users will appear here when they subscribe from the website.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 font-semibold">Parent Name</th>
                    <th className="text-left py-3 px-4 font-semibold">Kid Name</th>
                    <th className="text-left py-3 px-4 font-semibold">Subscribed At</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <a
                          href={`mailto:${sub.email}`}
                          className="text-primary-600 hover:underline flex items-center gap-2"
                        >
                          <Mail className="h-3 w-3" />
                          {sub.email}
                        </a>
                      </td>
                      <td className="py-3 px-4 font-medium">{sub.parentName || "—"}</td>
                      <td className="py-3 px-4">{sub.kidName || "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {formatDate(sub.subscribedAt)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = `mailto:${sub.email}`}
                        >
                          Contact
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}