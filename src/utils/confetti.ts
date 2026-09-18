import confetti from 'canvas-confetti';

export const triggerConfetti = () => {
  try {
    // Blast 1: center burst
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 }
    });
    // Blast 2: angled celebratory shower
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 200);
  } catch (e) {
    console.warn('Confetti trigger notice:', e);
  }
};
