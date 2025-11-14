import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Users, Search } from "lucide-react";

interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  role: string | null;
  total_spins: number;
  total_spent: number;
}

const AdminUserManagement = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);

    // Fetch spins data
    const { data: spinsData } = await supabase
      .from("spins")
      .select("email, amount_paid");

    // Aggregate spins by email
    const spinsByEmail = (spinsData || []).reduce((acc, spin) => {
      if (!acc[spin.email]) {
        acc[spin.email] = { count: 0, total: 0 };
      }
      acc[spin.email].count += 1;
      acc[spin.email].total += Number(spin.amount_paid);
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    // Fetch user roles
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, app_role");

    const rolesByUserId = (rolesData || []).reduce((acc, role) => {
      acc[role.user_id] = role.app_role;
      return acc;
    }, {} as Record<string, string>);

    // Note: We can't directly query auth.users, so we'll get unique emails from spins
    const uniqueEmails = [...new Set((spinsData || []).map((s) => s.email))];

    const userData: UserData[] = uniqueEmails.map((email) => ({
      id: email, // Using email as ID since we can't access user IDs
      email,
      created_at: new Date().toISOString(), // Placeholder
      last_sign_in_at: new Date().toISOString(), // Placeholder
      role: null, // Can't directly link without user_id
      total_spins: spinsByEmail[email]?.count || 0,
      total_spent: spinsByEmail[email]?.total || 0,
    }));

    setUsers(userData.sort((a, b) => b.total_spent - a.total_spent));
    setLoading(false);
  };

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card className="p-6 bg-card">
        <div className="text-center text-muted-foreground">Loading users...</div>
      </Card>
    );
  }

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
        <Users className="w-6 h-6" />
        User Management
      </h2>

      <Card className="p-6 bg-card">
        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Email</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Total Spins</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Total Spent</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Role</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-border/50 hover:bg-muted/50">
                  <td className="py-3 px-4 text-sm text-foreground">{user.email}</td>
                  <td className="py-3 px-4 text-sm text-foreground">{user.total_spins}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-foreground">
                    ${user.total_spent.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      user.role === "admin"
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {user.role || "user"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "No users found" : "No users yet"}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminUserManagement;