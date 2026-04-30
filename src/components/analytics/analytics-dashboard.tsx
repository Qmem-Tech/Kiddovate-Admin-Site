"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Filter, TrendingUp, Users, Mail, ChevronDown, ChevronRight } from "lucide-react";

type SectionData = {
  id: string;
  section_name: string;
  section_category: string;
  section_subcategory: string;
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

type CategoryGroup = {
  name: string;
  totalClicks: number;
  sections: SectionData[];
  expanded: boolean;
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

function normalizeSectionName(sectionName: string): {
  normalized: string;
  category: string;
  subcategory: string;
} {
  let name = sectionName;
  let category = "Other";
  let subcategory = name;
  
  if (name.startsWith("Games/")) {
    category = "Games";
    subcategory = name.replace("Games/", "");
  } else if (name.startsWith("Learn/")) {
    category = "Learning";
    subcategory = name.replace("Learn/", "");
  } else if (name.includes("_")) {
    const parts = name.split("_");
    if (parts[0] === "Games" || parts[0] === "Learn") {
      category = parts[0] === "Games" ? "Games" : "Learning";
      subcategory = parts.slice(1).join(" > ");
    } else {
      category = parts[0];
      subcategory = parts.slice(1).join(" > ");
    }
  }
  
  return { normalized: name, category, subcategory };
}

export function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [filteredSections, setFilteredSections] = useState<SectionData[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("totalOpens_desc");
  const [view, setView] = useState<"totals" | "users" | "categories">("totals");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "anonymous_count"),
      (snap) => {
        const list: SectionData[] = [];
        const uniqueSections = new Map<string, SectionData>();
        
        snap.forEach((doc) => {
          const data = doc.data();
          if (data.section_name) {
            const { category, subcategory } = normalizeSectionName(data.section_name);
            
            const sectionData: SectionData = {
              id: doc.id,
              section_name: data.section_name,
              section_category: category,
              section_subcategory: subcategory,
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
            };
            
            const normalizedKey = data.section_name.replace(/\//g, "_").toLowerCase();
            if (uniqueSections.has(normalizedKey)) {
              const existing = uniqueSections.get(normalizedKey)!;
              existing.anonymous_click_count += sectionData.anonymous_click_count;
              existing.registered_click_count += sectionData.registered_click_count;
              existing.total_click_count += sectionData.total_click_count;
              existing.anonymous_users_list.push(...sectionData.anonymous_users_list);
              existing.registered_users_list.push(...sectionData.registered_users_list);
              existing.registered_user_emails.push(...sectionData.registered_user_emails);
              existing.registered_user_names.push(...sectionData.registered_user_names);
              if (sectionData.last_clicked > existing.last_clicked) {
                existing.last_clicked = sectionData.last_clicked;
                existing.last_user_name = sectionData.last_user_name;
              }
            } else {
              uniqueSections.set(normalizedKey, sectionData);
            }
          }
        });
        
        const consolidatedList = Array.from(uniqueSections.values());
        setSections(consolidatedList);
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
      const uniqueRegisteredUsers = new Map();
      section.registered_user_names.forEach((name, idx) => {
        const userId = section.registered_users_list[idx];
        if (!uniqueRegisteredUsers.has(userId)) {
          uniqueRegisteredUsers.set(userId, { name, email: section.registered_user_emails[idx] });
        }
      });
      
      uniqueRegisteredUsers.forEach((userInfo, userId) => {
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            userId: userId,
            userName: userInfo.name,
            userEmail: userInfo.email,
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
        userData.totalClicks += section.registered_click_count;
      });
    });
    
    sections.forEach((section) => {
      const uniqueAnonymousUsers = new Set(section.anonymous_users_list);
      uniqueAnonymousUsers.forEach((userId) => {
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
        section.section_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.section_category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    const [field, dir] = sortBy.split("_") as [string, string];
    list.sort((a, b) => {
      if (field === "totalOpens") {
        const diff = a.total_click_count - b.total_click_count;
        return dir === "desc" ? -diff : diff;
      }
      const an = a.section_name.toLowerCase();
      const bn = b.section_name.toLowerCase();
      const cmp = an.localeCompare(bn);
      return dir === "desc" ? -cmp : cmp;
    });
    
    setFilteredSections(list);
    
    const groups = new Map<string, CategoryGroup>();
    list.forEach(section => {
      const category = section.section_category;
      if (!groups.has(category)) {
        groups.set(category, {
          name: category,
          totalClicks: 0,
          sections: [],
          expanded: expandedCategories.has(category),
        });
      }
      const group = groups.get(category)!;
      group.totalClicks += section.total_click_count;
      group.sections.push(section);
    });
    
    const sortedGroups = Array.from(groups.values()).sort((a, b) => b.totalClicks - a.totalClicks);
    setCategoryGroups(sortedGroups);
  }, [sections, searchTerm, sortBy, expandedCategories]);

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

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
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
        <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
        <p className="text-white/80 text-lg">
          Track user interactions across all content sections - consolidated view with no duplicates
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
            <CardTitle className="text-sm font-medium">Unique sections</CardTitle>
            <Users className="h-4 w-4 text-primary-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sections.length}</div>
            <p className="text-xs text-muted-foreground">After removing duplicates</p>
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
            onClick={() => setView("categories")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              view === "categories" ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            By category
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

        {(view === "totals" || view === "categories") && (
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
              Total clicks per section - duplicates have been consolidated
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
                      <th className="text-left py-3 px-2 font-semibold">Category</th>
                      <th className="text-left py-3 px-2 font-semibold">Section name</th>
                      <th className="text-right py-3 px-2 font-semibold">Registered</th>
                      <th className="text-right py-3 px-2 font-semibold">Anonymous</th>
                      <th className="text-right py-3 px-2 font-semibold">Total</th>
                      <th className="text-left py-3 px-2 font-semibold">Last clicked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSections.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800">
                            {row.section_category}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-medium">{row.section_subcategory}</td>
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

      {view === "categories" && (
        <Card className="border-0 shadow-kiddovate">
          <CardHeader>
            <CardTitle>Interactions by category</CardTitle>
            <CardDescription>
              Grouped by content type - click to expand and see details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryGroups.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">No categories found.</p>
            ) : (
              <div className="space-y-4">
                {categoryGroups.map((group) => (
                  <div key={group.name} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleCategory(group.name)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedCategories.has(group.name) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-semibold text-lg">{group.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {group.sections.length} sections
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-primary-600">
                        {group.totalClicks.toLocaleString()}
                      </div>
                    </button>
                    {expandedCategories.has(group.name) && (
                      <div className="p-4 border-t">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 px-2 font-semibold">Section</th>
                              <th className="text-right py-2 px-2 font-semibold">Registered</th>
                              <th className="text-right py-2 px-2 font-semibold">Anonymous</th>
                              <th className="text-right py-2 px-2 font-semibold">Total</th>
                              <th className="text-left py-2 px-2 font-semibold">Last clicked</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.sections.map((section) => (
                              <tr key={section.id} className="border-b border-gray-100">
                                <td className="py-2 px-2">{section.section_subcategory}</td>
                                <td className="py-2 px-2 text-right">{section.registered_click_count.toLocaleString()}</td>
                                <td className="py-2 px-2 text-right">{section.anonymous_click_count.toLocaleString()}</td>
                                <td className="py-2 px-2 text-right font-semibold">{section.total_click_count.toLocaleString()}</td>
                                <td className="py-2 px-2 text-muted-foreground text-xs">{formatDate(section.last_clicked)}</td>
                               </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
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