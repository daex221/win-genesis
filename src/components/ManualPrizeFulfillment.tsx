import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Package, Upload, Link as LinkIcon } from "lucide-react";

interface PendingPrize {
  spinId: string;
  userEmail: string;
  prizeName: string;
  prizeEmoji: string;
  tier: string;
  amountPaid: number;
  wonAt: string;
  timeElapsed: string;
  fulfillmentInstructions: string;
  transactionId: string;
}

export default function ManualPrizeFulfillment() {
  const [pendingPrizes, setPendingPrizes] = useState<PendingPrize[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrize, setSelectedPrize] = useState<PendingPrize | null>(null);
  const [prizeLink, setPrizeLink] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [fulfilling, setFulfilling] = useState(false);

  useEffect(() => {
    fetchPendingPrizes();
  }, []);

  const fetchPendingPrizes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("pending-prizes");

      if (error) throw error;

      setPendingPrizes(data.prizes || []);
    } catch (error) {
      console.error("Error fetching pending prizes:", error);
      toast.error("Failed to load pending prizes");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${selectedPrize?.spinId}_${Date.now()}.${fileExt}`;
      const filePath = `prizes/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  };

  const handleFulfillPrize = async () => {
    if (!selectedPrize) return;

    try {
      setFulfilling(true);

      let finalPrizeLink = prizeLink;

      // If file is uploaded, upload it first and get the link
      if (uploadFile) {
        toast.info("Uploading file...");
        finalPrizeLink = await handleFileUpload(uploadFile);
      }

      if (!finalPrizeLink) {
        toast.error("Please provide a prize link or upload a file");
        return;
      }

      // Call fulfill-manual-prize edge function
      const { error } = await supabase.functions.invoke("fulfill-manual-prize", {
        body: {
          spinId: selectedPrize.spinId,
          prizeLink: finalPrizeLink,
        },
      });

      if (error) throw error;

      toast.success("Prize fulfilled successfully!");
      setSelectedPrize(null);
      setPrizeLink("");
      setUploadFile(null);
      fetchPendingPrizes();
    } catch (error) {
      console.error("Error fulfilling prize:", error);
      toast.error("Failed to fulfill prize");
    } finally {
      setFulfilling(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Loading pending prizes...</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">
              Pending Manual Prizes
            </h2>
            {pendingPrizes.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingPrizes.length}
              </Badge>
            )}
          </div>
          <Button onClick={fetchPendingPrizes} variant="outline" size="sm">
            Refresh
          </Button>
        </div>

        {pendingPrizes.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg text-muted-foreground">
              No pending prizes to fulfill
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              All manual prizes have been completed
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingPrizes.map((prize) => (
              <Card
                key={prize.spinId}
                className="p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{prize.prizeEmoji}</span>
                      <h3 className="text-lg font-semibold text-foreground">
                        {prize.prizeName}
                      </h3>
                      <Badge variant="secondary">{prize.tier.toUpperCase()}</Badge>
                      <Badge variant="outline" className="text-xs">
                        {prize.timeElapsed}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        <strong>User:</strong> {prize.userEmail}
                      </p>
                      <p>
                        <strong>Transaction:</strong> {prize.transactionId}
                      </p>
                      <p>
                        <strong>Amount Paid:</strong> ${prize.amountPaid}
                      </p>
                      <div className="mt-3 p-3 bg-muted rounded-md">
                        <p className="font-semibold mb-1">Fulfillment Instructions:</p>
                        <p className="text-xs whitespace-pre-wrap">
                          {prize.fulfillmentInstructions}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => setSelectedPrize(prize)}
                    className="ml-4"
                  >
                    Fulfill Prize
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!selectedPrize} onOpenChange={() => setSelectedPrize(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Fulfill Prize: {selectedPrize?.prizeEmoji} {selectedPrize?.prizeName}
            </DialogTitle>
            <DialogDescription>
              Provide the prize link or upload a file for {selectedPrize?.userEmail}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="prizeLink">Prize Link (Option 1)</Label>
              <div className="flex gap-2">
                <LinkIcon className="w-5 h-5 text-muted-foreground mt-2.5" />
                <Input
                  id="prizeLink"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={prizeLink}
                  onChange={(e) => setPrizeLink(e.target.value)}
                  disabled={!!uploadFile}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Paste a Google Drive link, Dropbox link, or any shareable URL
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 border-t border-border" />
              <span className="text-sm text-muted-foreground">OR</span>
              <div className="flex-1 border-t border-border" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fileUpload">Upload File (Option 2)</Label>
              <div className="flex gap-2">
                <Upload className="w-5 h-5 text-muted-foreground mt-2.5" />
                <Input
                  id="fileUpload"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadFile(file);
                      setPrizeLink("");
                    }
                  }}
                  disabled={!!prizeLink}
                />
              </div>
              {uploadFile && (
                <p className="text-xs text-green-600">
                  ✓ File selected: {uploadFile.name}
                </p>
              )}
            </div>

            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm font-semibold mb-2">Email Preview:</p>
              <p className="text-xs text-muted-foreground">
                The user will receive an email with the subject "✨ Your{" "}
                {selectedPrize?.prizeName} is Ready!" containing a "VIEW PRIZE" button
                that links to the provided URL or uploaded file.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedPrize(null);
                setPrizeLink("");
                setUploadFile(null);
              }}
              disabled={fulfilling}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFulfillPrize}
              disabled={fulfilling || (!prizeLink && !uploadFile)}
            >
              {fulfilling && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Send Prize & Mark Complete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}