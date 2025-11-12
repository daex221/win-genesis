import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mic, CheckCircle, Loader2 } from "lucide-react";

interface ShoutOutRequest {
  id: string;
  user_email: string;
  message: string;
  status: string;
  audio_url: string | null;
  created_at: string;
  spin_id: string | null;
}

const ShoutOutManagement = () => {
  const [requests, setRequests] = useState<ShoutOutRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("shout_out_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching shout-out requests:", error);
      toast.error("Failed to load shout-out requests");
      return;
    }

    setRequests(data || []);
  };

  const handleGenerateVoice = async (request: ShoutOutRequest) => {
    setGenerating(request.id);
    try {
      const messageToSpeak = customMessage[request.id] || request.message;

      const { data, error } = await supabase.functions.invoke("generate-voice-message", {
        body: {
          userEmail: request.user_email,
          prizeName: "Custom Shout-Out",
          message: messageToSpeak,
          voiceId: "9BWtsMINqrJLrRacOk9x", // Aria voice
          spinId: request.spin_id,
        },
      });

      if (error) throw error;

      // Update the request with audio URL
      await supabase
        .from("shout_out_requests")
        .update({
          audio_url: data.audioUrl,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      toast.success("Voice message generated and sent!");
      fetchRequests();
    } catch (error) {
      console.error("Error generating voice:", error);
      toast.error("Failed to generate voice message");
    } finally {
      setGenerating(null);
    }
  };

  const handleMarkComplete = async (requestId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("shout_out_requests")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Shout-out marked as completed");
      fetchRequests();
    } catch (error) {
      console.error("Error updating shout-out:", error);
      toast.error("Failed to update shout-out");
    } finally {
      setLoading(false);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const completedRequests = requests.filter((r) => r.status === "completed");

  return (
    <div className="space-y-6 mb-8">
      <h2 className="text-2xl font-bold text-foreground">Custom Shout-Out Requests</h2>

      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-cyan-400">
            Pending ({pendingRequests.length})
          </h3>
          {pendingRequests.map((request) => (
            <Card key={request.id} className="p-6 bg-card border-cyan-500/20">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(request.created_at).toLocaleString()}
                    </p>
                    <p className="font-semibold text-foreground mt-1">
                      {request.user_email}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                    Pending
                  </span>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">
                    User's Message:
                  </label>
                  <p className="text-muted-foreground bg-white/5 p-3 rounded border border-white/10">
                    {request.message}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">
                    Custom Message to Record (optional):
                  </label>
                  <Textarea
                    value={customMessage[request.id] || ""}
                    onChange={(e) =>
                      setCustomMessage({ ...customMessage, [request.id]: e.target.value })
                    }
                    placeholder="Enter custom message or leave blank to use user's message"
                    className="bg-white/10 border-white/20"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleGenerateVoice(request)}
                    disabled={generating === request.id}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                  >
                    {generating === request.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 mr-2" />
                        Generate & Send Voice Message
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleMarkComplete(request.id)}
                    disabled={loading}
                    variant="outline"
                    className="border-green-500 text-green-400 hover:bg-green-500/10"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete Manually
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {completedRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-green-400">
            Completed ({completedRequests.length})
          </h3>
          {completedRequests.slice(0, 5).map((request) => (
            <Card key={request.id} className="p-4 bg-card/50 border-green-500/20">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-foreground">{request.user_email}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                    Completed
                  </span>
                  {request.audio_url && (
                    <a
                      href={request.audio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 hover:underline"
                    >
                      Listen
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {pendingRequests.length === 0 && completedRequests.length === 0 && (
        <Card className="p-6 bg-card text-center">
          <p className="text-muted-foreground">No shout-out requests yet</p>
        </Card>
      )}
    </div>
  );
};

export default ShoutOutManagement;
