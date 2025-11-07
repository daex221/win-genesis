import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const PricingCards = () => {
  const handleTierClick = (tier: string, price: number) => {
    toast.info("Stripe integration pending. Please enable Stripe to process payments.");
  };

  const tiers = [
    {
      name: "BASIC",
      price: 15,
      badge: null,
      glowColor: "glow-blue",
      features: ["Instant delivery", "Email reward", "Fun surprises"],
      buttonGradient: "from-green-500 to-green-600",
    },
    {
      name: "GOLD",
      price: 30,
      badge: "⭐ POPULAR",
      glowColor: "glow-gold",
      features: ["Better prizes", "Bonus spin chance", "Priority delivery"],
      buttonGradient: "from-gold to-gold/80",
    },
    {
      name: "VIP",
      price: 50,
      badge: "Premium Tier",
      glowColor: "glow-purple",
      features: ["Exclusive prizes", "Guaranteed high-value", "VIP perks"],
      buttonGradient: "from-primary to-primary/80",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
      {tiers.map((tier) => (
        <Card
          key={tier.name}
          className={`relative bg-card border-border p-8 ${tier.glowColor} hover:scale-105 transition-transform`}
        >
          {tier.badge && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gold to-gold/80 text-gold-foreground px-6 py-2 rounded-full text-sm font-bold">
              {tier.badge}
            </div>
          )}

          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-foreground mb-2">{tier.name}</h3>
            <div className="text-4xl font-bold text-foreground">
              ${tier.price}
            </div>
            <p className="text-muted-foreground mt-2">
              {tier.name === "BASIC" && "Standard Prizes"}
              {tier.name === "GOLD" && "Better Chances"}
              {tier.name === "VIP" && "Best Rewards"}
            </p>
          </div>

          <ul className="space-y-3 mb-8">
            {tier.features.map((feature) => (
              <li key={feature} className="flex items-center text-foreground">
                <span className="mr-2">✓</span>
                {feature}
              </li>
            ))}
          </ul>

          <Button
            onClick={() => handleTierClick(tier.name.toLowerCase(), tier.price)}
            className={`w-full bg-gradient-to-r ${tier.buttonGradient} hover:scale-105 transition-transform font-bold text-lg py-6 rounded-full`}
          >
            SPIN NOW →
          </Button>
        </Card>
      ))}
    </div>
  );
};

export default PricingCards;
