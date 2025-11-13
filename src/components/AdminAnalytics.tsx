import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const AdminAnalytics = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSpins: 0,
    basicSpins: 0,
    goldSpins: 0,
    vipSpins: 0,
  });

  const [revenueByDate, setRevenueByDate] = useState<Array<{ date: string; revenue: number; spins: number }>>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "all">("7d");

  useEffect(() => {
    fetchStats();
    fetchRevenueByDate();
    fetchTransactions();
  }, [timeframe]);

  const fetchStats = async () => {
    // Fetch total revenue and spins
    const { data: spins, error } = await supabase.from("spins").select("amount_paid, tier");

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

  const fetchRevenueByDate = async () => {
    let query = supabase.from("spins").select("created_at, amount_paid, tier");

    // Apply timeframe filter
    if (timeframe !== "all") {
      const days = timeframe === "7d" ? 7 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      query = query.gte("created_at", startDate.toISOString());
    }

    const { data: spins, error } = await query;

    if (error) {
      console.error("Error fetching revenue by date:", error);
      return;
    }

    // Group by date
    const groupedByDate =
      spins?.reduce((acc: any, spin: any) => {
        const date = new Date(spin.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const existing = acc.find((item: any) => item.date === date);

        if (existing) {
          existing.revenue += Number(spin.amount_paid) / 100;
          existing.spins += 1;
        } else {
          acc.push({
            date,
            revenue: Number(spin.amount_paid) / 100,
            spins: 1,
          });
        }
        return acc;
      }, []) || [];

    // Sort by date
    groupedByDate.sort((a: any, b: any) => {
      const aDate = new Date(a.date);
      const bDate = new Date(b.date);
      return aDate.getTime() - bDate.getTime();
    });

    setRevenueByDate(groupedByDate);
  };

  const fetchTransactions = async () => {
    let query = supabase.from("spins").select("*").order("created_at", { ascending: false }).limit(50);

    // Apply timeframe filter
    if (timeframe !== "all") {
      const days = timeframe === "7d" ? 7 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      query = query.gte("created_at", startDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching transactions:", error);
      return;
    }

    setTransactions(data || []);
  };

  const exportToCSV = () => {
    const headers = ["Date", "Tier", "Prize", "Amount", "Status", "Created At"];
    const rows = transactions.map((t) => [
      new Date(t.created_at).toLocaleDateString(),
      t.tier?.toUpperCase() || "N/A",
      t.prize_name || "N/A",
      `$${(Number(t.amount_paid) / 100).toFixed(2)}`,
      t.fulfillment_status || "pending",
      new Date(t.created_at).toLocaleString(),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `supporterswin-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="mb-12 space-y-8">
      <h2 className="text-2xl font-bold text-foreground mb-6">Analytics Dashboard</h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-card glow-gold">
          <div className="text-muted-foreground mb-2">Total Revenue</div>
          <div className="text-3xl font-bold text-foreground">${(stats.totalRevenue / 100).toFixed(2)}</div>
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
            ${stats.totalSpins > 0 ? (stats.totalRevenue / stats.totalSpins / 100).toFixed(2) : "0.00"}
          </div>
        </Card>
      </div>

      {/* Revenue by Date Chart */}
      <Card className="p-6 bg-card">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-foreground">Revenue Trend</h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={timeframe === "7d" ? "default" : "outline"}
              onClick={() => setTimeframe("7d")}
              className="text-xs"
            >
              7 Days
            </Button>
            <Button
              size="sm"
              variant={timeframe === "30d" ? "default" : "outline"}
              onClick={() => setTimeframe("30d")}
              className="text-xs"
            >
              30 Days
            </Button>
            <Button
              size="sm"
              variant={timeframe === "all" ? "default" : "outline"}
              onClick={() => setTimeframe("all")}
              className="text-xs"
            >
              All Time
            </Button>
          </div>
        </div>

        {revenueByDate.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueByDate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#666" style={{ fontSize: "12px" }} />
              <YAxis stroke="#666" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #444",
                  borderRadius: "8px",
                }}
                formatter={(value: any) => `$${value.toFixed(2)}`}
                labelStyle={{ color: "#fff" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#8b5cf6"
                dot={{ fill: "#8b5cf6", r: 4 }}
                activeDot={{ r: 6 }}
                strokeWidth={2}
                name="Daily Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No data available for the selected timeframe</div>
        )}
      </Card>

      {/* Win Distribution Chart */}
      <Card className="p-6 bg-card">
        <h3 className="text-xl font-bold text-foreground mb-6">Spins by Tier</h3>
        {stats.totalSpins > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                { tier: "Basic", spins: stats.basicSpins },
                { tier: "Gold", spins: stats.goldSpins },
                { tier: "VIP", spins: stats.vipSpins },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="tier" stroke="#666" style={{ fontSize: "12px" }} />
              <YAxis stroke="#666" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #444",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#fff" }}
              />
              <Bar dataKey="spins" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No spin data available</div>
        )}
      </Card>

      {/* Recent Transactions Table */}
      <Card className="p-6 bg-card">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-foreground">Recent Transactions</h3>
          <Button
            size="sm"
            onClick={exportToCSV}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
          >
            📥 Export CSV
          </Button>
        </div>

        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Tier</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Prize</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="py-3 px-4 text-foreground">{new Date(tx.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          tx.tier === "basic"
                            ? "bg-blue-500/20 text-blue-300"
                            : tx.tier === "gold"
                              ? "bg-yellow-500/20 text-yellow-300"
                              : "bg-purple-500/20 text-purple-300"
                        }`}
                      >
                        {tx.tier?.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-foreground">{tx.prize_name || "-"}</td>
                    <td className="py-3 px-4 text-foreground font-semibold">
                      $
                      {tx.amount_paid > 100
                        ? (Number(tx.amount_paid) / 100).toFixed(2)
                        : Number(tx.amount_paid).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-bold ${
                          tx.fulfillment_status === "completed" ? "text-green-400" : "text-yellow-400"
                        }`}
                      >
                        {tx.fulfillment_status || "pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No transactions yet</div>
        )}
      </Card>
    </div>
  );
};

export default AdminAnalytics;
