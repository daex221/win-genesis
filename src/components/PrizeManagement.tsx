import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Zap, Clock } from "lucide-react";

interface Prize {
  id: string;
  name: string;
  emoji: string;
  type: string;
  weight_basic: number;
  weight_gold: number;
  weight_vip: number;
  active: boolean;
  fulfillment_type: string;
}

interface PrizeDelivery {
  prize_id: string;
  delivery_content: string;
}

const PrizeManagement = () => {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [deliveryContent, setDeliveryContent] = useState<Record<string, string>>({});
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchPrizes = async () => {
    const { data, error } = await supabase
      .from("prize_metadata")
      .select("id, name, emoji, type, weight_basic, weight_gold, weight_vip, active, fulfillment_type")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching prizes:", error);
      toast.error("Failed to load prizes");
      return;
    }

    setPrizes(data || []);
    
    // Fetch delivery content for each prize
    if (data && data.length > 0) {
      const { data: deliveryData } = await supabase
        .from("prize_delivery")
        .select("prize_id, delivery_content")
        .in("prize_id", data.map(p => p.id));
      
      if (deliveryData) {
        const contentMap: Record<string, string> = {};
        deliveryData.forEach(d => {
          contentMap[d.prize_id] = d.delivery_content;
        });
        setDeliveryContent(contentMap);
      }
    }
  };

  useEffect(() => {
    fetchPrizes();
  }, []);

  const toggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("prize_metadata")
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

  const handleEditPrize = (prize: Prize) => {
    setEditingPrize(prize);
    setDialogOpen(true);
  };

  const handleUpdateDeliveryContent = async (prizeId: string, content: string) => {
    if (!content.trim()) {
      toast.error("Please enter delivery content");
      return;
    }

    const { error } = await supabase
      .from("prize_delivery")
      .upsert({
        prize_id: prizeId,
        delivery_content: content,
      }, {
        onConflict: 'prize_id'
      });

    if (error) {
      console.error("Error updating delivery content:", error);
      toast.error("Failed to update delivery content");
      return;
    }

    toast.success("Delivery content updated successfully!");
    await fetchPrizes();
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Prize Management</h2>
      </div>
      <div className="grid gap-4">
        {prizes.map((prize) => (
          <Card key={prize.id} className="p-6 bg-card">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="text-4xl">{prize.emoji}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="font-bold text-foreground">{prize.name}</div>
                    {prize.fulfillment_type === "automatic" ? (
                      <Badge variant="secondary" className="gap-1">
                        <Zap className="w-3 h-3" />
                        Automatic
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="w-3 h-3" />
                        Manual
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">
                    Type: {prize.type} | Weights: {prize.weight_basic}/{prize.weight_gold}/
                    {prize.weight_vip}
                  </div>
                  <div className="bg-muted p-3 rounded-md">
                    <Label className="text-xs font-semibold mb-1 block">
                      {prize.fulfillment_type === "automatic" 
                        ? "Delivery Content (Link/Code):" 
                        : "Fulfillment Instructions:"}
                    </Label>
                    <Textarea
                      value={deliveryContent[prize.id] || ""}
                      onChange={(e) => {
                        setDeliveryContent({
                          ...deliveryContent,
                          [prize.id]: e.target.value,
                        });
                      }}
                      onBlur={() => {
                        if (deliveryContent[prize.id]) {
                          handleUpdateDeliveryContent(prize.id, deliveryContent[prize.id]);
                        }
                      }}
                      placeholder={
                        prize.fulfillment_type === "automatic"
                          ? "Enter prize URL or code..."
                          : "Enter instructions for fulfilling this prize..."
                      }
                      className="text-xs min-h-[60px]"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
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
