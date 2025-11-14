import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Bell, CheckCircle } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  status: string;
  user_email: string;
  created_at: string;
  completed_at: string | null;
}

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching notifications:", error);
    } else {
      setNotifications(data || []);
    }
    setLoading(false);
  };

  const markAsComplete = async (id: string) => {
    const { error } = await supabase
      .from("admin_notifications")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update notification");
    } else {
      toast.success("Notification marked as complete");
      fetchNotifications();
    }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-card">
        <div className="text-center text-muted-foreground">Loading notifications...</div>
      </Card>
    );
  }

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
        <Bell className="w-6 h-6" />
        Admin Notifications
      </h2>
      <Card className="p-6 bg-card">
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border ${
                notification.status === "pending"
                  ? "border-yellow-500/50 bg-yellow-500/10"
                  : "border-border bg-muted/20"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">{notification.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{notification.user_email}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</span>
                    <span className={`px-2 py-1 rounded-full font-semibold ${
                      notification.type === "prize" ? "bg-primary/20 text-primary" :
                      notification.type === "shoutout" ? "bg-gold/20 text-gold" :
                      "bg-blue-500/20 text-blue-500"
                    }`}>
                      {notification.type}
                    </span>
                  </div>
                </div>
                {notification.status === "pending" && (
                  <Button
                    onClick={() => markAsComplete(notification.id)}
                    size="sm"
                    variant="outline"
                    className="ml-4"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Complete
                  </Button>
                )}
              </div>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No notifications
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AdminNotifications;