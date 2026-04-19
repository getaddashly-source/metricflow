import { redirect } from "next/navigation"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"

export async function requireAuthenticatedUserWithProfile() {
  const { user, profile } = await getCurrentUserProfile()

  if (!user) {
    redirect("/login")
  }

  if (!profile) {
    redirect(
      "/login?error=" + encodeURIComponent("Profile missing. Contact support."),
    )
  }

  return { user, profile }
}

export async function requireAdmin() {
  const { user, profile } = await requireAuthenticatedUserWithProfile()

  if (profile.role !== "admin") {
    redirect("/dashboard/analytics")
  }

  return { user, profile }
}
