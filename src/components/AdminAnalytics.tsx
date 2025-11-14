import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface RevenueData {
  date: string;
  revenue: number;
}

interface TierData {
  tier: string;
  count: number;
  fill: string;
}

const AdminAnalytics = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSpins: 0,
    basicSpins: 0,
    goldSpins: 0,
    vipSpins: 0,
  });
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [tierData, setTierData] = useState<TierData[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // Fetch total revenue and spins
    const { data: spins, error } = await supabase
      .from("spins")
      .select("amount_paid, tier, created_at")
      .order("created_at", { ascending: true });

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

    // Process revenue trend data (last 7 days)
    const revenueByDay = spins?.reduce((acc, spin) => {
      const date = new Date(spin.created_at).toLocaleDateString();
      acc[date] = (acc[date] || 0) + Number(spin.amount_paid);
      return acc;
    }, {} as Record<string, number>);

    const revenueTrend = Object.entries(revenueByDay || {})
      .map(([date, revenue]) => ({ date, revenue }))
      .slice(-7);

    setRevenueData(revenueTrend);

    // Set tier data for chart
    setTierData([
      { tier: "Basic", count: basicSpins, fill: "hsl(var(--chart-1))" },
      { tier: "Gold", count: goldSpins, fill: "hsl(var(--chart-2))" },
      { tier: "VIP", count: vipSpins, fill: "hsl(var(--chart-3))" },
    ]);
  };

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold text-foreground mb-6">Analytics</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <Card className="p-6 bg-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Revenue Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Spins by Tier Chart */}
        <Card className="p-6 bg-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Spins by Tier</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tierData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="tier" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
