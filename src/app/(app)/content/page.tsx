import { ContentEditor } from "@/components/content/content-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const tabs = [
  { id: "about_us", label: "About Us" },
  { id: "privacy_policy", label: "Privacy Policy" },
  { id: "terms_of_service", label: "Terms of Service" },
  { id: "contact_us", label: "Contact Us" },
];

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string }>;
}) {
  const params = await searchParams;
  const docId = params.doc ?? "about_us";

  const current = tabs.find((t) => t.id === docId) ?? tabs[0];

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-kiddovate">
        <CardHeader>
          <CardTitle>Content Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <Link
                key={t.id}
                href={`/content?doc=${t.id}`}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  t.id === current.id
                    ? "bg-primary-600 text-white shadow-sm"
                    : "bg-primary-100 text-primary-900 hover:bg-primary-200"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <ContentEditor
        documentId={current.id}
        title={current.label}
        isContact={current.id === "contact_us"}
      />
    </div>
  );
}

