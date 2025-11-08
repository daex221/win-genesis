import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSounds } from "@/hooks/useSounds";

interface Prize {
  id: string;
  name: string;
  emoji: string;
}

interface SpinWheelWithTokenProps {
  token: string;
  tier: string;
  onPrizeWon: (prize: any) => void;
}

const SpinWheelWithToken = ({ token, tier, onPrizeWon }: SpinWheelWithTokenProps) => {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [musicStarted, setMusicStarted] = useState(false);
  const { playSpinStart, playSpinTicks, playWin, playClick, playBackgroundMusic } = useSounds();

  useEffect(() => {
    fetchPrizes();
  }, []);

  const fetchPrizes = async () => {
    try {
      const { data, error } = await supabase
        .from("prize_metadata")
        .select("id, name, emoji")
        .eq("active", true);

      if (error) throw error;
      if (data) setPrizes(data);
    } catch (error) {
      console.error("Error fetching prizes:", error);
      toast.error("Failed to load prizes");
    }
  };

  const spinWheel = async () => {
    if (isSpinning || !token) return;

    setIsSpinning(true);
    
    // Play spin sounds
    playSpinStart();
    playSpinTicks(4000);

    try {
      // Call the spin-prize edge function with the real token
      const { data, error } = await supabase.functions.invoke("spin-prize", {
        body: { token, tier },
      });

      if (error) throw error;

      // Calculate rotation based on won prize
      const prizeIndex = prizes.findIndex((p) => p.id === data.id);
      const segmentAngle = 360 / prizes.length;
      const targetRotation = 360 * 5 + (360 - prizeIndex * segmentAngle);

      setRotation(targetRotation);

      // Wait for animation to complete
      setTimeout(() => {
        setIsSpinning(false);
        playWin();
        onPrizeWon(data);
      }, 4000);
    } catch (error: any) {
      console.error("Error spinning wheel:", error);
      toast.error(error.message || "Failed to spin wheel");
      setIsSpinning(false);
    }
  };

  if (prizes.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Loading prizes...</p>
      </div>
    );
  }

  const segmentAngle = 360 / prizes.length;
  const colors = [
    "from-red-500 to-red-600",
    "from-blue-500 to-blue-600",
    "from-green-500 to-green-600",
    "from-yellow-500 to-yellow-600",
    "from-purple-500 to-purple-600",
    "from-pink-500 to-pink-600",
  ];

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative w-full aspect-square mb-8">
        <div className="absolute inset-0 rounded-full glow-primary animate-pulse"></div>

        <div
          className="relative w-full h-full rounded-full shadow-2xl transition-transform duration-[4000ms] ease-out"
          style={{
            transform: `rotate(${rotation}deg)`,
            background: "conic-gradient(from 0deg, #8B5CF6, #EC4899, #8B5CF6)",
          }}
        >
          {prizes.map((prize, index) => {
            const angle = index * segmentAngle;
            const gradientClass = colors[index % colors.length];

            return (
              <div
                key={prize.id}
                className={`absolute inset-0 flex items-start justify-center`}
                style={{
                  transform: `rotate(${angle}deg)`,
                  clipPath: `polygon(50% 50%, 50% 0%, ${
                    50 + 50 * Math.sin((segmentAngle * Math.PI) / 180)
                  }% ${50 - 50 * Math.cos((segmentAngle * Math.PI) / 180)}%)`,
                }}
              >
                <div
                  className={`w-full h-full bg-gradient-to-br ${gradientClass} flex items-start justify-center pt-8`}
                >
                  <div
                    className="flex flex-col items-center gap-1"
                    style={{
                      transform: `rotate(${segmentAngle / 2}deg)`,
                    }}
                  >
                    <div className="text-3xl">{prize.emoji}</div>
                    <div className="text-xs font-bold text-white/90 leading-tight text-center">
                      {prize.name}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

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
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-gold to-gold/80 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed text-gold-foreground font-bold text-2xl px-12 py-6 rounded-full shadow-lg transition-transform z-10"
          >
            {isSpinning ? "SPINNING..." : "SPIN!"}
          </button>
        </div>

        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-primary z-20"></div>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Tier: <span className="font-bold text-foreground">{tier.toUpperCase()}</span>
        </p>
      </div>
    </div>
  );
};

export default SpinWheelWithToken;
