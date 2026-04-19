import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { requireAdmin } from "@/lib/auth/roles"
import { ClientsCreateForm } from "./clients-create-form"
import { getAdminCustomersForAdmin } from "./data"

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  })
}

export default async function ClientsPage() {
  const { user } = await requireAdmin()
  const customers = await getAdminCustomersForAdmin(user.id)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Clients</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Create customer accounts and review customers created by your admin account.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Customer</CardTitle>
          <CardDescription>
            Set permanent credentials for a new customer account. Password reset is not available yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientsCreateForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Created Customers</CardTitle>
          <CardDescription>
            Total customers: {customers.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <p className="text-sm text-zinc-500">No customers created yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.user_id}>
                    <TableCell className="font-medium">{customer.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{customer.role}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(customer.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
