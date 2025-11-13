import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit, Save, X, Trash2, Plus, Link as LinkIcon, CheckCircle, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Prize {
  id: string;
  name: string;
  emoji: string;
  type: string;
  weight_basic: number;
  weight_gold: number;
  weight_vip: number;
  active: boolean;
  has_delivery_content: boolean;
}

interface EditingPrize {
  id?: string;
  name: string;
  emoji: string;
  type: string;
  weight_basic: string;
  weight_gold: string;
  weight_vip: string;
  active: boolean;
  is_tier_specific: boolean;
  delivery_content: string; // Used when is_tier_specific is false
  delivery_content_basic: string;
  delivery_content_gold: string;
  delivery_content_vip: string;
}

const EnhancedPrizeManagement = () => {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPrize, setEditingPrize] = useState<EditingPrize | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isNewPrize, setIsNewPrize] = useState(false);
  const [contentStats, setContentStats] = useState({ total: 0, configured: 0 });

  const fetchPrizes = async () => {
    try {
      // Fetch prize metadata
      const { data: metadata, error: metadataError } = await supabase
        .from("prize_metadata")
        .select("id, name, emoji, type, weight_basic, weight_gold, weight_vip, active")
        .order("created_at", { ascending: false });

      if (metadataError) throw metadataError;

      // Fetch delivery content (admin-only access)
      const { data: delivery, error: deliveryError } = await supabase
        .from("prize_delivery")
        .select("prize_id, delivery_content_basic, delivery_content_gold, delivery_content_vip");

      if (deliveryError) throw deliveryError;

      // Combine data and check which prizes have delivery content
      const deliveryMap = new Map(delivery?.map(d => [
        d.prize_id, 
        d.delivery_content_basic || d.delivery_content_gold || d.delivery_content_vip
      ]) || []);

      const prizesWithContent = metadata?.map(prize => ({
        ...prize,
        has_delivery_content: deliveryMap.has(prize.id) && !!deliveryMap.get(prize.id)?.trim()
      })) || [];

      setPrizes(prizesWithContent);

      // Calculate stats
      const total = prizesWithContent.length;
      const configured = prizesWithContent.filter(p => p.has_delivery_content).length;
      setContentStats({ total, configured });

    } catch (error) {
      console.error("Error fetching prizes:", error);
      toast.error("Failed to load prizes");
    }
  };

  useEffect(() => {
    fetchPrizes();
  }, []);

  const handleEditClick = async (prize: Prize) => {
    setLoading(true);
    try {
      // Fetch delivery content for this prize
      const { data: deliveryData, error } = await supabase
        .from("prize_delivery")
        .select("is_tier_specific, delivery_content_basic, delivery_content_gold, delivery_content_vip")
        .eq("prize_id", prize.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      const isTierSpecific = deliveryData?.is_tier_specific || false;

      setEditingPrize({
        id: prize.id,
        name: prize.name,
        emoji: prize.emoji,
        type: prize.type,
        weight_basic: prize.weight_basic.toString(),
        weight_gold: prize.weight_gold.toString(),
        weight_vip: prize.weight_vip.toString(),
        active: prize.active,
        is_tier_specific: isTierSpecific,
        delivery_content: isTierSpecific ? "" : (deliveryData?.delivery_content_basic || ""),
        delivery_content_basic: deliveryData?.delivery_content_basic || "",
        delivery_content_gold: deliveryData?.delivery_content_gold || "",
        delivery_content_vip: deliveryData?.delivery_content_vip || "",
      });
      setIsNewPrize(false);
      setDialogOpen(true);
    } catch (error) {
      console.error("Error fetching prize details:", error);
      toast.error("Failed to load prize details");
    } finally {
      setLoading(false);
    }
  };

  const handleNewPrize = () => {
    setEditingPrize({
      name: "",
      emoji: "🎁",
      type: "digital_link",
      weight_basic: "10",
      weight_gold: "10",
      weight_vip: "10",
      active: true,
      is_tier_specific: false,
      delivery_content: "",
      delivery_content_basic: "",
      delivery_content_gold: "",
      delivery_content_vip: "",
    });
    setIsNewPrize(true);
    setDialogOpen(true);
  };

  const handleSavePrize = async () => {
    if (!editingPrize) return;

    if (!editingPrize.name.trim()) {
      toast.error("Prize name is required");
      return;
    }

    if (!editingPrize.emoji.trim()) {
      toast.error("Prize emoji is required");
      return;
    }

    // Validate delivery content based on mode
    if (editingPrize.is_tier_specific) {
      if (!editingPrize.delivery_content_basic.trim() ||
          !editingPrize.delivery_content_gold.trim() ||
          !editingPrize.delivery_content_vip.trim()) {
        toast.error("All tier-specific delivery content is required (Basic, Gold, and VIP)");
        return;
      }
    } else {
      if (!editingPrize.delivery_content.trim()) {
        toast.error("Delivery content is required (video link, image link, or message)");
        return;
      }
    }

    const weight_basic = parseInt(editingPrize.weight_basic);
    const weight_gold = parseInt(editingPrize.weight_gold);
    const weight_vip = parseInt(editingPrize.weight_vip);

    if (isNaN(weight_basic) || isNaN(weight_gold) || isNaN(weight_vip)) {
      toast.error("Weights must be valid numbers");
      return;
    }

    setLoading(true);
    try {
      const metadataData = {
        name: editingPrize.name,
        emoji: editingPrize.emoji,
        type: editingPrize.type,
        weight_basic,
        weight_gold,
        weight_vip,
        active: editingPrize.active,
      };

      if (isNewPrize) {
        // Insert new prize metadata
        const { data: newMetadata, error: metadataError } = await supabase
          .from("prize_metadata")
          .insert(metadataData)
          .select()
          .single();

        if (metadataError) throw metadataError;

        // Insert delivery content (tier-specific or shared)
        const deliveryData = editingPrize.is_tier_specific
          ? {
              prize_id: newMetadata.id,
              is_tier_specific: true,
              delivery_content_basic: editingPrize.delivery_content_basic,
              delivery_content_gold: editingPrize.delivery_content_gold,
              delivery_content_vip: editingPrize.delivery_content_vip,
              delivery_content_legacy: editingPrize.delivery_content_basic, // Fallback
            }
          : {
              prize_id: newMetadata.id,
              is_tier_specific: false,
              delivery_content_basic: editingPrize.delivery_content,
              delivery_content_gold: editingPrize.delivery_content,
              delivery_content_vip: editingPrize.delivery_content,
              delivery_content_legacy: editingPrize.delivery_content,
            };

        const { error: deliveryError } = await supabase
          .from("prize_delivery")
          .insert(deliveryData);

        if (deliveryError) throw deliveryError;
        toast.success("Prize created successfully");
      } else {
        // Update existing prize metadata
        const { error: metadataError } = await supabase
          .from("prize_metadata")
          .update(metadataData)
          .eq("id", editingPrize.id);

        if (metadataError) throw metadataError;

        // Upsert delivery content (tier-specific or shared)
        const deliveryData = editingPrize.is_tier_specific
          ? {
              prize_id: editingPrize.id,
              is_tier_specific: true,
              delivery_content_basic: editingPrize.delivery_content_basic,
              delivery_content_gold: editingPrize.delivery_content_gold,
              delivery_content_vip: editingPrize.delivery_content_vip,
              delivery_content_legacy: editingPrize.delivery_content_basic, // Fallback
            }
          : {
              prize_id: editingPrize.id,
              is_tier_specific: false,
              delivery_content_basic: editingPrize.delivery_content,
              delivery_content_gold: editingPrize.delivery_content,
              delivery_content_vip: editingPrize.delivery_content,
              delivery_content_legacy: editingPrize.delivery_content,
            };

        const { error: deliveryError } = await supabase
          .from("prize_delivery")
          .upsert(deliveryData);

        if (deliveryError) throw deliveryError;
        toast.success("Prize updated successfully");
      }

      setDialogOpen(false);
      setEditingPrize(null);
      fetchPrizes();
    } catch (error) {
      console.error("Error saving prize:", error);
      toast.error("Failed to save prize");
    } finally {
      setLoading(false);
    }
  };

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

    toast.success(`Prize ${!currentActive ? "activated" : "deactivated"}`);
    fetchPrizes();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      // Delivery content will be cascade deleted due to foreign key
      const { error } = await supabase
        .from("prize_metadata")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Prize deleted successfully");
      fetchPrizes();
    } catch (error) {
      console.error("Error deleting prize:", error);
      toast.error("Failed to delete prize");
    } finally {
      setLoading(false);
    }
  };

  const getTypeDescription = (type: string) => {
    switch (type) {
      case "digital_link":
        return "Link (video, image, etc.)";
      case "code":
        return "Discount/Promo Code";
      case "message":
        return "Text Message";
      default:
        return type;
    }
  };

  const getPlaceholder = (type: string) => {
    switch (type) {
      case "digital_link":
        return "https://example.com/secret-video.mp4\nhttps://drive.google.com/file/d/xxx\nhttps://youtu.be/xxxxx";
      case "code":
        return "DISCOUNT50OFF\nVIP2024EXCLUSIVE";
      case "message":
        return "Congratulations! You won exclusive access. Check your email for details.";
      default:
        return "Enter the content that will be delivered to the winner...";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Prize Management</h2>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-muted-foreground">
                {contentStats.configured} of {contentStats.total} prizes have delivery content
              </span>
            </div>
          </div>
        </div>
        <Button
          onClick={handleNewPrize}
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Prize
        </Button>
      </div>

      <div className="grid gap-4">
        {prizes.map((prize) => (
          <Card key={prize.id} className="p-6 bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{prize.emoji}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-foreground">{prize.name}</div>
                    {prize.has_delivery_content ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Type: {getTypeDescription(prize.type)} | Weights: {prize.weight_basic}/
                    {prize.weight_gold}/{prize.weight_vip}
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
                  onClick={() => handleEditClick(prize)}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  onClick={() => toggleActive(prize.id, prize.active)}
                  variant="outline"
                  size="sm"
                >
                  Toggle
                </Button>
                <Button
                  onClick={() => handleDelete(prize.id, prize.name)}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl">
              {isNewPrize ? "Create New Prize" : "Edit Prize"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isNewPrize
                ? "Add a new prize with delivery content (video link, image, code, or message)"
                : "Update prize details, probability weights, and delivery content"}
            </DialogDescription>
          </DialogHeader>

          {editingPrize && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Prize Name *
                  </label>
                  <Input
                    type="text"
                    value={editingPrize.name}
                    onChange={(e) =>
                      setEditingPrize({ ...editingPrize, name: e.target.value })
                    }
                    placeholder="e.g., Secret Photo Drop"
                    className="bg-background border-border text-foreground"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Emoji *
                  </label>
                  <Input
                    type="text"
                    value={editingPrize.emoji}
                    onChange={(e) =>
                      setEditingPrize({ ...editingPrize, emoji: e.target.value })
                    }
                    placeholder="🎁"
                    className="bg-background border-border text-foreground text-2xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Prize Type *
                </label>
                <Select
                  value={editingPrize.type}
                  onValueChange={(value) =>
                    setEditingPrize({ ...editingPrize, type: value })
                  }
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="digital_link">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" />
                        Digital Link (Video, Image, etc.)
                      </div>
                    </SelectItem>
                    <SelectItem value="code">Discount/Promo Code</SelectItem>
                    <SelectItem value="message">Text Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tier-Specific Content Toggle */}
              <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-lg border border-border">
                <input
                  type="checkbox"
                  id="is_tier_specific"
                  checked={editingPrize.is_tier_specific}
                  onChange={(e) =>
                    setEditingPrize({ ...editingPrize, is_tier_specific: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="is_tier_specific" className="text-sm text-foreground cursor-pointer">
                  <span className="font-semibold">Use tier-specific content</span>
                  <span className="block text-xs text-muted-foreground mt-1">
                    Enable this to set different mystery videos/content for each tier (Basic, Gold, VIP)
                  </span>
                </label>
              </div>

              {/* Delivery Content Fields */}
              {editingPrize.is_tier_specific ? (
                // Show tier-specific fields
                <div className="space-y-4">
                  <div className="text-sm font-medium text-foreground">
                    Tier-Specific Delivery Content *
                  </div>

                  {/* Basic Tier Content */}
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                    <label className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2 block">
                      Basic Tier Content {editingPrize.type === "digital_link" && "(Video/Image Link)"}
                    </label>
                    <Textarea
                      value={editingPrize.delivery_content_basic}
                      onChange={(e) =>
                        setEditingPrize({ ...editingPrize, delivery_content_basic: e.target.value })
                      }
                      placeholder={getPlaceholder(editingPrize.type)}
                      className="bg-background border-border text-foreground font-mono text-sm min-h-[100px]"
                      rows={4}
                    />
                  </div>

                  {/* Gold Tier Content */}
                  <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                    <label className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2 block">
                      Gold Tier Content {editingPrize.type === "digital_link" && "(Video/Image Link)"}
                    </label>
                    <Textarea
                      value={editingPrize.delivery_content_gold}
                      onChange={(e) =>
                        setEditingPrize({ ...editingPrize, delivery_content_gold: e.target.value })
                      }
                      placeholder={getPlaceholder(editingPrize.type)}
                      className="bg-background border-border text-foreground font-mono text-sm min-h-[100px]"
                      rows={4}
                    />
                  </div>

                  {/* VIP Tier Content */}
                  <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                    <label className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2 block">
                      VIP Tier Content {editingPrize.type === "digital_link" && "(Video/Image Link)"}
                    </label>
                    <Textarea
                      value={editingPrize.delivery_content_vip}
                      onChange={(e) =>
                        setEditingPrize({ ...editingPrize, delivery_content_vip: e.target.value })
                      }
                      placeholder={getPlaceholder(editingPrize.type)}
                      className="bg-background border-border text-foreground font-mono text-sm min-h-[100px]"
                      rows={4}
                    />
                  </div>

                  <div className="text-xs text-muted-foreground bg-blue-500/10 p-3 rounded border border-blue-500/30">
                    {editingPrize.type === "digital_link" && (
                      <>
                        <p>💡 Set different videos/images for each tier to reward higher-tier users</p>
                        <p>Example: Basic = Teaser, Gold = Full video, VIP = Extended cut + bonus</p>
                      </>
                    )}
                    {editingPrize.type === "code" && (
                      <p>💡 Example: Basic = 10% OFF, Gold = 25% OFF, VIP = 50% OFF</p>
                    )}
                    {editingPrize.type === "message" && (
                      <p>💡 Customize message content based on tier value</p>
                    )}
                  </div>
                </div>
              ) : (
                // Show single shared content field
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Delivery Content (Shared for all tiers) * {editingPrize.type === "digital_link" && "(Video/Image Link)"}
                  </label>
                  <Textarea
                    value={editingPrize.delivery_content}
                    onChange={(e) =>
                      setEditingPrize({ ...editingPrize, delivery_content: e.target.value })
                    }
                    placeholder={getPlaceholder(editingPrize.type)}
                    className="bg-background border-border text-foreground font-mono text-sm min-h-[120px]"
                    rows={6}
                  />
                  <div className="mt-2 text-xs text-muted-foreground">
                    {editingPrize.type === "digital_link" && (
                      <>
                        <p>💡 Examples: YouTube link, Google Drive video, Dropbox image, etc.</p>
                        <p>Enter one or multiple links (one per line for multiple options)</p>
                      </>
                    )}
                    {editingPrize.type === "code" && (
                      <p>💡 Enter the discount code or promo code that will be sent to the winner</p>
                    )}
                    {editingPrize.type === "message" && (
                      <p>💡 Enter the message that will be delivered to the winner via email</p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Probability Weights (higher = more likely)
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Basic Tier
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={editingPrize.weight_basic}
                      onChange={(e) =>
                        setEditingPrize({ ...editingPrize, weight_basic: e.target.value })
                      }
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Gold Tier
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={editingPrize.weight_gold}
                      onChange={(e) =>
                        setEditingPrize({ ...editingPrize, weight_gold: e.target.value })
                      }
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      VIP Tier
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={editingPrize.weight_vip}
                      onChange={(e) =>
                        setEditingPrize({ ...editingPrize, weight_vip: e.target.value })
                      }
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Higher weights mean the prize appears more frequently. Set to 0 to disable for a
                  tier.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={editingPrize.active}
                  onChange={(e) =>
                    setEditingPrize({ ...editingPrize, active: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="active" className="text-sm text-foreground cursor-pointer">
                  Active (visible on the wheel)
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSavePrize}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? "Saving..." : isNewPrize ? "Create Prize" : "Save Changes"}
                </Button>
                <Button
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingPrize(null);
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
    </div>
  );
};

export default EnhancedPrizeManagement;
