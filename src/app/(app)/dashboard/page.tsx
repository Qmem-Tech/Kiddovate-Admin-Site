import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, FileText, Shield, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 p-8 text-white">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome back, Admin!</h1>
        <p className="text-white/80 text-lg">
          Manage Kiddovate policies and review feedback in one place.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-0 shadow-kiddovate hover:shadow-kiddovate-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary-600" />
              Content
            </CardTitle>
            <CardDescription>Edit About/Privacy/Terms/Contact</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/content"
              className="inline-flex items-center font-semibold text-primary-600 hover:underline"
            >
              Go to content <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-kiddovate hover:shadow-kiddovate-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary-600" />
              Feedback
            </CardTitle>
            <CardDescription>Track, filter and resolve user feedback</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/feedback"
              className="inline-flex items-center font-semibold text-primary-600 hover:underline"
            >
              Go to feedback <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-kiddovate hover:shadow-kiddovate-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary-600" />
              Security
            </CardTitle>
            <CardDescription>Firebase Auth + Firestore rules</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Only signed-in admins can edit content and manage feedback.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

