"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/auth/roles"

type CreateCustomerState = {
  success: string | null
  error: string | null
}

export async function createCustomer(
  _previousState: CreateCustomerState,
  formData: FormData,
): Promise<CreateCustomerState> {
  const { user: adminUser } = await requireAdmin()

  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "").trim()

  if (!email || !password) {
    return { success: null, error: "Email and password are required." }
  }

  if (password.length < 8) {
    return {
      success: null,
      error: "Password must be at least 8 characters.",
    }
  }

  const adminSupabase = createAdminClient()
  const { data: created, error: createError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError || !created.user) {
    return {
      success: null,
      error: createError?.message ?? "Failed to create customer account.",
    }
  }

  const { error: profileError } = await adminSupabase.from("user_profiles").upsert(
    {
      user_id: created.user.id,
      email,
      role: "customer",
      created_by: adminUser.id,
    },
    { onConflict: "user_id" },
  )

  if (profileError) {
    return {
      success: null,
      error: profileError.message,
    }
  }

  revalidatePath("/dashboard/clients")

  return {
    success: `Customer account created for ${email}.`,
    error: null,
  }
}
