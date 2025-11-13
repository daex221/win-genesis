import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import ProfileCompletionDialog from "@/components/ProfileCompletionDialog";

const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telegram, setTelegram] = useState("");
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate(redirectTo);
      }
    });
  }, [navigate, redirectTo]);


  const handleAuth = async () => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password");
          } else {
            toast.error(error.message);
          }
          return;
        }
        
        // Check if profile is complete
        const metadata = data.user?.user_metadata;
        if (!metadata?.telegram && !metadata?.instagram && !metadata?.phone) {
          setShowProfileDialog(true);
        } else {
          toast.success("Logged in successfully!");
          navigate(redirectTo);
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              telegram: telegram || null,
              instagram: instagram || null,
              phone: phone || null,
            },
          },
        });
        
        if (error) {
          if (error.message.includes("User already registered")) {
            toast.error("An account with this email already exists");
          } else {
            toast.error(error.message);
          }
          return;
        }
        
        toast.success("Account created! You can now log in.");
        setIsLogin(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background aurora-bg flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 bg-card border-border relative z-10">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {isLogin ? "Welcome Back!" : "Join the Fun"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isLogin 
                ? "Log in to continue spinning and winning amazing prizes" 
                : "Create your account and start winning exclusive rewards today"}
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-input text-foreground"
                autoComplete="email"
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAuth()}
                className="w-full bg-input text-foreground"
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
            </div>
            
            {!isLogin && (
              <>
                <div className="bg-muted/50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-muted-foreground">
                    💡 Add your social handles to receive prizes faster and get exclusive notifications!
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telegram" className="text-muted-foreground text-xs">
                    Telegram Username (Optional)
                  </Label>
                  <Input
                    id="telegram"
                    type="text"
                    placeholder="@username"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    className="w-full bg-input text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram" className="text-muted-foreground text-xs">
                    Instagram Handle (Optional)
                  </Label>
                  <Input
                    id="instagram"
                    type="text"
                    placeholder="@handle"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full bg-input text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-muted-foreground text-xs">
                    Phone Number (Optional)
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-input text-foreground"
                  />
                </div>
              </>
            )}
            
            <Button
              onClick={handleAuth}
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-primary/80"
            >
              {loading ? "Loading..." : isLogin ? "Log in" : "Sign Up"}
            </Button>
            
            <Button
              onClick={() => setIsLogin(!isLogin)}
              variant="outline"
              className="w-full border-2"
            >
              {isLogin ? "Create new account" : "Already have an account? Log in"}
            </Button>
          </div>
        </Card>
      </div>
      
      <ProfileCompletionDialog 
        open={showProfileDialog}
        onClose={() => {
          setShowProfileDialog(false);
          navigate(redirectTo);
        }}
      />
    </>
  );
};

export default Auth;
