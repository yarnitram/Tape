import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Analytics moved into the Journal page. Redirect to keep old links working. */
export default function AnalyticsPage() {
  redirect("/journal");
}