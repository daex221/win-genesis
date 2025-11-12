import { useState, useEffect, useRef } from "react";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { playSpinStart, playSpinTicks, playWin } = useSounds();

  const colors = [
    "#1a5f7a", // Dark Teal (top)
    "#0d7377", // Teal/Cyan
    "#ffff00", // Yellow
    "#8b0000", // Dark Red
    "#00bcd4", // Cyan
    "#dc143c", // Crimson Red
    "#2d4a6b", // Dark Blue
    "#1a5f7a"  // Dark Teal
  ];

  const particleColors = ["#00d4ff", "#00ff00", "#ffff00", "#ff6600", "#ff0080", "#9900ff"];
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; drift: number }>>([]);

  useEffect(() => {
    fetchPrizes();
  }, []);

  useEffect(() => {
    if (prizes.length > 0 && canvasRef.current) {
      drawWheel();
    }
  }, [prizes]);

  // Particle system
  useEffect(() => {
    let animationFrame: number;
    let lastSpawn = 0;
    const spawnInterval = 200;

    const createParticle = () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 160 + Math.random() * 20;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const color = particleColors[Math.floor(Math.random() * particleColors.length)];
      const drift = (Math.random() - 0.5) * 40;

      return {
        id: Date.now() + Math.random(),
        x,
        y,
        color,
        drift
      };
    };

    const animate = (timestamp: number) => {
      if (timestamp - lastSpawn > spawnInterval && particles.length < 20) {
        lastSpawn = timestamp;
        setParticles(prev => [...prev, createParticle()]);
      }

      setParticles(prev => prev.filter(p => Date.now() - p.id < 3500));
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [particles.length]);

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

      // Gradient overlay
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw text
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
    if (isSpinning || !token) return;

    setIsSpinning(true);
    playSpinStart();
    playSpinTicks(4000);

    try {
      const { data, error } = await supabase.functions.invoke("spin-prize", {
        body: { token, tier },
      });

      if (error) throw error;

      const prizeIndex = prizes.findIndex((p) => p.id === data.id);
      const segmentAngle = 360 / prizes.length;
      const prizeCenterAngle = prizeIndex * segmentAngle + (segmentAngle / 2);
      const targetAngle = 270 - prizeCenterAngle;
      
      const currentNormalizedRotation = rotation % 360;
      let rotationDelta = targetAngle - currentNormalizedRotation;
      
      if (rotationDelta < 0) {
        rotationDelta += 360;
      }
      
      const extraSpins = 3 + Math.floor(Math.random() * 3);
      const finalRotation = rotation + rotationDelta + (extraSpins * 360);

      setRotation(finalRotation);

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
      <div className="w-[320px] h-[320px] md:w-[450px] md:h-[450px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-[320px] h-[320px] md:w-[450px] md:h-[450px]">
        {/* Particles */}
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full animate-particle pointer-events-none"
            style={{
              backgroundColor: particle.color,
              boxShadow: `0 0 8px ${particle.color}`,
              transform: `translate(${particle.x}px, ${particle.y}px)`,
              '--drift': `${particle.drift}px`,
            } as any}
          />
        ))}

        {/* Triangle Pointer - Cyan Neon */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 w-0 h-0 z-20 animate-neon-pulse"
          style={{
            borderLeft: "20px solid transparent",
            borderRight: "20px solid transparent",
            borderTop: "30px solid #00d4ff",
          }}
        />

        {/* Wheel wrapper with rainbow neon glow */}
        <div 
          className="w-full h-full rounded-full animate-pulse-glow"
          style={{
            boxShadow: `
              0 0 15px rgba(0, 212, 255, 0.6),
              0 0 30px rgba(0, 255, 0, 0.4),
              0 0 45px rgba(255, 0, 128, 0.4),
              0 0 60px rgba(153, 0, 255, 0.3),
              inset 0 0 15px rgba(0, 212, 255, 0.2),
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

          {/* Center Button - Yellow Neon Glow */}
          <button
            onClick={spinWheel}
            disabled={isSpinning}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 md:w-32 md:h-32 rounded-full text-black font-black text-2xl md:text-3xl hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 z-10 border-4 border-yellow-300 min-h-[44px] min-w-[44px] touch-manipulation animate-yellow-glow"
            style={{
              background: "linear-gradient(135deg, #ffff00, #ffdd00)",
            }}
          >
            {isSpinning ? "..." : "SPIN"}
          </button>
        </div>
      </div>

      <div className="text-center bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 px-8 py-4">
        <p className="text-white text-sm">
          Tier: <span className="font-bold">{tier.toUpperCase()}</span>
        </p>
      </div>
    </div>
  );
};

export default SpinWheelWithToken;