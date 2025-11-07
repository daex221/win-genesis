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
    <div className="min-h-screen bg-background aurora-bg">
      <header className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm">
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <img src={supporterswinLogo} alt="Supporterswin" className="h-12 w-auto" />
          <div className="flex gap-4">
            <NavLink to="/auth">Sign In</NavLink>
            <NavLink to="/admin">Admin</NavLink>
          </div>
        </nav>
      </header>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-4">
            EVERY SPIN. EVERY DROP. EVERY WIN.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Fund your wallet and spin to win amazing prizes instantly!
          </p>
        </div>

        {user ? (
          <>
            {/* Wallet Balance */}
            <div className="max-w-md mx-auto mb-8">
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
            <div className="flex justify-center mb-16">
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
            <div className="flex justify-center mb-8">
              <SpinWheel onPrizeWon={handlePrizeWon} />
            </div>

            {/* Sign in prompt */}
            <div className="text-center mb-16">
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
