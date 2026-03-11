import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { AccessPrompt } from '../components/AccessPrompt';

interface AccessProps {
  onBack: () => void;
  onSuccess: () => void;
  onPayClick: () => void;
}

export const Access: React.FC<AccessProps> = ({ onBack, onSuccess, onPayClick }) => {
  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-brand-text/60 hover:text-brand-accent transition-colors mb-8 group"
        >
          <div className="p-2 bg-brand-surface/20 rounded-xl group-hover:bg-brand-accent/10 transition-colors">
            <ChevronLeft size={20} />
          </div>
          <span className="font-bold">Back to Home</span>
        </button>

        <AccessPrompt 
          onSuccess={onSuccess} 
          onPayClick={onPayClick}
        />
      </div>
    </div>
  );
};
