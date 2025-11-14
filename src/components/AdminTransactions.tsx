import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Transaction {
  id: string;
  email: string;
  amount: number;
  tier: string;
  status: string;
  created_at: string;
  stripe_session_id: string;
}

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [displayCount, setDisplayCount] = useState(8);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching transactions:", error);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  const loadMore = () => {
    setDisplayCount((prev) => prev + 8);
  };

  if (loading) {
    return (
      <Card className="p-6 bg-card">
        <div className="text-center text-muted-foreground">Loading transactions...</div>
      </Card>
    );
  }

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold text-foreground mb-6">Recent Transactions</h2>
      <Card className="p-6 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Email</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Tier</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Time</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, displayCount).map((transaction) => (
                <tr key={transaction.id} className="border-b border-border/50 hover:bg-muted/50">
                  <td className="py-3 px-4 text-sm text-foreground">{transaction.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      transaction.tier === "vip" ? "bg-primary/20 text-primary" :
                      transaction.tier === "gold" ? "bg-gold/20 text-gold" :
                      "bg-green-500/20 text-green-500"
                    }`}>
                      {transaction.tier.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-foreground">
                    ${Number(transaction.amount).toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      transaction.status === "completed" ? "bg-green-500/20 text-green-500" :
                      transaction.status === "pending" ? "bg-yellow-500/20 text-yellow-500" :
                      "bg-red-500/20 text-red-500"
                    }`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {displayCount < transactions.length && (
          <div className="mt-6 text-center">
            <Button onClick={loadMore} variant="outline" className="rounded-full">
              Load More ({transactions.length - displayCount} remaining)
            </Button>
          </div>
        )}

        {transactions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No transactions yet
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminTransactions;