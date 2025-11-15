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
import { Zap, Gift, Users, Award, TrendingUp } from "lucide-react";
import UserMenu from "@/components/UserMenu";

const Index = () => {
  const [searchParams] = useSearchParams();
  const [showWinModal, setShowWinModal] = useState(false);
  const [wonPrize, setWonPrize] = useState<{ name: string; emoji: string } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [selectedTier, setSelectedTier] = useState<"basic" | "gold" | "vip">("basic");
  const [balance, setBalance] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      // Check if user is admin
      const { data } = await supabase
        .from("user_roles")
        .select("app_role")
        .eq("user_id", user.id)
        .eq("app_role", "admin")
        .maybeSingle();

      setIsAdmin(!!data);
    } else {
      setIsAdmin(false);
    }
  };

  const handlePrizeWon = (prize: { name: string; emoji: string }) => {
    setWonPrize(prize);
    setShowWinModal(true);
  };

  const handleSignIn = () => {
    window.location.href = "/auth";
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0A0E27 0%, #1A0B2E 100%)" }}
    >
      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-float-up opacity-40"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 10}s`,
            animationDuration: `${15 + Math.random() * 10}s`,
          }}
        />
      ))}

      {/* Stats bar at top */}
      <div className="relative z-50 bg-white/5 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-4 py-3 flex justify-center items-center gap-8">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold text-white">1,238 spins today</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">$8,420 in rewards given</span>
          </div>
        </div>
      </div>

      {/* Header with profile */}
      <header className="relative z-50">
        <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
          <img src={supporterswinLogo} alt="Supporterswin" className="h-10 w-auto" />
          <div className="flex gap-3 items-center">
            {user ? (
              <UserMenu
                user={user}
                onLogout={async () => {
                  await supabase.auth.signOut();
                  setUser(null);
                }}
              />
            ) : (
              <NavLink to="/auth">
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:scale-105 transition-transform">
                  Sign In
                </Button>
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin">
                <Button
                  variant="secondary"
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-0"
                >
                  🔐 Admin
                </Button>
              </NavLink>
            )}
          </div>
        </nav>
      </header>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* TAP TO SPIN & WIN Header */}
        <div className="flex justify-center mb-12">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-cyan-500/20 rounded-[60px] blur-xl"></div>
            <div className="relative border-4 border-cyan-400 rounded-[60px] px-16 py-6 shadow-[0_0_40px_rgba(0,217,255,0.6)]">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-cyan-400 tracking-wider">
                TAP TO SPIN & WIN
              </h1>
            </div>
          </div>
        </div>

        {user ? (
          <>
            {/* Wallet Balance */}
            <div className="max-w-md mx-auto mb-6">
              <WalletBalance onBalanceUpdate={setBalance} />
            </div>

            {/* Tier Selection */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8 max-w-2xl mx-auto">
              {(["basic", "gold", "vip"] as const).map((tier) => (
                <Button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  variant={selectedTier === tier ? "default" : "outline"}
                  className={`min-h-[44px] touch-manipulation flex items-center gap-2 transition-all ${
                    selectedTier === tier
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(0,217,255,0.6)] scale-105"
                      : "bg-white/5 backdrop-blur-lg border-white/10 hover:bg-white/10"
                  }`}
                >
                  {tier === "gold" && <Zap className="w-4 h-4" />}
                  {tier === "vip" && <Award className="w-4 h-4" />}
                  {tier.toUpperCase()}
                </Button>
              ))}
            </div>

            {/* Authenticated Spinning Wheel */}
            <div className="w-full max-w-md md:max-w-lg lg:max-w-2xl mx-auto mb-12">
              <div className="flex justify-center">
                <SpinWheelAuth
                  tier={selectedTier}
                  balance={balance}
                  onBalanceChange={() => {}}
                  onPrizeWon={handlePrizeWon}
                />
              </div>
            </div>

            {/* Live activity / Social proof */}
            <div className="max-w-2xl mx-auto mb-12">
              <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-bold text-white">Recent Winners</h3>
                </div>
                <div className="space-y-3">
                  {["Sarah won Priority DM Access", "Mike won Custom Shout Out", "Alex won Secret Photo Drop"].map(
                    (activity, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-white/80">{activity}</span>
                        <Award className="w-4 h-4 text-yellow-400 ml-auto" />
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Demo Spinning Wheel */}
            <div className="w-full max-w-md md:max-w-lg lg:max-w-2xl mx-auto mb-12">
              <div className="flex justify-center">
                <SpinWheel onPrizeWon={handlePrizeWon} />
              </div>
            </div>

            {/* Sign in CTA */}
            <div className="text-center mb-12">
              <p className="text-white/80 mb-6 text-lg">Sign in to fund your wallet and spin for real prizes!</p>
              <Button
                onClick={handleSignIn}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:scale-105 transition-transform text-lg px-12 py-6 min-h-[44px] shadow-[0_0_30px_rgba(0,217,255,0.6)] border-2 border-cyan-400/50 rounded-full"
              >
                Sign In to Play
              </Button>
            </div>
          </>
        )}

        {/* Merch Section */}
        <div className="text-center py-16 border-t border-white/10">
          <h2 className="text-4xl md:text-5xl font-black text-cyan-400 mb-4 drop-shadow-[0_0_30px_rgba(0,217,255,0.6)]">
            GET EXCLUSIVE MERCH!
          </h2>
          <p className="text-lg md:text-xl text-cyan-300/80 max-w-3xl mx-auto mb-12">
            Shop for limited edition merchandise available only to our supporters.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-12 mb-8">
            <div className="text-center">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-cyan-500/20 rounded-3xl blur-xl"></div>
                <div className="relative border-3 border-cyan-400 rounded-3xl px-8 py-4 shadow-[0_0_30px_rgba(0,217,255,0.5)] bg-cyan-950/30">
                  <p className="text-cyan-400 font-bold text-lg tracking-wider">
                    SUPPORTERS
                    <br />
                    WIN
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-2xl"></div>
                <div className="relative w-32 h-32 rounded-full border-4 border-cyan-400 shadow-[0_0_40px_rgba(0,217,255,0.6)] flex items-center justify-center bg-gradient-to-br from-cyan-950/50 to-blue-950/50 mb-4">
                  <span className="text-5xl text-cyan-400">$</span>
                </div>
              </div>
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-purple-500/20 rounded-3xl blur-xl"></div>
                <div className="relative border-3 border-purple-500 rounded-3xl px-6 py-3 shadow-[0_0_30px_rgba(168,85,247,0.5)] bg-purple-950/30">
                  <p className="text-purple-400 font-bold text-base">
                    Spin to Unlock
                    <br />
                    <span className="text-2xl">25% Off</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Win Modal */}
      {wonPrize && <WinModal isOpen={showWinModal} onClose={() => setShowWinModal(false)} prize={wonPrize} />}
    </div>
  );
};

export default Index;
