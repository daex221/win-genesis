import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSounds } from "@/hooks/useSounds";

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
  const [musicStarted, setMusicStarted] = useState(false);
  const { playSpinStart, playSpinTicks, playWin, playClick, playBackgroundMusic } = useSounds();

  useEffect(() => {
    const fetchPrizes = async () => {
      const { data, error } = await supabase.from("prize_metadata").select("id, name, emoji").eq("active", true);
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
    
    // Play spin sounds
    playSpinStart();
    playSpinTicks(4000);

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
        playWin();
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
      <div className="relative w-[320px] h-[320px] md:w-[450px] md:h-[450px]">
        {/* Triangle Pointer */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 w-0 h-0 z-20"
          style={{
            borderLeft: "15px solid transparent",
            borderRight: "15px solid transparent",
            borderTop: "25px solid hsl(185 95% 60%)",
            filter: "drop-shadow(0 0 8px hsl(185 95% 60%))",
          }}
        />

        {/* Rainbow Border - Outer wrapper */}
        <div 
          className="w-full h-full rounded-full animate-pulse-glow"
          style={{
            background: "linear-gradient(90deg, hsl(220 90% 56%), hsl(280 90% 60%), hsl(330 90% 60%), hsl(50 95% 60%), hsl(145 95% 55%), hsl(185 95% 60%))",
            backgroundSize: "300% 300%",
            animation: "rainbow-border 3s ease infinite",
            padding: "4px",
          }}
        >
          {/* Wheel */}
          <div
            className="relative rounded-full overflow-hidden bg-background"
            style={{
              width: "calc(100% - 8px)",
              height: "calc(100% - 8px)",
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
            }}
          >
            {prizes.map((prize, index) => {
              const colors = [
                "hsl(0 84% 60%)",    // red
                "hsl(200 90% 50%)",  // teal/cyan
                "hsl(280 90% 60%)",  // purple
                "hsl(50 95% 60%)",   // yellow
                "hsl(330 90% 60%)",  // pink
                "hsl(145 95% 55%)",  // green
                "hsl(25 95% 60%)",   // orange
                "hsl(220 90% 56%)",  // blue
              ];
              const segmentAngle = 360 / prizes.length;
              return (
                <div
                  key={prize.id}
                  className="absolute w-1/2 h-1/2 origin-bottom-right"
                  style={{
                    transform: `rotate(${index * segmentAngle}deg) skewY(${-90 + segmentAngle}deg)`,
                    transformOrigin: "bottom right",
                    left: "50%",
                    top: "50%",
                    backgroundColor: colors[index % colors.length],
                    clipPath: "polygon(0 0, 100% 0, 100% 100%)",
                  }}
                >
                  <div
                    className="absolute inset-0 flex items-start justify-center pt-8"
                    style={{
                      transform: `skewY(${90 - segmentAngle}deg) rotate(${segmentAngle / 2}deg)`,
                    }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="text-2xl md:text-3xl">{prize.emoji}</div>
                      <div className="text-xs md:text-sm font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight text-center px-1 max-w-[80px]">
                        {prize.name}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Center button */}
            <button
              onClick={() => {
                playClick();
                if (!musicStarted) {
                  playBackgroundMusic();
                  setMusicStarted(true);
                }
                spinWheel();
              }}
              disabled={isSpinning}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-gold to-gold/70 text-background font-black text-xl md:text-2xl hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 z-10 glow-gold shadow-2xl"
            >
              {isSpinning ? "..." : "SPIN"}
            </button>
          </div>
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