import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Link as LinkIcon, Trash2 } from "lucide-react";

const PrizeManagement = () => {
  const [prizes, setPrizes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchPrizes();
  }, []);

  const fetchPrizes = async () => {
    const { data, error } = await supabase.from("prize_metadata").select("*").order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching prizes:", error);
      toast.error("Failed to load prizes");
      return;
    }

    setPrizes(data || []);
  };

  const handleEdit = (prize: any) => {
    setEditingId(prize.id);
    setEditData({ ...prize });
  };

  const handleSave = async () => {
    if (!editData?.name || !editData?.delivery_content) {
      toast.error("Prize name and delivery content are required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("prize_metadata")
        .update({
          name: editData.name,
          emoji: editData.emoji,
          delivery_content: editData.delivery_content,
          fulfillment_type: editData.fulfillment_type,
          weight_basic: editData.weight_basic || 100,
          weight_gold: editData.weight_gold || 100,
          weight_vip: editData.weight_vip || 100,
          is_active: editData.is_active !== false,
        })
        .eq("id", editingId);

      if (error) throw error;

      toast.success("Prize updated successfully");
      setEditingId(null);
      setEditData(null);
      fetchPrizes();
    } catch (error) {
      console.error("Error saving prize:", error);
      toast.error("Failed to save prize");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("prize-files").upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data } = supabase.storage.from("prize-files").getPublicUrl(fileName);

      if (data?.publicUrl) {
        setEditData({
          ...editData,
          delivery_content: data.publicUrl,
        });
        toast.success("File uploaded successfully");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prize?")) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("prize_metadata").delete().eq("id", id);

      if (error) throw error;

      toast.success("Prize deleted");
      fetchPrizes();
    } catch (error) {
      console.error("Error deleting prize:", error);
      toast.error("Failed to delete prize");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground mb-6">Prize Management</h2>

      <div className="space-y-4">
        {prizes.map((prize) => (
          <Card key={prize.id} className="p-6 bg-card">
            {editingId === prize.id ? (
              // Edit Mode
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Prize Name</label>
                  <Input
                    value={editData?.name || ""}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    placeholder="e.g., Secret Photo Drop"
                    className="bg-white/10 border-white/20"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Emoji</label>
                  <Input
                    value={editData?.emoji || ""}
                    onChange={(e) => setEditData({ ...editData, emoji: e.target.value })}
                    placeholder="e.g., 💌"
                    className="bg-white/10 border-white/20 w-24"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Fulfillment Type</label>
                  <select
                    value={editData?.fulfillment_type || "automatic"}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        fulfillment_type: e.target.value,
                      })
                    }
                    className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-foreground"
                  >
                    <option value="automatic">Automatic (Instant Delivery)</option>
                    <option value="manual">Manual (Admin Fulfillment)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Delivery Content (Link/URL)
                  </label>
                  <div className="space-y-2">
                    {/* Link Input */}
                    <Input
                      value={editData?.delivery_content || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          delivery_content: e.target.value,
                        })
                      }
                      placeholder="https://example.com/prize or paste link here"
                      className="bg-white/10 border-white/20"
                    />

                    {/* File Upload */}
                    <div className="flex gap-2">
                      <label className="flex-1">
                        <div className="cursor-pointer bg-white/10 border border-dashed border-white/20 rounded px-4 py-3 text-center hover:bg-white/20 transition">
                          <Upload className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                          <span className="text-sm text-foreground">{uploading ? "Uploading..." : "Upload File"}</span>
                        </div>
                        <input type="file" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                      </label>
                    </div>

                    {/* Show current link */}
                    {editData?.delivery_content && (
                      <div className="bg-white/5 border border-white/10 rounded p-2 break-all text-xs text-cyan-400">
                        <LinkIcon className="w-3 h-3 inline mr-1" />
                        {editData.delivery_content}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Weights (Probability per Tier)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Basic</label>
                      <Input
                        type="number"
                        value={editData?.weight_basic || 100}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            weight_basic: parseInt(e.target.value),
                          })
                        }
                        className="bg-white/10 border-white/20 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Gold</label>
                      <Input
                        type="number"
                        value={editData?.weight_gold || 100}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            weight_gold: parseInt(e.target.value),
                          })
                        }
                        className="bg-white/10 border-white/20 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">VIP</label>
                      <Input
                        type="number"
                        value={editData?.weight_vip || 100}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            weight_vip: parseInt(e.target.value),
                          })
                        }
                        className="bg-white/10 border-white/20 mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingId(null);
                      setEditData(null);
                    }}
                    variant="outline"
                    className="border-white/20"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {prize.emoji} {prize.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Type: {prize.fulfillment_type || "automatic"}</p>
                  {prize.delivery_content && (
                    <div className="mt-2 text-xs text-cyan-400 break-all">
                      <LinkIcon className="w-3 h-3 inline mr-1" />
                      {prize.delivery_content.slice(0, 50)}
                      {prize.delivery_content.length > 50 ? "..." : ""}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-2">
                    Weights: Basic {prize.weight_basic} | Gold {prize.weight_gold} | VIP {prize.weight_vip}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEdit(prize)}
                    variant="outline"
                    className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(prize.id)}
                    disabled={loading}
                    variant="outline"
                    className="border-red-500 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PrizeManagement;
