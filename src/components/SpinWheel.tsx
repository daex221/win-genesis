import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSounds } from "@/hooks/useSounds";
import { MessageCircle, Sparkles, Camera, Crown, Gift, Video, Zap } from "lucide-react";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { playSpinStart, playSpinTicks, playWin, playClick } = useSounds();

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

  // Fetch prizes on mount
  useEffect(() => {
    const fetchPrizes = async () => {
      const { data, error } = await supabase
        .from("prize_metadata")
        .select("id, name, emoji")
        .eq("active", true)
        .order("id")
        .limit(8);

      if (error) {
        console.error("Error fetching prizes:", error);
        return;
      }

      setPrizes(data || []);
    };

    fetchPrizes();
  }, []);

  // Particle system
  useEffect(() => {
    let animationFrame: number;
    let lastSpawn = 0;
    const spawnInterval = 200; // ms between spawns

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

      // Clean up old particles
      setParticles(prev => prev.filter(p => Date.now() - p.id < 3500));

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [particles.length]);

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

      // Draw subtle gradient overlay for depth
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw border
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 3;
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
    
    // Canvas draws first segment starting at 0° (right/3 o'clock)
    // but our pointer is at top (270° in canvas terms)
    const prizeCenterAngle = randomPrizeIndex * segmentAngle + (segmentAngle / 2);
    
    // To align prize with pointer at top (270°)
    const targetAngle = 270 - prizeCenterAngle;
    
    // Normalize current rotation to 0-360 range
    const currentNormalizedRotation = rotation % 360;
    
    // Calculate shortest path to target
    let rotationDelta = targetAngle - currentNormalizedRotation;
    
    // Make it rotate in the positive direction
    if (rotationDelta < 0) {
      rotationDelta += 360;
    }
    
    // Add extra full rotations for effect (3-5 full spins)
    const extraSpins = 3 + Math.floor(Math.random() * 3);
    const finalRotation = rotation + rotationDelta + (extraSpins * 360);

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
      {prizes.length === 0 ? (
        <div className="w-[320px] h-[320px] md:w-[450px] md:h-[450px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        </div>
      ) : (
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

          {/* Center Button - Yellow Neon Glow */}
          <button
            onClick={() => {
              playClick();
              spinWheel();
            }}
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
      )}
    </div>
  );
};

export default SpinWheel;
