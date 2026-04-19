"use client"

import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createCustomer } from "./actions"

const initialCreateCustomerState = {
  success: null,
  error: null,
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating..." : "Create Customer"}
    </Button>
  )
}

export function ClientsCreateForm() {
  const [state, formAction] = useActionState(createCustomer, initialCreateCustomerState)

  useEffect(() => {
    if (state.error) {
      toast.error(state.error)
    }
    if (state.success) {
      toast.success(state.success)
    }
  }, [state.error, state.success])

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <div className="space-y-2">
        <Label htmlFor="customer-email">Customer Email</Label>
        <Input
          id="customer-email"
          name="email"
          type="email"
          required
          placeholder="customer@company.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-password">Permanent Password</Label>
        <Input
          id="customer-password"
          name="password"
          type="password"
          minLength={8}
          required
          placeholder="Minimum 8 characters"
        />
      </div>

      <SubmitButton />
    </form>
  )
}
