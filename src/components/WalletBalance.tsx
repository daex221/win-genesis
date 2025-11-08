import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Gem, Plus } from "lucide-react";
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
    <Card className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 backdrop-blur-lg border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 rounded-xl">
            <Gem className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-white/60">Wallet Balance</p>
            <p className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">${balance.toFixed(2)}</p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] min-h-[44px]">
              <Plus className="w-4 h-4 mr-2" />
              Add Funds
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0A0E27] border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white text-xl font-bold">Add Funds to Wallet</DialogTitle>
              <DialogDescription className="text-white/60">
                Choose an amount to add to your wallet. Minimum $10.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {["15", "30", "50", "100"].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => setAddAmount(amount)}
                    className={`min-h-[44px] ${
                      addAmount === amount
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-400 text-white"
                        : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    }`}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
              <div>
                <label className="text-sm text-white/80 mb-2 block">Custom Amount</label>
                <Input
                  type="number"
                  min="10"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              <Button
                onClick={handleAddFunds}
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold shadow-[0_0_20px_rgba(0,217,255,0.4)] min-h-[44px]"
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