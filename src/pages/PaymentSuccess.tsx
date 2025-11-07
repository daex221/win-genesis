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
  const [paymentType, setPaymentType] = useState<"wallet" | "tier">("wallet");
  const [amount, setAmount] = useState<number>(0);

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get("session_id");
      const type = searchParams.get("type");
      
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

        if (data?.verified) {
          if (data.type === "wallet_topup") {
            setPaymentType("wallet");
            setAmount(data.amount);
            toast.success("Wallet funded successfully!");
          } else {
            // Legacy tier purchase
            setPaymentType("tier");
          }
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

  const handleGoToSpin = () => {
    navigate("/");
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
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-primary" />
        <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-muted-foreground mb-6">
          {paymentType === "wallet" 
            ? `$${amount} has been added to your wallet!` 
            : "Your payment has been confirmed."
          }
        </p>
        
        {paymentType === "wallet" && (
          <div className="bg-muted p-4 rounded-lg mb-6">
            <p className="text-2xl font-bold text-primary">+${amount.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Added to your balance</p>
          </div>
        )}

        <Button
          onClick={handleGoToSpin}
          size="lg"
          className="w-full bg-gradient-to-r from-primary to-secondary hover:scale-105 transition-transform font-bold text-lg py-6 rounded-full"
        >
          START SPINNING! 🎉
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
