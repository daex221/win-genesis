import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSounds } from "@/hooks/useSounds";
import confetti from "canvas-confetti";
import { MessageCircle, Sparkles, Camera, Crown, Gift, Video, Zap } from "lucide-react";

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
    "#1a4d7a", // Deep Blue
    "#00d4ff", // Cyan
    "#00ff00", // Bright Green
    "#ffff00", // Yellow
    "#ff6600", // Orange
    "#ff0080", // Red/Magenta
    "#9900ff", // Purple
    "#001a4d"  // Dark Blue
  ];

  const particleColors = ["#00d4ff", "#00ff00", "#ffff00", "#ff6600", "#ff0080", "#9900ff"];
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; drift: number }>>([]);

  const prizeIcons: { [key: string]: any } = {
    "Priority DM Access": MessageCircle,
    "Custom Shout Out": Sparkles,
    "Secret Photo Drop": Camera,
    "Exclusive Access": Crown,
    "Merch Discount": Gift,
    "Mystery Video Clip": Video,
    "Voice Note": MessageCircle,
    "Bonus Spin": Zap,
  };

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

  const sendPrizeWebhook = async (prizeData: { name: string; emoji: string }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload = {
        userId: user?.id || 'unknown',
        email: user?.email || '',
        phone: user?.user_metadata?.phone || '',
        telegram: user?.user_metadata?.telegram || '',
        instagram: user?.user_metadata?.instagram || '',
        prizeWon: prizeData.name,
        tier: tier,
        spinCost: SPIN_COSTS[tier],
        transactionId: `spin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      };

      const auth = btoa('daevo:12345678');
      
      const response = await fetch('https://daex2212.app.n8n.cloud/webhook/prize-delivery', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success('🎁 Prize is being delivered!');
      } else {
        console.error('Webhook response not OK:', response.status);
      }
    } catch (error) {
      console.error('Webhook error:', error);
      // Don't show error to user, prize still won
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

      // Draw subtle gradient overlay
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = "center";
      
      // Draw emoji (keeping for fallback)
      ctx.font = "28px Arial";
      ctx.fillText(prize.emoji, radius / 1.7, -5);
      
      // Draw prize name
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px Arial";
      ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
      ctx.shadowBlur = 6;
      ctx.fillText(prize.name, radius / 1.7, 18);
      
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

    // Start spinning immediately for better UX
    setIsSpinning(true);
    playSpinStart();
    playSpinTicks(4000);

    try {
      console.log("[SPIN] Starting spin for tier:", tier, "balance:", balance);
      
      // Call backend while wheel is spinning
      const spinPromise = supabase.functions.invoke("spin-with-wallet", {
        body: { tier },
      });

      // Start a temporary rotation immediately
      const tempRotation = rotation + 1080 + Math.random() * 360;
      setRotation(tempRotation);

      const { data, error } = await spinPromise;

      console.log("[SPIN] Response:", { data, error });

      if (error) {
        console.error("[SPIN] Edge function error:", error);
        throw new Error(`Spin failed: ${error.message}`);
      }

      if (data?.error) {
        console.error("[SPIN] Data error:", data.error);
        if (data.error === "Insufficient balance") {
          throw new Error(`Insufficient balance! Need $${data.required}, have $${data.balance}`);
        }
        throw new Error(data.error);
      }

      if (!data?.prize) {
        console.error("[SPIN] No prize in response");
        throw new Error("Invalid response from server");
      }

      const wonPrize = data.prize;
      const prizeIndex = prizes.findIndex((p) => p.id === wonPrize.id);
      
      // Calculate final rotation to land on the prize
      const segmentAngle = 360 / prizes.length;
      const prizeCenterAngle = prizeIndex * segmentAngle + (segmentAngle / 2);
      const targetAngle = 270 - prizeCenterAngle;
      
      // Normalize and calculate final rotation
      const currentNormalizedRotation = tempRotation % 360;
      let rotationDelta = targetAngle - currentNormalizedRotation;
      
      if (rotationDelta < 0) {
        rotationDelta += 360;
      }
      
      const extraSpins = 2;
      const finalRotation = tempRotation + rotationDelta + (extraSpins * 360);

      setRotation(finalRotation);

      setTimeout(async () => {
        setIsSpinning(false);
        playWin();
        
        // Send webhook notification (non-blocking)
        sendPrizeWebhook({ name: wonPrize.name, emoji: wonPrize.emoji });
        
        // Trigger confetti
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#00D9FF', '#FFD700', '#FF006E', '#7B2CBF']
        });
        
        onPrizeWon({ name: wonPrize.name, emoji: wonPrize.emoji });
        onBalanceChange();
        toast.success(`Won: ${wonPrize.emoji} ${wonPrize.name}`);
      }, 4000);
    } catch (error) {
      console.error("[SPIN] Error spinning:", error);
      
      let errorMessage = "Failed to spin. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        duration: 5000,
      });
      setIsSpinning(false);
      onBalanceChange();
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
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

        {/* Wheel with neon glow */}
        <div 
          className="w-full h-full rounded-full animate-pulse-glow"
          style={{
            boxShadow: `
              0 0 10px rgba(0, 212, 255, 0.5),
              0 0 20px rgba(0, 212, 255, 0.3),
              0 0 30px rgba(0, 212, 255, 0.2),
              inset 0 0 10px rgba(0, 212, 255, 0.1),
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

          {/* Center Spin Button - Yellow Neon */}
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

      {/* Balance info */}
      <div className="text-center bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 px-8 py-4">
        <p className="text-white text-lg font-semibold mb-1">
          {tier.toUpperCase()} Tier - ${SPIN_COSTS[tier]} per spin
        </p>
        <p className="text-5xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
          ${balance.toFixed(2)}
        </p>
        <p className="text-white/60 text-sm mt-1">Your Balance</p>
      </div>
    </div>
  );
};

export default SpinWheelAuth;