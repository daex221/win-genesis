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
      <DialogContent className="bg-gradient-to-br from-card to-card/80 border-2 border-primary max-w-md">
        {/* Confetti */}
        {confetti.map((piece) => (
          <div
            key={piece.id}
            className="absolute w-3 h-3 bg-gradient-to-br from-primary via-accent to-secondary rounded-full animate-confetti"
            style={{
              left: `${piece.left}%`,
              animationDelay: `${piece.delay}s`,
            }}
          />
        ))}

        <div className="relative z-10 text-center py-8">
          <div className="text-8xl mb-4 animate-scale-in">{prize.emoji}</div>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Congratulations!
          </h2>
          <p className="text-xl text-foreground mb-4">
            You just won: <span className="gradient-text font-bold">{prize.name}</span>
          </p>
          <p className="text-muted-foreground mb-8">
            Check your email for details!
          </p>

          <div className="flex flex-col gap-3">
            <Button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:scale-105 transition-transform font-bold text-lg py-6 rounded-full"
            >
              CLAIM REWARD
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full hover:scale-105 transition-transform font-bold rounded-full"
            >
              SPIN AGAIN
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WinModal;
