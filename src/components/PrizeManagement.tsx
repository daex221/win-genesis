import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Link as LinkIcon, Trash2, Plus } from "lucide-react";

const PrizeManagement = () => {
  const [prizes, setPrizes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [contentPool, setContentPool] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showContentPool, setShowContentPool] = useState<string | null>(null);
  const [addingContent, setAddingContent] = useState(false);

  useEffect(() => {
    fetchPrizes();
  }, []);

  const fetchPrizes = async () => {
    try {
      const { data, error } = await supabase
        .from("prize_metadata")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPrizes(data || []);
    } catch (error) {
      console.error("Error fetching prizes:", error);
      toast.error("Failed to load prizes");
    }
  };

  const fetchContentPool = async (prizeId: string) => {
    try {
      const { data, error } = await supabase
        .from("prize_content_pool")
        .select("*")
        .eq("prize_id", prizeId)
        .order("sequence_order", { ascending: true });

      if (error) throw error;
      setContentPool(data || []);
    } catch (error) {
      console.error("Error fetching content pool:", error);
      toast.error("Failed to load content pool");
    }
  };

  const handleEdit = (prize: any) => {
    setEditingId(prize.id);
    setEditData({ ...prize });
    fetchContentPool(prize.id);
    setShowContentPool(prize.id);
  };

  const handleSave = async () => {
    if (!editData?.name) {
      toast.error("Prize name is required");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Saving prize...");

    try {
      const { error } = await supabase
        .from("prize_metadata")
        .update({
          name: editData.name,
          emoji: editData.emoji,
          fulfillment_type: editData.fulfillment_type,
          weight_basic: editData.weight_basic || 100,
          weight_gold: editData.weight_gold || 100,
          weight_vip: editData.weight_vip || 100,
          active: editData.active !== false,
        })
        .eq("id", editingId);

      if (error) throw error;

      toast.dismiss(toastId);
      toast.success("Prize saved successfully!");
      setEditingId(null);
      setEditData(null);
      setShowContentPool(null);
      setContentPool([]);
      fetchPrizes();
    } catch (error) {
      console.error("Error saving prize:", error);
      toast.dismiss(toastId);
      toast.error("Failed to save prize: " + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContentItem = async (prizeId: string, contentUrl: string, contentName: string) => {
    if (!contentUrl.trim()) {
      toast.error("Content URL is required");
      return;
    }

    setAddingContent(true);
    const toastId = toast.loading("Adding content...");

    try {
      console.log("Adding content:", { prizeId, contentUrl, contentName });
      
      const maxSequence = contentPool.length > 0 ? Math.max(...contentPool.map((c) => c.sequence_order || 0)) : 0;

      const { data, error } = await supabase.from("prize_content_pool").insert({
        prize_id: prizeId,
        content_url: contentUrl.trim(),
        content_name: contentName?.trim() || `Content ${contentPool.length + 1}`,
        sequence_order: maxSequence + 1,
        is_active: true,
      }).select();

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      console.log("Content added successfully:", data);
      toast.dismiss(toastId);
      toast.success("Content added!");
      await fetchContentPool(prizeId);
    } catch (error: any) {
      console.error("Error adding content:", error);
      toast.dismiss(toastId);
      toast.error(error.message || "Failed to add content");
    } finally {
      setAddingContent(false);
    }
  };

  const handleDeleteContentItem = async (contentId: string, prizeId: string) => {
    if (!confirm("Delete this content item?")) return;

    setLoading(true);
    const toastId = toast.loading("Deleting...");

    try {
      const { error } = await supabase.from("prize_content_pool").delete().eq("id", contentId);

      if (error) throw error;

      toast.dismiss(toastId);
      toast.success("Content deleted!");
      await fetchContentPool(prizeId);
    } catch (error) {
      console.error("Error deleting content:", error);
      toast.dismiss(toastId);
      toast.error("Failed to delete content");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, prizeId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const toastId = toast.loading("Uploading file...");

    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("prize-files").upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("prize-files").getPublicUrl(fileName);

      if (data?.publicUrl) {
        await handleAddContentItem(prizeId, data.publicUrl, file.name);
        toast.dismiss(toastId);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.dismiss(toastId);
      toast.error("Failed to upload file: " + (error as any).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prize?")) return;

    setLoading(true);
    const toastId = toast.loading("Deleting prize...");

    try {
      const { error } = await supabase.from("prize_metadata").delete().eq("id", id);

      if (error) throw error;

      toast.dismiss(toastId);
      toast.success("Prize deleted!");
      fetchPrizes();
    } catch (error) {
      console.error("Error deleting prize:", error);
      toast.dismiss(toastId);
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
                    placeholder="e.g., Mystery Video"
                    className="bg-white/10 border-white/20"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Emoji</label>
                  <Input
                    value={editData?.emoji || ""}
                    onChange={(e) => setEditData({ ...editData, emoji: e.target.value })}
                    placeholder="e.g., 🎥"
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
                            weight_basic: parseInt(e.target.value) || 100,
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
                            weight_gold: parseInt(e.target.value) || 100,
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
                            weight_vip: parseInt(e.target.value) || 100,
                          })
                        }
                        className="bg-white/10 border-white/20 mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Content Pool Section */}
                <div className="border-t border-white/10 pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-semibold text-foreground">Content Pool (Multiple Items)</label>
                    <span className="text-xs text-cyan-400">
                      {contentPool.length} item{contentPool.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Existing Content Items */}
                  <div className="space-y-2 mb-4">
                    {contentPool.map((content, idx) => (
                      <div
                        key={content.id}
                        className="flex items-center justify-between bg-white/5 border border-white/10 rounded p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-cyan-400 font-semibold">
                            {content.content_name || `Content ${idx + 1}`}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{content.content_url}</p>
                        </div>
                        <Button
                          onClick={() => handleDeleteContentItem(content.id, editData.id)}
                          disabled={loading}
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-400 hover:bg-red-500/10 ml-2"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Add New Content */}
                  <div className="space-y-2 bg-white/5 border border-dashed border-white/20 rounded p-4">
                    <p className="text-xs text-muted-foreground mb-2">Add Content Item:</p>

                    {/* File Upload */}
                    <label className="flex-1">
                      <div className="cursor-pointer bg-white/10 border border-dashed border-white/20 rounded px-4 py-3 text-center hover:bg-white/20 transition">
                        <Upload className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                        <span className="text-sm text-foreground">{uploading ? "Uploading..." : "Upload File"}</span>
                      </div>
                      <input
                        type="file"
                        onChange={(e) => handleFileUpload(e, editData.id)}
                        disabled={uploading || loading}
                        className="hidden"
                      />
                    </label>

                    {/* Or Link Input */}
                    <div className="flex gap-2">
                      <Input
                        id={`link-${editData.id}`}
                        placeholder="Or paste link here..."
                        className="bg-white/10 border-white/20 text-xs"
                        disabled={addingContent}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const linkInput = e.currentTarget;
                            const nameInput = document.getElementById(`name-${editData.id}`) as HTMLInputElement;
                            if (linkInput.value) {
                              handleAddContentItem(editData.id, linkInput.value, nameInput?.value || "");
                              linkInput.value = "";
                              if (nameInput) nameInput.value = "";
                            }
                          }
                        }}
                      />
                      <Input
                        id={`name-${editData.id}`}
                        placeholder="Name (optional)"
                        className="bg-white/10 border-white/20 text-xs w-32"
                        disabled={addingContent}
                      />
                      <Button
                        onClick={() => {
                          const linkInput = document.getElementById(`link-${editData.id}`) as HTMLInputElement;
                          const nameInput = document.getElementById(`name-${editData.id}`) as HTMLInputElement;
                          if (linkInput?.value) {
                            handleAddContentItem(editData.id, linkInput.value, nameInput?.value || "");
                            linkInput.value = "";
                            nameInput.value = "";
                          } else {
                            toast.error("Please enter a link");
                          }
                        }}
                        disabled={addingContent || uploading}
                        size="sm"
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 whitespace-nowrap"
                      >
                        {addingContent ? "..." : <Plus className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={loading || uploading}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingId(null);
                      setEditData(null);
                      setShowContentPool(null);
                      setContentPool([]);
                    }}
                    disabled={loading || uploading}
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
                  <div className="text-xs text-cyan-400 mt-2">📦 Content Pool Size: {contentPool.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">
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
