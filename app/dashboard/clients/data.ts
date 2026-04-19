import { createAdminClient } from "@/lib/supabase/admin"

export type CustomerListRow = {
  user_id: string
  email: string
  role: "admin" | "customer"
  created_at: string
}

export async function getAdminCustomersForAdmin(adminUserId: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, email, role, created_at")
    .eq("created_by", adminUserId)
    .eq("role", "customer")
    .order("created_at", { ascending: false })

  if (error) {
    return [] as CustomerListRow[]
  }

  return (data ?? []) as CustomerListRow[]
}
