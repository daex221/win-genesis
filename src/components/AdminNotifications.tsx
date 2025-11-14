import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, CheckCircle, X } from "lucide-react";

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  spin_id: string | null;
  user_email: string;
  status: string;
  created_at: string;
}

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to load notifications");
      return;
    }

    setNotifications(data || []);
  };

  const handleMarkCompleted = async (notificationId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("admin_notifications")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", notificationId);

      if (error) throw error;

      toast.success("Notification marked as completed");
      fetchNotifications();
    } catch (error) {
      console.error("Error updating notification:", error);
      toast.error("Failed to update notification");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (notificationId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("admin_notifications")
        .update({ status: "dismissed" })
        .eq("id", notificationId);

      if (error) throw error;

      toast.success("Notification dismissed");
      fetchNotifications();
    } catch (error) {
      console.error("Error dismissing notification:", error);
      toast.error("Failed to dismiss notification");
    } finally {
      setLoading(false);
    }
  };

  const pendingNotifications = notifications.filter((n) => n.status === "pending");
  const completedNotifications = notifications.filter((n) => n.status === "completed");

  return (
    <div className="space-y-6 mb-8">
      <div className="flex items-center gap-2">
        <Bell className="w-6 h-6 text-cyan-400" />
        <h2 className="text-2xl font-bold text-foreground">Admin Notifications</h2>
        {pendingNotifications.length > 0 && (
          <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-sm rounded-full">
            {pendingNotifications.length} pending
          </span>
        )}
      </div>

      {pendingNotifications.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-cyan-400">
            Pending Actions ({pendingNotifications.length})
          </h3>
          {pendingNotifications.map((notification) => (
            <Card key={notification.id} className="p-6 bg-card border-cyan-500/20">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          notification.type === "manual_prize"
                            ? "bg-orange-500/20 text-orange-400"
                            : notification.type === "shout_out"
                            ? "bg-purple-500/20 text-purple-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {notification.type.replace("_", " ").toUpperCase()}
                      </span>
                      <p className="text-sm text-muted-foreground">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    <h4 className="font-semibold text-foreground mt-2">
                      {notification.title}
                    </h4>
                  </div>
                </div>

                <p className="text-muted-foreground">{notification.message}</p>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-cyan-400">User:</span>
                  <span className="text-foreground">{notification.user_email}</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleMarkCompleted(notification.id)}
                    disabled={loading}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Completed
                  </Button>
                  <Button
                    onClick={() => handleDismiss(notification.id)}
                    disabled={loading}
                    variant="outline"
                    className="border-red-500 text-red-400 hover:bg-red-500/10"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Dismiss
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {completedNotifications.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-green-400">
            Completed (Last 5)
          </h3>
          {completedNotifications.slice(0, 5).map((notification) => (
            <Card key={notification.id} className="p-4 bg-card/50 border-green-500/20">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-foreground">{notification.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {notification.user_email} - {new Date(notification.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                  Completed
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {pendingNotifications.length === 0 && completedNotifications.length === 0 && (
        <Card className="p-6 bg-card text-center">
          <p className="text-muted-foreground">No notifications yet</p>
        </Card>
      )}
    </div>
  );
};

export default AdminNotifications;
