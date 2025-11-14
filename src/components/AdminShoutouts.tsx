import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { MessageSquare, CheckCircle } from "lucide-react";

interface ShoutoutRequest {
  id: string;
  user_email: string;
  message: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  audio_url: string | null;
}

const AdminShoutouts = () => {
  const [shoutouts, setShoutouts] = useState<ShoutoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchShoutouts();
  }, []);

  const fetchShoutouts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shout_out_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching shoutouts:", error);
    } else {
      setShoutouts(data || []);
    }
    setLoading(false);
  };

  const markAsCompleted = async (id: string) => {
    setProcessingId(id);
    const { error } = await supabase
      .from("shout_out_requests")
      .update({ 
        status: "completed", 
        completed_at: new Date().toISOString() 
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Shout-out marked as completed");
      fetchShoutouts();
    }
    setProcessingId(null);
  };

  if (loading) {
    return (
      <Card className="p-6 bg-card">
        <div className="text-center text-muted-foreground">Loading shout-out requests...</div>
      </Card>
    );
  }

  const pendingShoutouts = shoutouts.filter((s) => s.status === "pending");
  const completedShoutouts = shoutouts.filter((s) => s.status === "completed");

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
        <MessageSquare className="w-6 h-6" />
        Custom Shout-Out Requests
      </h2>

      {/* Pending Requests */}
      <Card className="p-6 bg-card mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Pending ({pendingShoutouts.length})
        </h3>
        <div className="space-y-4">
          {pendingShoutouts.map((shoutout) => (
            <div
              key={shoutout.id}
              className="p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-foreground">{shoutout.user_email}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(shoutout.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  onClick={() => markAsCompleted(shoutout.id)}
                  disabled={processingId === shoutout.id}
                  size="sm"
                  variant="outline"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Complete
                </Button>
              </div>
              <div className="bg-card p-3 rounded border border-border">
                <p className="text-sm text-foreground whitespace-pre-wrap">{shoutout.message}</p>
              </div>
            </div>
          ))}

          {pendingShoutouts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No pending shout-out requests
            </div>
          )}
        </div>
      </Card>

      {/* Completed Requests */}
      <Card className="p-6 bg-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Completed ({completedShoutouts.length})
        </h3>
        <div className="space-y-3">
          {completedShoutouts.slice(0, 10).map((shoutout) => (
            <div
              key={shoutout.id}
              className="p-3 rounded-lg border border-border bg-muted/20 text-sm"
            >
              <div className="flex justify-between items-center">
                <span className="text-foreground">{shoutout.user_email}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(shoutout.completed_at!), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))}

          {completedShoutouts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No completed shout-outs yet
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AdminShoutouts;