import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Risk settings moved into the Settings page. Redirect to keep old links working. */
export default function RiskPage() {
  redirect("/settings");
}