import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface WinModalProps {
  isOpen: boolean;
  onClose: () => void;
  prize: { name: string; emoji: string };
}

const WinModal = ({ isOpen, onClose, prize }: WinModalProps) => {
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number }>>([]);

  useEffect(() => {
    if (isOpen) {
      // Generate confetti
      const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
      }));
      setConfetti(confettiPieces);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border-0 p-0 max-w-md bg-transparent">
        <div className="rainbow-border rounded-3xl">
          <div className="bg-background rounded-3xl p-8">
            {/* Confetti */}
            {confetti.map((piece) => (
              <div
                key={piece.id}
                className="absolute w-2 h-2 bg-gradient-to-br from-primary via-accent to-secondary rounded-full animate-confetti"
                style={{
                  left: `${piece.left}%`,
                  animationDelay: `${piece.delay}s`,
                }}
              />
            ))}

            <div className="relative z-10 text-center">
              <div className="text-6xl mb-4 animate-scale-in">🔥</div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                You just unlocked
              </h2>
              <p className="text-4xl font-black text-gold mb-6">
                {prize.name}!
              </p>

              <div className="flex flex-col gap-3 mb-4">
                <Button
                  onClick={onClose}
                  className="w-full bg-transparent border-2 border-cyan text-cyan hover:bg-cyan hover:text-background transition-all font-bold text-lg py-6 rounded-full neon-cyan-border"
                >
                  SPIN AGAIN (20% OFF)
                </Button>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="w-full text-foreground hover:text-cyan transition-colors font-bold"
                >
                  SHARE
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WinModal;
