import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Prize {
  id: string;
  name: string;
  emoji: string;
}

interface SpinWheelProps {
  onPrizeWon: (prize: { name: string; emoji: string }) => void;
}

const SpinWheel = ({ onPrizeWon }: SpinWheelProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [prizes, setPrizes] = useState<Prize[]>([]);

  // Fetch prizes on mount
  useState(() => {
    const fetchPrizes = async () => {
      const { data, error } = await supabase
        .from("prizes")
        .select("id, name, emoji")
        .eq("active", true)
        .limit(8);

      if (error) {
        console.error("Error fetching prizes:", error);
        return;
      }

      setPrizes(data || []);
    };

    fetchPrizes();
  });

  const spinWheel = () => {
    if (isSpinning || prizes.length === 0) return;

    setIsSpinning(true);

    // For demo spins, randomly select a prize locally
    const randomPrizeIndex = Math.floor(Math.random() * prizes.length);
    const wonPrize = prizes[randomPrizeIndex];

    // Calculate rotation to land on the selected prize
    const segmentAngle = 360 / prizes.length;
    const targetAngle = randomPrizeIndex * segmentAngle + segmentAngle / 2;
    const spins = 3 + Math.random() * 2; // 3-5 full rotations
    const finalRotation = rotation + spins * 360 + (360 - targetAngle);

    setRotation(finalRotation);

    // After animation completes (4 seconds)
    setTimeout(() => {
      setIsSpinning(false);
      onPrizeWon({ name: wonPrize.name, emoji: wonPrize.emoji });
      toast.info("This was a demo spin! Purchase a tier to win real prizes.");
    }, 4000);
  };

  const segmentAngle = 360 / Math.max(prizes.length, 8);
  const colors = [
    "hsl(var(--primary))",
    "hsl(var(--secondary))",
    "hsl(var(--accent))",
    "hsl(var(--gold))",
    "hsl(var(--cyan))",
    "hsl(271 91% 50%)",
    "hsl(217 91% 50%)",
    "hsl(330 81% 50%)",
  ];

  return (
    <div className="relative">
      {/* Wheel Container */}
      <div className="relative w-[320px] h-[320px] md:w-[500px] md:h-[500px]">
        {/* Glow Effect */}
        <div className="absolute inset-0 rounded-full glow-cyan animate-pulse-glow" />

        {/* Wheel */}
        <div
          className={`relative w-full h-full rounded-full border-4 border-transparent bg-gradient-to-r from-cyan via-accent to-primary p-1 ${
            isSpinning ? "animate-spin-wheel" : ""
          }`}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
          }}
        >
          <div className="w-full h-full rounded-full bg-card relative overflow-hidden">
            {prizes.map((prize, index) => (
              <div
                key={prize.id}
                className="absolute w-1/2 h-1/2 origin-bottom-right flex items-center justify-center"
                style={{
                  transform: `rotate(${index * segmentAngle}deg) skewY(${-90 + segmentAngle}deg)`,
                  transformOrigin: "bottom right",
                  left: "50%",
                  top: "50%",
                  backgroundColor: colors[index % colors.length],
                }}
              >
                <div
                  className="text-xl md:text-2xl font-bold text-white"
                  style={{
                    transform: `skewY(${90 - segmentAngle}deg) rotate(${segmentAngle / 2}deg)`,
                  }}
                >
                  {prize.emoji}
                </div>
              </div>
            ))}

            {/* Center Button */}
            <button
              onClick={spinWheel}
              disabled={isSpinning}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-gold to-gold/80 text-gold-foreground font-bold text-lg md:text-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 z-10 shadow-lg"
            >
              {isSpinning ? "..." : "SPIN"}
            </button>
          </div>
        </div>

        {/* Triangle Pointer */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 w-0 h-0 z-20"
          style={{
            borderLeft: "20px solid transparent",
            borderRight: "20px solid transparent",
            borderTop: "30px solid hsl(var(--gold))",
          }}
        />
      </div>
    </div>
  );
};

export default SpinWheel;
