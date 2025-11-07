import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import SpinWheel from "@/components/SpinWheel";
import WinModal from "@/components/WinModal";
import { NavLink } from "@/components/NavLink";
import WalletBalance from "@/components/WalletBalance";
import SpinWheelAuth from "@/components/SpinWheelAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import supporterswinLogo from "@/assets/supporterswin-logo.jpg";
import { toast } from "sonner";

const Index = () => {
  const [searchParams] = useSearchParams();
  const [showWinModal, setShowWinModal] = useState(false);
  const [wonPrize, setWonPrize] = useState<{ name: string; emoji: string } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [selectedTier, setSelectedTier] = useState<"basic" | "gold" | "vip">("basic");
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const handlePrizeWon = (prize: { name: string; emoji: string }) => {
    setWonPrize(prize);
    setShowWinModal(true);
  };

  const handleSignIn = () => {
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with profile */}
      <header className="relative z-50">
        <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
          <img src={supporterswinLogo} alt="Supporterswin" className="h-10 w-auto" />
          {user ? (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-cyan font-semibold">🎉 1,238 spins today</p>
                <p className="text-xs text-muted-foreground">$8,420 in rewards given</p>
              </div>
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-cyan glow-cyan">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" alt="Profile" className="w-full h-full" />
              </div>
            </div>
          ) : (
            <div className="flex gap-4">
              <NavLink to="/auth">Sign In</NavLink>
              <NavLink to="/admin">Admin</NavLink>
            </div>
          )}
        </nav>
      </header>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* TAP TO SPIN & WIN Header */}
        <div className="flex justify-center mb-8">
          <div className="neon-cyan-border rounded-full px-16 py-6 bg-background">
            <h1 className="text-4xl md:text-5xl font-black text-cyan tracking-wider">
              TAP TO SPIN & WIN
            </h1>
          </div>
        </div>

        {user ? (
          <>
            {/* Wallet Balance */}
            <div className="max-w-md mx-auto mb-6">
              <WalletBalance onBalanceUpdate={setBalance} />
            </div>

            {/* Tier Selection */}
            <div className="flex justify-center gap-4 mb-8">
              {(["basic", "gold", "vip"] as const).map((tier) => (
                <Button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  variant={selectedTier === tier ? "default" : "outline"}
                  className={`${
                    selectedTier === tier
                      ? "bg-gradient-to-r from-primary to-secondary"
                      : ""
                  }`}
                >
                  {tier.toUpperCase()}
                </Button>
              ))}
            </div>

            {/* Authenticated Spinning Wheel */}
            <div className="flex justify-center mb-12">
              <SpinWheelAuth 
                tier={selectedTier}
                balance={balance}
                onBalanceChange={() => {}}
                onPrizeWon={handlePrizeWon} 
              />
            </div>
          </>
        ) : (
          <>
            {/* Demo Spinning Wheel */}
            <div className="flex justify-center mb-12">
              <SpinWheel onPrizeWon={handlePrizeWon} />
            </div>

            {/* Sign in prompt */}
            <div className="text-center mb-12">
              <p className="text-muted-foreground mb-4">
                Sign in to fund your wallet and spin for real prizes!
              </p>
              <Button
                onClick={handleSignIn}
                className="bg-gradient-to-r from-primary to-secondary hover:scale-105 transition-transform text-lg px-8 py-6"
              >
                Sign In to Play
              </Button>
            </div>
          </>
        )}

        {/* Merch Section */}
        <div className="text-center py-16 border-t border-border/30">
          <h2 className="text-5xl md:text-6xl font-black text-cyan mb-4">
            GET EXCLUSIVE MERCH!
          </h2>
          <p className="text-lg md:text-xl text-cyan/80 max-w-3xl mx-auto mb-12">
            Shop for limited edition merchandise available only to our supporters.
          </p>
          
          <div className="flex justify-center items-center gap-8 mb-8">
            <div className="text-center">
              <img src={supporterswinLogo} alt="Supporterswin" className="h-24 w-auto mx-auto mb-2" />
              <p className="text-primary font-bold text-sm">SUPPORTERS<br/>WIN</p>
            </div>
            
            <div className="w-px h-32 bg-gradient-to-b from-transparent via-cyan to-transparent" />
            
            <div className="text-center">
              <div className="w-24 h-24 rounded-full border-4 border-cyan glow-cyan flex items-center justify-center mx-auto mb-2">
                <span className="text-4xl text-cyan">$</span>
              </div>
              <p className="text-cyan font-bold text-sm">Spin to Unlock<br/>25% Off</p>
            </div>
          </div>
        </div>
      </div>

      {/* Win Modal */}
      {wonPrize && (
        <WinModal
          isOpen={showWinModal}
          onClose={() => setShowWinModal(false)}
          prize={wonPrize}
        />
      )}
    </div>
  );
};

export default Index;
