import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ProfileCompletionDialogProps {
  open: boolean;
  onClose: () => void;
}

const ProfileCompletionDialog = ({ open, onClose }: ProfileCompletionDialogProps) => {
  const [telegram, setTelegram] = useState("");
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          telegram: telegram || null,
          instagram: instagram || null,
          phone: phone || null,
        },
      });

      if (error) {
        toast.error("Failed to update profile");
        return;
      }

      toast.success("Profile updated successfully!");
      onClose();
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Add your contact information to help us deliver your prizes (all optional)
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dialog-telegram" className="text-sm">
              Telegram Username
            </Label>
            <Input
              id="dialog-telegram"
              type="text"
              placeholder="@username"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dialog-instagram" className="text-sm">
              Instagram Handle
            </Label>
            <Input
              id="dialog-instagram"
              type="text"
              placeholder="@handle"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dialog-phone" className="text-sm">
              Phone Number
            </Label>
            <Input
              id="dialog-phone"
              type="tel"
              placeholder="+1234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={loading}
            className="flex-1"
          >
            Skip for now
          </Button>
          <Button
            onClick={handleComplete}
            disabled={loading}
            className="flex-1"
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileCompletionDialog;
