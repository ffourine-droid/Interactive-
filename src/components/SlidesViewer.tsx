import React, { useState, useRef, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, EffectCoverflow } from 'swiper/modules';
import { Volume2, VolumeX, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-coverflow';

interface SlidesViewerProps {
  slides: string[];
  audioUrl?: string;
}

export const SlidesViewer: React.FC<SlidesViewerProps> = ({ slides, audioUrl }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioUrl) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.loop = true;
      
      // Try to autoplay (might be blocked by browser)
      const playAudio = async () => {
        try {
          await audioRef.current?.play();
          setIsPlaying(true);
        } catch (err) {
          console.log('Autoplay blocked');
        }
      };
      
      playAudio();

      return () => {
        audioRef.current?.pause();
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

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      <Swiper
        effect={'coverflow'}
        grabCursor={true}
        centeredSlides={true}
        slidesPerView={'auto'}
        coverflowEffect={{
          rotate: 50,
          stretch: 0,
          depth: 100,
          modifier: 1,
          slideShadows: true,
        }}
        pagination={{ clickable: true }}
        navigation={true}
        modules={[EffectCoverflow, Pagination, Navigation]}
        className="w-full h-full max-w-lg"
      >
        {slides.map((url, index) => (
          <SwiperSlide key={index} className="flex items-center justify-center">
            <div className="w-full h-full flex items-center justify-center p-4">
              <img 
                src={url} 
                alt={`Slide ${index + 1}`} 
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Controls Overlay */}
      <div className="absolute top-6 right-6 z-50 flex gap-3">
        {audioUrl && (
          <>
            <button 
              onClick={togglePlay}
              className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button 
              onClick={toggleMute}
              className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .swiper-button-next, .swiper-button-prev {
          color: white !important;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          width: 50px !important;
          height: 50px !important;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .swiper-button-next:after, .swiper-button-prev:after {
          font-size: 20px !important;
          font-weight: bold;
        }
        .swiper-pagination-bullet {
          background: white !important;
          opacity: 0.5;
        }
        .swiper-pagination-bullet-active {
          opacity: 1;
          background: #FF6321 !important;
        }
      `}} />
    </div>
  );
};
