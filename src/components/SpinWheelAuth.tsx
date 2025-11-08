import { useState, useEffect, useRef } from "react";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { playSpinStart, playSpinTicks, playWin, playClick, playBackgroundMusic } = useSounds();

  const colors = [
    "#ec4899", "#3b82f6", "#8b5cf6", "#06b6d4",
    "#10b981", "#f59e0b", "#ef4444", "#fbbf24"
  ];

  useEffect(() => {
    const fetchPrizes = async () => {
      const { data, error } = await supabase.from("prize_metadata").select("id, name, emoji").eq("active", true).order("id");
      if (error) {
        console.error("Error fetching prizes:", error);
        return;
      }
      setPrizes(data || []);
    };
    fetchPrizes();
  }, []);

  useEffect(() => {
    if (prizes.length > 0 && canvasRef.current) {
      drawWheel();
    }
  }, [prizes]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 10;
    const sliceAngle = (2 * Math.PI) / prizes.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    prizes.forEach((prize, index) => {
      const startAngle = index * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();

      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = "center";
      
      ctx.font = "32px Arial";
      ctx.fillText(prize.emoji, radius / 1.7, -10);
      
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px Arial";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 4;
      ctx.fillText(prize.name, radius / 1.7, 15);
      
      ctx.restore();
    });
  };

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
      const finalRotation = rotation + spins * 360 + (270 - targetAngle);

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

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-[320px] h-[320px] md:w-[450px] md:h-[450px]">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 w-0 h-0 z-20"
          style={{
            borderLeft: "15px solid transparent",
            borderRight: "15px solid transparent",
            borderTop: "25px solid #fbbf24",
            filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))",
          }}
        />

        <div 
          className="w-full h-full rounded-full"
          style={{
            boxShadow: `
              0 0 0 12px rgba(168, 85, 247, 0.3),
              0 0 0 24px rgba(236, 72, 153, 0.2),
              0 20px 60px rgba(0, 0, 0, 0.5)
            `,
          }}
        >
          <canvas
            ref={canvasRef}
            width={450}
            height={450}
            className="w-full h-full rounded-full"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
            }}
          />

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
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-background font-black text-xl md:text-2xl hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 z-10 shadow-2xl border-4 border-background"
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