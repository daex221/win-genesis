import { useState } from "react";
import SpinWheel from "@/components/SpinWheel";
import PricingCards from "@/components/PricingCards";
import WinModal from "@/components/WinModal";

const Index = () => {
  const [showWinModal, setShowWinModal] = useState(false);
  const [wonPrize, setWonPrize] = useState<{ name: string; emoji: string } | null>(null);

  const handlePrizeWon = (prize: { name: string; emoji: string }) => {
    setWonPrize(prize);
    setShowWinModal(true);
  };

  return (
    <div className="min-h-screen bg-background aurora-bg">
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

        {/* Spinning Wheel */}
        <div className="flex justify-center mb-16">
          <SpinWheel onPrizeWon={handlePrizeWon} />
        </div>

        {/* Pricing Cards */}
        <PricingCards />
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
