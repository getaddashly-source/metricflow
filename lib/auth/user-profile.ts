import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export type UserRole = "admin" | "customer"

export type UserProfile = {
  user_id: string
  email: string
  role: UserRole
  created_by: string | null
}

export async function getCurrentUserProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, profile: null as UserProfile | null }
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_id, email, role, created_by")
    .eq("user_id", user.id)
    .maybeSingle<UserProfile>()

  if (profile) {
    return { user, profile }
  }

  // Fallback path: read with service role and auto-heal missing profiles.
  const admin = createAdminClient()
  const { data: adminProfile } = await admin
    .from("user_profiles")
    .select("user_id, email, role, created_by")
    .eq("user_id", user.id)
    .maybeSingle<UserProfile>()

  if (adminProfile) {
    return { user, profile: adminProfile }
  }

  const email = user.email?.trim().toLowerCase() ?? ""

  const { data: insertedProfile } = await admin
    .from("user_profiles")
    .upsert(
      {
        user_id: user.id,
        email,
        role: "customer",
        created_by: null,
      },
      { onConflict: "user_id" },
    )
    .select("user_id, email, role, created_by")
    .single<UserProfile>()

  return { user, profile: insertedProfile ?? null }
}
