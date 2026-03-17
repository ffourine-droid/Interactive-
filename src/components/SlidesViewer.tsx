import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, ChevronLeft, ChevronRight, Play, Pause, Maximize2, Minimize2 } from 'lucide-react';

interface SlidesViewerProps {
  slides: string[];
  audioUrl?: string;
}

export const SlidesViewer: React.FC<SlidesViewerProps> = ({ slides, audioUrl }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Preload adjacent slides
  useEffect(() => {
    const preloadIndices = [currentIndex - 1, currentIndex + 1];
    preloadIndices.forEach(index => {
      if (index >= 0 && index < slides.length) {
        const img = new Image();
        img.src = slides[index];
      }
    });
  }, [currentIndex, slides]);

  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio();
      audio.src = audioUrl;
      audio.loop = true;
      audio.preload = "auto";
      audioRef.current = audio;
      
      const playAudio = async () => {
        try {
          await audio.play();
          setIsPlaying(true);
        } catch (err) {
          console.log('Autoplay blocked');
        }
      };
      
      playAudio();

      return () => {
        audio.pause();
        audio.src = "";
        audioRef.current = null;
      };
    }
  }, [audioUrl]);

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const goTo = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, slides.length - 1)));
  };

  const next = () => goTo(currentIndex + 1);
  const prev = () => goTo(currentIndex - 1);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden select-none ${isFullscreen ? 'fixed inset-0 z-[200]' : ''}`}
    >
      {/* Carousel Wrapper */}
      <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden">
        <motion.div 
          className="flex h-full"
          animate={{ x: `-${currentIndex * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{ width: `${slides.length * 100}%` }}
        >
          {slides.map((url, index) => (
            <div 
              key={index} 
              className="w-full h-full flex items-center justify-center p-4 md:p-8"
              style={{ flex: "0 0 100%" }}
            >
              <img 
                src={url} 
                alt={`Slide ${index + 1}`} 
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl pointer-events-none"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            </div>
          ))}
        </motion.div>

        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <button 
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/20 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-all z-10"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        {currentIndex < slides.length - 1 && (
          <button 
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/20 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-all z-10"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="w-full p-6 flex flex-col items-center gap-4 bg-gradient-to-t from-black/80 to-transparent">
        {/* Dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === currentIndex ? 'bg-brand-accent w-6' : 'bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-6">
          {audioUrl && (
            <div className="flex items-center gap-2">
              <button 
                onClick={togglePlay}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all"
                title={isPlaying ? "Pause Audio" : "Play Audio"}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button 
                onClick={toggleMute}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </div>
          )}
          
          <div className="h-4 w-px bg-white/20" />
          
          <button 
            onClick={toggleFullscreen}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">
            Slide {currentIndex + 1} of {slides.length}
          </div>
        </div>
      </div>
    </div>
  );
};
