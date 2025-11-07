import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const AdminAnalytics = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSpins: 0,
    basicSpins: 0,
    goldSpins: 0,
    vipSpins: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      // Fetch total revenue and spins
      const { data: spins, error } = await supabase
        .from("spins")
        .select("amount_paid, tier");

      if (error) {
        console.error("Error fetching stats:", error);
        return;
      }

      const totalRevenue = spins?.reduce((sum, spin) => sum + Number(spin.amount_paid), 0) || 0;
      const basicSpins = spins?.filter((s) => s.tier === "basic").length || 0;
      const goldSpins = spins?.filter((s) => s.tier === "gold").length || 0;
      const vipSpins = spins?.filter((s) => s.tier === "vip").length || 0;

      setStats({
        totalRevenue,
        totalSpins: spins?.length || 0,
        basicSpins,
        goldSpins,
        vipSpins,
      });
    };

    fetchStats();
  }, []);

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold text-foreground mb-6">Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-card glow-gold">
          <div className="text-muted-foreground mb-2">Total Revenue</div>
          <div className="text-3xl font-bold text-foreground">
            ${stats.totalRevenue.toFixed(2)}
          </div>
        </Card>

        <Card className="p-6 bg-card glow-blue">
          <div className="text-muted-foreground mb-2">Total Spins</div>
          <div className="text-3xl font-bold text-foreground">{stats.totalSpins}</div>
          <div className="text-sm text-muted-foreground mt-2">
            Basic: {stats.basicSpins} | Gold: {stats.goldSpins} | VIP: {stats.vipSpins}
          </div>
        </Card>

        <Card className="p-6 bg-card glow-purple">
          <div className="text-muted-foreground mb-2">Average Per Spin</div>
          <div className="text-3xl font-bold text-foreground">
            ${stats.totalSpins > 0 ? (stats.totalRevenue / stats.totalSpins).toFixed(2) : "0.00"}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
