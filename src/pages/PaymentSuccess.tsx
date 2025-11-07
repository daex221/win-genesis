import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle, Loader2 } from "lucide-react";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [tier, setTier] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get("session_id");
      
      if (!sessionId) {
        toast.error("No session ID found");
        navigate("/");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { sessionId },
        });

        if (error) throw error;

        if (data?.verified && data?.token) {
          setToken(data.token);
          setTier(data.tier);
          toast.success("Payment verified! Ready to spin!");
        } else {
          throw new Error("Payment verification failed");
        }
      } catch (error) {
        console.error("Verification error:", error);
        toast.error("Failed to verify payment");
        navigate("/");
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  const handleSpin = () => {
    if (token && tier) {
      navigate(`/?token=${token}&tier=${tier}`);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
          <h2 className="text-2xl font-bold mb-2">Verifying Payment...</h2>
          <p className="text-muted-foreground">Please wait while we confirm your payment</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="p-8 max-w-md w-full text-center glow-green">
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
        <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-muted-foreground mb-6">
          Your {tier?.toUpperCase()} tier payment has been confirmed.
        </p>
        
        <div className="bg-muted p-4 rounded-lg mb-6">
          <p className="text-sm text-muted-foreground mb-2">Your Spin Token</p>
          <code className="text-xs break-all bg-background p-2 rounded block">
            {token}
          </code>
        </div>

        <Button
          onClick={handleSpin}
          size="lg"
          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:scale-105 transition-transform font-bold text-lg py-6 rounded-full"
        >
          SPIN THE WHEEL NOW! 🎉
        </Button>

        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="w-full mt-4"
        >
          Back to Home
        </Button>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
