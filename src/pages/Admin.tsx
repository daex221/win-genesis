import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import AdminAnalytics from "@/components/AdminAnalytics";
import PrizeManagement from "@/components/PrizeManagement";

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (password === "admin123") {
      setIsAuthenticated(true);
    } else {
      alert("Incorrect password");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background aurora-bg flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 bg-card">
          <h1 className="text-3xl font-bold text-foreground mb-6 text-center">
            Admin Dashboard
          </h1>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleLogin()}
              className="w-full"
            />
            <Button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-primary to-primary/80"
            >
              LOGIN
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background aurora-bg">
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-foreground">Admin Dashboard</h1>
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="rounded-full"
          >
            ← Back to App
          </Button>
        </div>

        <AdminAnalytics />
        <PrizeManagement />
      </div>
    </div>
  );
};

export default Admin;
