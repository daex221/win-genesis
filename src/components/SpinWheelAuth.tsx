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

// Spin costs will be fetched from API - default fallback values
const DEFAULT_SPIN_COSTS = {
  basic: 15,
  gold: 30,
  vip: 50,
};

const SpinWheelAuth = ({ tier, onPrizeWon, balance, onBalanceChange }: SpinWheelAuthProps) => {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [musicStarted, setMusicStarted] = useState(false);
  const [spinCost, setSpinCost] = useState(DEFAULT_SPIN_COSTS[tier]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { playSpinStart, playSpinTicks, playWin, playClick, playBackgroundMusic } = useSounds();

  const colors = [
    "#ec4899", "#3b82f6", "#8b5cf6", "#06b6d4",
    "#10b981", "#f59e0b", "#ef4444", "#fbbf24"
  ];

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

  // Fetch pricing
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-pricing");
        if (error) throw error;

        const pricing = data.pricing;
        if (pricing && pricing[tier]) {
          setSpinCost(pricing[tier].price);
        }
      } catch (error) {
        console.error("Error fetching pricing:", error);
        // Use default fallback
        setSpinCost(DEFAULT_SPIN_COSTS[tier]);
      }
    };

    fetchPricing();
  }, [tier]);

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

  const sendPrizeWebhook = async (prizeData: { name: string; emoji: string; delivery_content?: string }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        userId: user?.id || 'unknown',
        email: user?.email || '',
        phone: user?.user_metadata?.phone || '',
        telegram: user?.user_metadata?.telegram || '',
        instagram: user?.user_metadata?.instagram || '',
        prizeWon: prizeData.name,
        prizeEmoji: prizeData.emoji,
        deliveryContent: prizeData.delivery_content || '',  // ✅ Now includes video link!
        tier: tier,
        spinCost: spinCost,
        transactionId: `spin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      };

      // Using environment variables for webhook auth (still exposed in frontend - consider moving to backend)
      const username = import.meta.env.VITE_WEBHOOK_USERNAME || '';
      const password = import.meta.env.VITE_WEBHOOK_PASSWORD || '';
      const auth = btoa(`${username}:${password}`);
      
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

      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 2;
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

    const cost = spinCost;
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
      console.log("[SPIN] Starting spin for tier:", tier, "balance:", balance);
      
      const { data, error } = await supabase.functions.invoke("spin-with-wallet", {
        body: { tier },
      });

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
      
      console.log("=== SPIN DEBUG ===");
      console.log("All prizes:", prizes.map((p, i) => `${i}: ${p.name}`));
      console.log("Won prize:", wonPrize.name, "ID:", wonPrize.id);
      console.log("Prize index in array:", prizeIndex);
      
      // Calculate rotation to land on the prize
      const segmentAngle = 360 / prizes.length;
      
      // Canvas draws first segment starting at 0° (right/3 o'clock)
      // but our pointer is at top (270° in canvas terms)
      const prizeCenterAngle = prizeIndex * segmentAngle + (segmentAngle / 2);
      
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
      
      console.log("Segment angle:", segmentAngle);
      console.log("Prize center angle:", prizeCenterAngle);
      console.log("Rotation delta:", rotationDelta);
      console.log("Final rotation:", finalRotation);

      setRotation(finalRotation);

      setTimeout(async () => {
        setIsSpinning(false);
        toast.dismiss();
        playWin();
        
        // Send webhook notification with delivery content
        await sendPrizeWebhook({
          name: wonPrize.name,
          emoji: wonPrize.emoji,
          delivery_content: wonPrize.delivery_content  // ✅ Pass video link to webhook
        });

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
      toast.dismiss();
      
      let errorMessage = "Failed to spin. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        duration: 5000,
      });
      setIsSpinning(false);
      onBalanceChange(); // Refresh balance in case it changed
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-[320px] h-[320px] md:w-[450px] md:h-[450px]">
        {/* Triangle Pointer */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 w-0 h-0 z-20"
          style={{
            borderLeft: "20px solid transparent",
            borderRight: "20px solid transparent",
            borderTop: "30px solid #FFD700",
            filter: "drop-shadow(0 4px 10px rgba(255, 215, 0, 0.8))",
          }}
        />

        {/* Wheel with glow */}
        <div 
          className="w-full h-full rounded-full animate-pulse-glow"
          style={{
            boxShadow: `
              0 0 40px rgba(0, 217, 255, 0.4),
              0 0 80px rgba(0, 217, 255, 0.2),
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

          {/* Center Spin Button */}
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
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-white font-black text-2xl md:text-3xl hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 z-10 border-4 border-white min-h-[44px] min-w-[44px] touch-manipulation"
            style={{
              boxShadow: "0 0 30px rgba(255, 215, 0, 0.6), 0 10px 40px rgba(0, 0, 0, 0.4)"
            }}
          >
            {isSpinning ? "..." : "SPIN"}
          </button>
        </div>
      </div>

      {/* Balance info */}
      <div className="text-center bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 px-8 py-4">
        <p className="text-white text-lg font-semibold mb-1">
          {tier.toUpperCase()} Tier - ${spinCost} per spin
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