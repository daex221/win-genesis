import { useCallback, useRef } from 'react';

export const useSounds = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTick = useCallback(() => {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  }, [getAudioContext]);

  const playSpinStart = useCallback(() => {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(400, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
    oscillator.type = 'triangle';
    
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  }, [getAudioContext]);

  const playWin = useCallback(() => {
    const ctx = getAudioContext();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      const startTime = ctx.currentTime + (index * 0.15);
      gainNode.gain.setValueAtTime(0.15, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.3);
    });
  }, [getAudioContext]);

  const playClick = useCallback(() => {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 600;
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.08);
  }, [getAudioContext]);

  const playSpinTicks = useCallback((duration: number) => {
    const tickInterval = 100; // Start with ticks every 100ms
    let currentInterval = tickInterval;
    let elapsed = 0;

    const scheduleTick = () => {
      if (elapsed >= duration) return;
      
      playTick();
      elapsed += currentInterval;
      
      // Gradually slow down the ticks
      currentInterval = tickInterval * (1 + elapsed / duration * 3);
      setTimeout(scheduleTick, currentInterval);
    };

    scheduleTick();
  }, [playTick]);

  const playBackgroundMusic = useCallback(() => {
    const ctx = getAudioContext();
    
    // Create a simple looping background melody
    const melody = [
      { freq: 523.25, duration: 0.4 }, // C5
      { freq: 659.25, duration: 0.4 }, // E5
      { freq: 783.99, duration: 0.4 }, // G5
      { freq: 659.25, duration: 0.4 }, // E5
      { freq: 698.46, duration: 0.6 }, // F5
      { freq: 587.33, duration: 0.6 }, // D5
    ];

    const playMelody = (startTime: number) => {
      let time = startTime;
      
      melody.forEach((note) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = note.freq;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.03, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + note.duration);

        oscillator.start(time);
        oscillator.stop(time + note.duration);
        
        time += note.duration;
      });

      // Schedule next loop
      const totalDuration = melody.reduce((sum, note) => sum + note.duration, 0);
      setTimeout(() => playMelody(ctx.currentTime), totalDuration * 1000);
    };

    playMelody(ctx.currentTime);
  }, [getAudioContext]);

  return {
    playTick,
    playSpinStart,
    playWin,
    playClick,
    playSpinTicks,
    playBackgroundMusic,
  };
};
