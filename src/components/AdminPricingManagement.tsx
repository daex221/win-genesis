import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, Edit, Save, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PricingConfig {
  tier: string;
  price: number;
  stripe_price_id: string;
}

interface EditingPrice {
  tier: string;
  price: string;
  stripe_price_id: string;
  reason: string;
}

const AdminPricingManagement = () => {
  const [pricing, setPricing] = useState<PricingConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPrice, setEditingPrice] = useState<EditingPrice | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchPricing = async () => {
    const { data, error } = await supabase
      .from("pricing_config")
      .select("tier, price, stripe_price_id")
      .eq("active", true)
      .order("price", { ascending: true });

    if (error) {
      console.error("Error fetching pricing:", error);
      toast.error("Failed to load pricing");
      return;
    }

    setPricing(data || []);
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const handleEditClick = (config: PricingConfig) => {
    setEditingPrice({
      tier: config.tier,
      price: config.price.toString(),
      stripe_price_id: config.stripe_price_id,
      reason: "",
    });
    setDialogOpen(true);
  };

  const handleSavePrice = async () => {
    if (!editingPrice) return;

    const price = parseFloat(editingPrice.price);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    if (!editingPrice.stripe_price_id.trim()) {
      toast.error("Please enter a Stripe Price ID");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-pricing", {
        body: {
          tier: editingPrice.tier,
          price: price,
          stripe_price_id: editingPrice.stripe_price_id,
          reason: editingPrice.reason || "Price updated by admin",
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`${editingPrice.tier.toUpperCase()} tier price updated successfully`);
        setDialogOpen(false);
        setEditingPrice(null);
        fetchPricing();
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      console.error("Error updating pricing:", error);
      toast.error("Failed to update pricing");
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "basic":
        return "from-green-500/20 to-green-600/20 border-green-500/30";
      case "gold":
        return "from-gold/20 to-gold/30 border-gold/50";
      case "vip":
        return "from-purple-500/20 to-purple-600/20 border-purple-500/30";
      default:
        return "from-gray-500/20 to-gray-600/20 border-gray-500/30";
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <DollarSign className="w-8 h-8 text-green-500" />
        <h2 className="text-2xl font-bold text-foreground">Pricing Management</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {pricing.map((config) => (
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
                  ${config.price.toFixed(2)}
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
            <div className="text-xs text-muted-foreground break-all">
              Stripe: {config.stripe_price_id}
            </div>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl">
              Edit {editingPrice?.tier.toUpperCase()} Tier Pricing
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update the price and Stripe Price ID. This will affect all future transactions.
            </DialogDescription>
          </DialogHeader>

          {editingPrice && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Price ($)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingPrice.price}
                  onChange={(e) =>
                    setEditingPrice({ ...editingPrice, price: e.target.value })
                  }
                  placeholder="Enter price"
                  className="bg-background border-border text-foreground"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Stripe Price ID
                </label>
                <Input
                  type="text"
                  value={editingPrice.stripe_price_id}
                  onChange={(e) =>
                    setEditingPrice({ ...editingPrice, stripe_price_id: e.target.value })
                  }
                  placeholder="price_xxxxxxxxxxxxx"
                  className="bg-background border-border text-foreground font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Create price in Stripe Dashboard first, then paste the ID here
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Reason for Change (optional)
                </label>
                <Input
                  type="text"
                  value={editingPrice.reason}
                  onChange={(e) =>
                    setEditingPrice({ ...editingPrice, reason: e.target.value })
                  }
                  placeholder="e.g., Seasonal discount, Price adjustment"
                  className="bg-background border-border text-foreground"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSavePrice}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingPrice(null);
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
            <p className="font-semibold mb-1">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Create the new price in your Stripe Dashboard before updating here</li>
              <li>Price changes take effect immediately for new transactions</li>
              <li>All changes are logged in the pricing history for audit purposes</li>
              <li>Make sure the Stripe Price ID matches the amount you set</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminPricingManagement;
