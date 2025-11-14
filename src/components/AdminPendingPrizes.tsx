import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Package, CheckCircle } from "lucide-react";

interface PendingSpin {
  id: string;
  email: string;
  prize_name: string;
  prize_emoji: string;
  tier: string;
  created_at: string;
  fulfillment_status: string;
}

const AdminPendingPrizes = () => {
  const [pendingSpins, setPendingSpins] = useState<PendingSpin[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingPrizes();
  }, []);

  const fetchPendingPrizes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("spins")
      .select(`
        id,
        email,
        tier,
        created_at,
        fulfillment_status,
        prize_metadata:prize_id (name, emoji, fulfillment_type)
      `)
      .eq("fulfillment_status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending prizes:", error);
    } else {
      const formatted = (data || []).map((spin: any) => ({
        id: spin.id,
        email: spin.email,
        prize_name: spin.prize_metadata?.name || "Unknown",
        prize_emoji: spin.prize_metadata?.emoji || "🎁",
        tier: spin.tier,
        created_at: spin.created_at,
        fulfillment_status: spin.fulfillment_status,
      }));
      setPendingSpins(formatted);
    }
    setLoading(false);
  };

  const markAsFulfilled = async (id: string) => {
    setProcessingId(id);
    const { error } = await supabase
      .from("spins")
      .update({ 
        fulfillment_status: "fulfilled",
        fulfilled_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update fulfillment status");
    } else {
      toast.success("Prize marked as fulfilled");
      fetchPendingPrizes();
    }
    setProcessingId(null);
  };

  if (loading) {
    return (
      <Card className="p-6 bg-card">
        <div className="text-center text-muted-foreground">Loading pending prizes...</div>
      </Card>
    );
  }

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
        <Package className="w-6 h-6" />
        Pending Manual Prizes
      </h2>

      <Card className="p-6 bg-card">
        <div className="space-y-4">
          {pendingSpins.map((spin) => (
            <div
              key={spin.id}
              className="p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3 flex-1">
                  <div className="text-4xl">{spin.prize_emoji}</div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">{spin.prize_name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{spin.email}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        spin.tier === "vip" ? "bg-primary/20 text-primary" :
                        spin.tier === "gold" ? "bg-gold/20 text-gold" :
                        "bg-green-500/20 text-green-500"
                      }`}>
                        {spin.tier.toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(spin.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => markAsFulfilled(spin.id)}
                  disabled={processingId === spin.id}
                  size="sm"
                  variant="outline"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Mark Fulfilled
                </Button>
              </div>
            </div>
          ))}

          {pendingSpins.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No pending manual prizes
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AdminPendingPrizes;