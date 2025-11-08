import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSounds } from "@/hooks/useSounds";

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
  const [musicStarted, setMusicStarted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { playSpinStart, playSpinTicks, playWin, playClick, playBackgroundMusic } = useSounds();

  const colors = [
    "#ec4899", "#3b82f6", "#8b5cf6", "#06b6d4",
    "#10b981", "#f59e0b", "#ef4444", "#fbbf24"
  ];

  // Fetch prizes on mount
  useEffect(() => {
    const fetchPrizes = async () => {
      const { data, error } = await supabase
        .from("prize_metadata")
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
  }, []);

  // Draw wheel when prizes change
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

      // Draw slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();

      // Draw border
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw emoji and text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = "center";
      
      // Draw emoji
      ctx.font = "32px Arial";
      ctx.fillText(prize.emoji, radius / 1.7, -10);
      
      // Draw prize name
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px Arial";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 4;
      ctx.fillText(prize.name, radius / 1.7, 15);
      
      ctx.restore();
    });
  };

  const spinWheel = () => {
    if (isSpinning || prizes.length === 0) return;

    setIsSpinning(true);
    
    // Play start sound
    playSpinStart();
    playSpinTicks(4000);

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
      playWin();
      onPrizeWon({ name: wonPrize.name, emoji: wonPrize.emoji });
      toast.info("This was a demo spin! Purchase a tier to win real prizes.");
    }, 4000);
  };

  return (
    <div className="relative">
      <div className="relative w-[320px] h-[320px] md:w-[450px] md:h-[450px]">
        {/* Triangle Pointer */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 w-0 h-0 z-20"
          style={{
            borderLeft: "15px solid transparent",
            borderRight: "15px solid transparent",
            borderTop: "25px solid #fbbf24",
            filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))",
          }}
        />

        {/* Wheel wrapper with glow */}
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
          {/* Canvas wheel */}
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

          {/* Center Button */}
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
    </div>
  );
};

export default SpinWheel;
