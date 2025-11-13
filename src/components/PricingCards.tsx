import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface Tier {
  name: string;
  price: number;
  badge: string | null;
  glowColor: string;
  features: string[];
  buttonGradient: string;
}

const PricingCards = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [fetchingPrices, setFetchingPrices] = useState(true);

  // Fetch pricing from API
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-pricing");

        if (error) throw error;

        const pricing = data.pricing;

        // Map pricing to tier configuration
        setTiers([
          {
            name: "BASIC",
            price: pricing.basic?.price || 15,
            badge: null,
            glowColor: "glow-blue",
            features: ["Instant delivery", "Email reward", "Fun surprises"],
            buttonGradient: "from-green-500 to-green-600",
          },
          {
            name: "GOLD",
            price: pricing.gold?.price || 30,
            badge: "⭐ POPULAR",
            glowColor: "glow-gold",
            features: ["Better prizes", "Bonus spin chance", "Priority delivery"],
            buttonGradient: "from-gold to-gold/80",
          },
          {
            name: "VIP",
            price: pricing.vip?.price || 50,
            badge: "Premium Tier",
            glowColor: "glow-purple",
            features: ["Exclusive prizes", "Guaranteed high-value", "VIP perks"],
            buttonGradient: "from-primary to-primary/80",
          },
        ]);
      } catch (error) {
        console.error("Error fetching pricing:", error);
        toast.error("Failed to load pricing");
        // Fallback to default prices
        setTiers([
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
        ]);
      } finally {
        setFetchingPrices(false);
      }
    };

    fetchPricing();
  }, []);

  const handleTierClick = async (tier: string, price: number) => {
    try {
      setLoading(tier);
      toast.loading("Creating checkout session...");

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { tier },
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in new tab
        window.open(data.url, "_blank");
        toast.success("Checkout opened in new tab!");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to create checkout session");
    } finally {
      setLoading(null);
    }
  };

  if (fetchingPrices) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-8 animate-pulse bg-card/50">
            <div className="h-48 bg-muted/20 rounded" />
          </Card>
        ))}
      </div>
    );
  }

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
            disabled={loading === tier.name.toLowerCase()}
            className={`w-full bg-gradient-to-r ${tier.buttonGradient} hover:scale-105 transition-transform font-bold text-lg py-6 rounded-full disabled:opacity-50`}
          >
            {loading === tier.name.toLowerCase() ? "PROCESSING..." : "SPIN NOW →"}
          </Button>
        </Card>
      ))}
    </div>
  );
};

export default PricingCards;
