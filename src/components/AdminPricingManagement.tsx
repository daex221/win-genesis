import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Zap, Edit, Save, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SpinCostConfig {
  tier: string;
  cost: number;
}

interface EditingCost {
  tier: string;
  cost: string;
  reason: string;
}

const AdminPricingManagement = () => {
  const [spinCosts, setSpinCosts] = useState<SpinCostConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCost, setEditingCost] = useState<EditingCost | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchSpinCosts = async () => {
    // Using default spin costs (can be made dynamic later if needed)
    const defaultCosts: SpinCostConfig[] = [
      { tier: 'basic', cost: 15 },
      { tier: 'gold', cost: 25 },
      { tier: 'vip', cost: 50 },
    ];
    setSpinCosts(defaultCosts);
  };

  useEffect(() => {
    fetchSpinCosts();
  }, []);

  const handleEditClick = (config: SpinCostConfig) => {
    setEditingCost({
      tier: config.tier,
      cost: config.cost.toString(),
      reason: "",
    });
    setDialogOpen(true);
  };

  const handleSaveCost = async () => {
    if (!editingCost) return;

    const cost = parseFloat(editingCost.cost);
    if (isNaN(cost) || cost <= 0) {
      toast.error("Please enter a valid spin cost");
      return;
    }

    setLoading(true);
    try {
      // Update the spin cost in local state
      setSpinCosts(prev => prev.map(sc =>
        sc.tier === editingCost.tier ? { ...sc, cost } : sc
      ));

      toast.success(`${editingCost.tier.toUpperCase()} tier spin cost updated to $${cost}`);
      toast.info("Note: This is a local change. Implement backend storage if needed.");

      setDialogOpen(false);
      setEditingCost(null);
    } catch (error) {
      console.error("Error updating spin cost:", error);
      toast.error("Failed to update spin cost");
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "basic":
        return "from-green-500/20 to-green-600/20 border-green-500/30";
      case "gold":
        return "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30";
      case "vip":
        return "from-purple-500/20 to-purple-600/20 border-purple-500/30";
      default:
        return "from-gray-500/20 to-gray-600/20 border-gray-500/30";
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Zap className="w-8 h-8 text-yellow-500" />
        <h2 className="text-2xl font-bold text-foreground">Spin Cost Management</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {spinCosts.map((config) => (
          <Card
            key={config.tier}
            className={`p-6 bg-gradient-to-br ${getTierColor(config.tier)} border-2`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-muted-foreground uppercase tracking-wider">
                  {config.tier} Tier
                </div>
                <div className="text-4xl font-black text-foreground mt-1">
                  ${config.cost}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  per spin
                </div>
              </div>
              <Button
                onClick={() => handleEditClick(config)}
                variant="outline"
                size="sm"
                className="rounded-full"
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl">
              Edit {editingCost?.tier.toUpperCase()} Tier Spin Cost
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update how much each spin costs for this tier. This is deducted from the user's wallet balance.
            </DialogDescription>
          </DialogHeader>

          {editingCost && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Spin Cost ($)
                </label>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  value={editingCost.cost}
                  onChange={(e) =>
                    setEditingCost({ ...editingCost, cost: e.target.value })
                  }
                  placeholder="Enter spin cost"
                  className="bg-background border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Amount deducted from wallet per spin (in dollars)
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Reason for Change (optional)
                </label>
                <Input
                  type="text"
                  value={editingCost.reason}
                  onChange={(e) =>
                    setEditingCost({ ...editingCost, reason: e.target.value })
                  }
                  placeholder="e.g., Adjusting game economy"
                  className="bg-background border-border text-foreground"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveCost}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingCost(null);
                  }}
                  variant="outline"
                  disabled={loading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="p-4 bg-blue-500/10 border-blue-500/30 mt-6">
        <div className="flex items-start gap-3">
          <div className="text-blue-500 text-xl">ℹ️</div>
          <div className="text-sm text-foreground">
            <p className="font-semibold mb-1">About Spin Costs:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>Spin costs are NOT related to Stripe payments</strong></li>
              <li>Stripe is used ONLY for funding user wallets</li>
              <li>These costs determine how much is deducted per spin from the wallet</li>
              <li>Users fund their wallet via Stripe, then pay these amounts per spin</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminPricingManagement;
