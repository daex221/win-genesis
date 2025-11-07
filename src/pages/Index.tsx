import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import SpinWheel from "@/components/SpinWheel";
import SpinWheelWithToken from "@/components/SpinWheelWithToken";
import PricingCards from "@/components/PricingCards";
import WinModal from "@/components/WinModal";
import { NavLink } from "@/components/NavLink";

const Index = () => {
  const [searchParams] = useSearchParams();
  const [showWinModal, setShowWinModal] = useState(false);
  const [wonPrize, setWonPrize] = useState<{ name: string; emoji: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tier, setTier] = useState<string | null>(null);

  useEffect(() => {
    const urlToken = searchParams.get("token");
    const urlTier = searchParams.get("tier");
    
    if (urlToken && urlTier) {
      setToken(urlToken);
      setTier(urlTier);
    }
  }, [searchParams]);

  const handlePrizeWon = (prize: { name: string; emoji: string }) => {
    setWonPrize(prize);
    setShowWinModal(true);
  };

  return (
    <div className="min-h-screen bg-background aurora-bg">
      <header className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm">
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-gold bg-clip-text text-transparent">
            PrizeSpin
          </h1>
          <div className="flex gap-4">
            <NavLink to="/auth">Sign In</NavLink>
            <NavLink to="/admin">Admin</NavLink>
          </div>
        </nav>
      </header>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-4">
            Spin to Win Exclusive Rewards
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Every spin wins. Choose your tier and unlock instant digital prizes.
          </p>
        </div>

        {token && tier ? (
          /* Spinning Wheel with Token */
          <div className="flex justify-center mb-16">
            <SpinWheelWithToken 
              token={token} 
              tier={tier} 
              onPrizeWon={handlePrizeWon} 
            />
          </div>
        ) : (
          <>
            {/* Demo Spinning Wheel */}
            <div className="flex justify-center mb-16">
              <SpinWheel onPrizeWon={handlePrizeWon} />
            </div>

            {/* Pricing Cards */}
            <PricingCards />
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
