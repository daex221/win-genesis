import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Prize {
  id: string;
  name: string;
  emoji: string;
  type: string;
  weight_basic: number;
  weight_gold: number;
  weight_vip: number;
  delivery_content: string;
  active: boolean;
}

const PrizeManagement = () => {
  const [prizes, setPrizes] = useState<Prize[]>([]);

  const fetchPrizes = async () => {
    const { data, error } = await supabase
      .from("prizes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching prizes:", error);
      toast.error("Failed to load prizes");
      return;
    }

    setPrizes(data || []);
  };

  useEffect(() => {
    fetchPrizes();
  }, []);

  const toggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("prizes")
      .update({ active: !currentActive })
      .eq("id", id);

    if (error) {
      console.error("Error toggling prize:", error);
      toast.error("Failed to update prize");
      return;
    }

    toast.success("Prize updated");
    fetchPrizes();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-6">Prize Management</h2>
      <div className="grid gap-4">
        {prizes.map((prize) => (
          <Card key={prize.id} className="p-6 bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{prize.emoji}</div>
                <div>
                  <div className="font-bold text-foreground">{prize.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Type: {prize.type} | Weights: {prize.weight_basic}/{prize.weight_gold}/
                    {prize.weight_vip}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    prize.active
                      ? "bg-green-500/20 text-green-500"
                      : "bg-red-500/20 text-red-500"
                  }`}
                >
                  {prize.active ? "Active" : "Inactive"}
                </span>
                <Button
                  onClick={() => toggleActive(prize.id, prize.active)}
                  variant="outline"
                  size="sm"
                >
                  Toggle
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PrizeManagement;
