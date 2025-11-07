import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Prize {
  id: string;
  name: string;
  emoji: string;
}

interface SpinWheelAuthProps {
  tier: "basic" | "gold" | "vip";
  onPrizeWon: (prize: { name: string; emoji: string }) => void;
  balance: number;
  onBalanceChange: () => void;
}

const SPIN_COSTS = {
  basic: 15,
  gold: 30,
  vip: 50,
};

const SpinWheelAuth = ({ tier, onPrizeWon, balance, onBalanceChange }: SpinWheelAuthProps) => {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    const fetchPrizes = async () => {
      const { data, error } = await supabase.from("prizes").select("id, name, emoji").eq("active", true);
      if (error) {
        console.error("Error fetching prizes:", error);
        return;
      }
      setPrizes(data || []);
    };
    fetchPrizes();
  }, []);

  const spinWheel = async () => {
    if (isSpinning || prizes.length === 0) return;

    const cost = SPIN_COSTS[tier];
    if (balance < cost) {
      toast.error(`Insufficient balance! Need $${cost}, have $${balance.toFixed(2)}`);
      return;
    }

    setIsSpinning(true);
    toast.loading("Spinning...");

    try {
      const { data, error } = await supabase.functions.invoke("spin-with-wallet", {
        body: { tier },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      const wonPrize = data.prize;
      const prizeIndex = prizes.findIndex((p) => p.id === wonPrize.id);
      
      // Calculate rotation to land on the prize
      const segmentAngle = 360 / prizes.length;
      const targetAngle = prizeIndex * segmentAngle + segmentAngle / 2;
      const spins = 3 + Math.random() * 2;
      const finalRotation = rotation + spins * 360 + (360 - targetAngle);

      setRotation(finalRotation);

      setTimeout(() => {
        setIsSpinning(false);
        toast.dismiss();
        onPrizeWon({ name: wonPrize.name, emoji: wonPrize.emoji });
        onBalanceChange();
        toast.success(`Won: ${wonPrize.emoji} ${wonPrize.name}`);
      }, 4000);
    } catch (error) {
      console.error("Error spinning:", error);
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : "Failed to spin");
      setIsSpinning(false);
    }
  };

  const segmentAngle = 360 / Math.max(prizes.length, 8);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-[400px] h-[400px]">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-gold"></div>
        </div>

        {/* Wheel */}
        <div
          className="relative w-full h-full rounded-full overflow-hidden border-8 border-gradient-to-r from-primary via-secondary to-accent glow-cyan"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
          }}
        >
          {prizes.map((prize, index) => {
            const colors = ["#FF6B9D", "#C084FC", "#60A5FA", "#34D399", "#FBBF24", "#F87171"];
            return (
              <div
                key={prize.id}
                className="absolute top-1/2 left-1/2 origin-bottom-left"
                style={{
                  transform: `rotate(${index * segmentAngle}deg)`,
                  width: "50%",
                  height: "50%",
                }}
              >
                <div
                  className="h-full flex items-center justify-center"
                  style={{
                    clipPath: `polygon(0 0, 100% 0, 100% 100%)`,
                    background: colors[index % colors.length],
                  }}
                >
                  <span className="absolute top-1/4 right-1/4 text-2xl font-bold text-white transform rotate-45">
                    {prize.emoji}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Center button */}
          <button
            onClick={spinWheel}
            disabled={isSpinning}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-r from-gold to-gold/80 rounded-full flex items-center justify-center text-gold-foreground font-bold text-lg shadow-lg hover:scale-110 transition-transform disabled:opacity-50 z-10"
          >
            {isSpinning ? "..." : "SPIN"}
          </button>
        </div>
      </div>

      <div className="text-center">
        <p className="text-foreground text-lg font-semibold">
          {tier.toUpperCase()} Tier - ${SPIN_COSTS[tier]} per spin
        </p>
        <p className="text-muted-foreground">Your Balance: ${balance.toFixed(2)}</p>
      </div>
    </div>
  );
};

export default SpinWheelAuth;