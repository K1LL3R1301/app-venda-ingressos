import { redirect } from "next/navigation";

export default function AdminRequestsRedirectPage() {
  redirect("/admin/support?tab=admin-requests");
}

