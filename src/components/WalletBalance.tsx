import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wallet, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface WalletBalanceProps {
  onBalanceUpdate?: (balance: number) => void;
}

const WalletBalance = ({ onBalanceUpdate }: WalletBalanceProps) => {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [addAmount, setAddAmount] = useState("25");
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: wallet, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      const currentBalance = wallet ? Number(wallet.balance) : 0;
      setBalance(currentBalance);
      onBalanceUpdate?.(currentBalance);
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  useEffect(() => {
    fetchBalance();

    // Set up realtime subscription for balance changes
    const channel = supabase
      .channel("wallet-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallets",
        },
        () => {
          fetchBalance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddFunds = async () => {
    try {
      setLoading(true);
      const amount = parseFloat(addAmount);
      
      if (amount < 10) {
        toast.error("Minimum amount is $10");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to add funds");
        return;
      }

      toast.loading("Creating checkout session...");

      const { data, error } = await supabase.functions.invoke("add-wallet-funds", {
        body: { amount },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Checkout opened in new tab!");
        setDialogOpen(false);
      }
    } catch (error) {
      console.error("Add funds error:", error);
      toast.error("Failed to create checkout session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card border-border p-6 glow-green">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-full">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Wallet Balance</p>
            <p className="text-2xl font-bold text-foreground">${balance.toFixed(2)}</p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-secondary hover:scale-105 transition-transform">
              <Plus className="w-4 h-4 mr-2" />
              Add Funds
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Add Funds to Wallet</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Choose an amount to add to your wallet. Minimum $10.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {["15", "30", "50", "100"].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => setAddAmount(amount)}
                    className={`${
                      addAmount === amount ? "border-primary bg-primary/10" : ""
                    }`}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Custom Amount</label>
                <Input
                  type="number"
                  min="10"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="bg-input border-border text-foreground"
                />
              </div>
              <Button
                onClick={handleAddFunds}
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:scale-105 transition-transform"
              >
                {loading ? "Processing..." : `Add $${addAmount} to Wallet`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
};

export default WalletBalance;