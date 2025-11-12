import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import AdminAnalytics from "@/components/AdminAnalytics";
import PrizeManagement from "@/components/PrizeManagement";
import ManualPrizeFulfillment from "@/components/ManualPrizeFulfillment";
import UserManagement from "@/components/UserManagement";
import UserMenu from "@/components/UserMenu";
import ShoutOutManagement from "@/components/ShoutOutManagement";
import AdminNotifications from "@/components/AdminNotifications";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check initial session
    const initializeAdmin = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setLoading(false);
        navigate("/auth");
        return;
      }

      setUser(session.user);
      await verifyAdminRole(session.user.id);
    };

    initializeAdmin();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await verifyAdminRole(session.user.id);
      } else {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const verifyAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("app_role")
        .eq("user_id", userId)
        .eq("app_role", "admin")
        .maybeSingle();

      if (error) {
        console.error("Error checking admin role:", error);
        toast.error("Error checking admin status");
        setLoading(false);
        setIsAdmin(false);
        navigate("/");
        return;
      }

      if (!data) {
        toast.error("Access denied. Admin privileges required.");
        setLoading(false);
        setIsAdmin(false);
        navigate("/");
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
      setLoading(false);
      navigate("/");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background aurora-bg flex items-center justify-center">
        <Card className="p-8 bg-card">
          <p className="text-foreground">Verifying admin access...</p>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background aurora-bg">
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-foreground">Admin Dashboard</h1>
          <div className="flex gap-3 items-center">
            <Button onClick={() => navigate("/")} variant="outline" className="rounded-full">
              ← Back to App
            </Button>
            {user && <UserMenu user={user} onLogout={handleLogout} />}
          </div>
        </div>
        <AdminAnalytics />
        <AdminNotifications />
        <ShoutOutManagement />
        <UserManagement />
        <ManualPrizeFulfillment />
        <PrizeManagement />
      </div>
    </div>
  );
};

export default Admin;
