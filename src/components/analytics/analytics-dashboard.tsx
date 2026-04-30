"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Filter, TrendingUp, Users, Mail } from "lucide-react";

type SectionData = {
  id: string;
  section_name: string;
  anonymous_click_count: number;
  registered_click_count: number;
  total_click_count: number;
  anonymous_users_list: string[];
  registered_users_list: string[];
  registered_user_emails: string[];
  registered_user_names: string[];
  last_user_name: string;
  last_clicked: any;
  user_type: string;
};

type AggregatedUserData = {
  userId: string;
  userName: string;
  userEmail: string;
  totalClicks: number;
  isRegistered: boolean;
  sections: {
    sectionName: string;
    clickCount: number;
    lastClicked: any;
  }[];
};

const SORT_OPTIONS = [
  { value: "totalOpens_desc", label: "Most opened" },
  { value: "totalOpens_asc", label: "Least opened" },
  { value: "contentName_asc", label: "Name A–Z" },
  { value: "contentName_desc", label: "Name Z–A" },
] as const;

function formatDate(ts: unknown): string {
  if (!ts) return "—";
  const d =
    ts && typeof ts === "object" && "toDate" in ts && typeof (ts as { toDate?: () => Date }).toDate === "function"
      ? (ts as { toDate: () => Date }).toDate()
      : new Date(ts as number | string | Date);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

export function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [filteredSections, setFilteredSections] = useState<SectionData[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("totalOpens_desc");
  const [view, setView] = useState<"totals" | "users">("totals");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "anonymous_count"),
      (snap) => {
        const list: SectionData[] = [];
        snap.forEach((doc) => {
          const data = doc.data();
          if (data.section_name) {
            list.push({
              id: doc.id,
              section_name: data.section_name,
              anonymous_click_count: data.anonymous_click_count || 0,
              registered_click_count: data.registered_click_count || 0,
              total_click_count: (data.anonymous_click_count || 0) + (data.registered_click_count || 0),
              anonymous_users_list: data.anonymous_users_list || [],
              registered_users_list: data.registered_users_list || [],
              registered_user_emails: data.registered_user_emails || [],
              registered_user_names: data.registered_user_names || [],
              last_user_name: data.last_user_name || "",
              last_clicked: data.last_clicked || null,
              user_type: data.user_type || "",
            });
          }
        });
        setSections(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading anonymous_count:", error);
        toast.error(`Failed to load analytics: ${error instanceof Error ? error.message : String(error)}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const userAnalyticsData = useMemo(() => {
    const userMap = new Map<string, AggregatedUserData>();
    
    sections.forEach((section) => {
      section.registered_user_names.forEach((name, idx) => {
        const userId = section.registered_users_list[idx];
        const email = section.registered_user_emails[idx];
        
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            userId: userId,
            userName: name,
            userEmail: email,
            totalClicks: 0,
            isRegistered: true,
            sections: [],
          });
        }
        
        const userData = userMap.get(userId)!;
        const existingSection = userData.sections.find(s => s.sectionName === section.section_name);
        
        if (existingSection) {
          existingSection.clickCount += section.registered_click_count;
        } else {
          userData.sections.push({
            sectionName: section.section_name,
            clickCount: section.registered_click_count,
            lastClicked: section.last_clicked,
          });
        }
      });
    });
    
    sections.forEach((section) => {
      section.anonymous_users_list.forEach((userId) => {
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            userId: userId,
            userName: "Anonymous User",
            userEmail: "",
            totalClicks: 0,
            isRegistered: false,
            sections: [],
          });
        }
        
        const userData = userMap.get(userId)!;
        const existingSection = userData.sections.find(s => s.sectionName === section.section_name);
        
        if (existingSection) {
          existingSection.clickCount += section.anonymous_click_count;
        } else {
          userData.sections.push({
            sectionName: section.section_name,
            clickCount: section.anonymous_click_count,
            lastClicked: section.last_clicked,
          });
        }
        
        userData.totalClicks += section.anonymous_click_count;
      });
    });
    
    sectionLoop: for (const section of sections) {
      for (let i = 0; i < section.registered_user_names.length; i++) {
        const userId = section.registered_users_list[i];
        const userData = userMap.get(userId);
        if (userData) {
          userData.totalClicks += section.registered_click_count;
        }
      }
    }
    
    return Array.from(userMap.values()).sort((a, b) => {
      if (a.isRegistered !== b.isRegistered) {
        return a.isRegistered ? -1 : 1;
      }
      return b.totalClicks - a.totalClicks;
    });
  }, [sections]);

  useEffect(() => {
    let list = [...sections];
    
    if (searchTerm) {
      list = list.filter(section => 
        section.section_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    const [field, dir] = sortBy.split("_") as [string, string];
    list.sort((a, b) => {
      if (field === "totalOpens") {
        const diff = (a.total_click_count) - (b.total_click_count);
        return dir === "desc" ? -diff : diff;
      }
      const an = a.section_name.toLowerCase();
      const bn = b.section_name.toLowerCase();
      const cmp = an.localeCompare(bn);
      return dir === "desc" ? -cmp : cmp;
    });
    
    setFilteredSections(list);
  }, [sections, searchTerm, sortBy]);

  const totalOpensAll = useMemo(() => 
    sections.reduce((sum, s) => sum + s.total_click_count, 0), 
    [sections]
  );

  const totalRegisteredClicks = useMemo(() => 
    sections.reduce((sum, s) => sum + s.registered_click_count, 0), 
    [sections]
  );

  const totalAnonymousClicks = useMemo(() => 
    sections.reduce((sum, s) => sum + s.anonymous_click_count, 0), 
    [sections]
  );

  const uniqueRegisteredUsers = useMemo(() => {
    const users = new Set<string>();
    sections.forEach(s => {
      s.registered_user_names.forEach(name => users.add(name));
    });
    return users.size;
  }, [sections]);

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
        <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
        <p className="text-white/80 text-lg">
          Track user interactions across all content sections
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-kiddovate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total interactions</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOpensAll.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All sections combined</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-kiddovate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registered clicks</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRegisteredClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From {uniqueRegisteredUsers} users</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-kiddovate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anonymous clicks</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAnonymousClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Not signed in</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-kiddovate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active sections</CardTitle>
            <Users className="h-4 w-4 text-primary-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sections.length}</div>
            <p className="text-xs text-muted-foreground">With interaction data</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">View:</span>
          <button
            type="button"
            onClick={() => setView("totals")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              view === "totals" ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            By content
          </button>
          <button
            type="button"
            onClick={() => setView("users")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              view === "users" ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Per user
          </button>
        </div>

        {view === "totals" && (
          <>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Search:</span>
              <input
                type="text"
                placeholder="Filter sections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {view === "totals" && (
        <Card className="border-0 shadow-kiddovate">
          <CardHeader>
            <CardTitle>Interactions by content section</CardTitle>
            <CardDescription>
              Total clicks per section, including both registered and anonymous users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSections.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">
                No analytics data yet. Data appears once users interact with content in the app.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 font-semibold">Section name</th>
                      <th className="text-right py-3 px-2 font-semibold">Registered clicks</th>
                      <th className="text-right py-3 px-2 font-semibold">Anonymous clicks</th>
                      <th className="text-right py-3 px-2 font-semibold">Total clicks</th>
                      <th className="text-left py-3 px-2 font-semibold">Last clicked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSections.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2 font-medium">{row.section_name.replace(/\//g, " > ")}</td>
                        <td className="py-3 px-2 text-right">{row.registered_click_count.toLocaleString()}</td>
                        <td className="py-3 px-2 text-right">{row.anonymous_click_count.toLocaleString()}</td>
                        <td className="py-3 px-2 text-right font-semibold">{row.total_click_count.toLocaleString()}</td>
                        <td className="py-3 px-2 text-muted-foreground text-xs">{formatDate(row.last_clicked)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {view === "users" && (
        <Card className="border-0 shadow-kiddovate">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-600" />
              Per-user interactions
            </CardTitle>
            <CardDescription>
              Registered users shown first, then anonymous users. Click on email to contact the user.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userAnalyticsData.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">No user analytics yet.</p>
            ) : (
              <div className="space-y-6">
                {userAnalyticsData.map((user) => {
                  const sortedSections = [...user.sections].sort((a, b) => b.clickCount - a.clickCount);
                  
                  return (
                    <div key={user.userId} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="space-y-1">
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary-600" />
                            {user.userName}
                            {user.isRegistered && (
                              <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800">
                                registered
                              </span>
                            )}
                            {!user.isRegistered && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                                anonymous
                              </span>
                            )}
                          </div>
                          {user.userEmail && (
                            <a
                              href={`mailto:${user.userEmail}`}
                              className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                            >
                              <Mail className="h-3 w-3" />
                              {user.userEmail}
                            </a>
                          )}
                          {!user.userEmail && !user.isRegistered && (
                            <div className="text-xs text-muted-foreground font-mono">
                              ID: {user.userId.substring(0, 16)}...
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground bg-white px-3 py-1 rounded-full">
                          {user.totalClicks} total interactions
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 px-2 font-medium">Section</th>
                              <th className="text-right py-2 px-2 font-medium">Clicks</th>
                              <th className="text-left py-2 px-2 font-medium">Last interaction</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedSections.slice(0, 50).map((section, idx) => (
                              <tr key={idx} className="border-b border-gray-100">
                                <td className="py-2 px-2">{section.sectionName.replace(/\//g, " > ")}</td>
                                <td className="py-2 px-2 text-right font-medium">{section.clickCount}</td>
                                <td className="py-2 px-2 text-muted-foreground text-xs">{formatDate(section.lastClicked)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {sortedSections.length > 50 && (
                          <p className="text-muted-foreground text-xs mt-2">
                            Showing first 50 of {sortedSections.length} sections.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}