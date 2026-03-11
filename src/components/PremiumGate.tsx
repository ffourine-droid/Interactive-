import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { checkAccess } from '../utils/checkAccess';
import { AccessPrompt } from './AccessPrompt';

interface PremiumGateProps {
  lessonId: string;
  children: React.ReactNode;
  onPayClick: () => void;
}

export const PremiumGate: React.FC<PremiumGateProps> = ({ lessonId, children, onPayClick }) => {
  const [access, setAccess] = useState<boolean | null>(null); // null=loading, true=granted, false=denied

  useEffect(() => {
    const checkSavedPhone = async () => {
      const saved = sessionStorage.getItem('azilearn_phone');
      if (saved) {
        const result = await checkAccess(saved);
        if (result.access) {
          setAccess(true);
        } else {
          setAccess(false);
        }
      } else {
        setAccess(false);
      }
    };

    checkSavedPhone();
  }, [lessonId]);

  if (access === null) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="animate-spin text-brand-accent" size={40} />
      </div>
    );
  }

  if (access === true) {
    return <>{children}</>;
  }

  return (
    <div className="py-12">
      <AccessPrompt 
        lessonId={lessonId} 
        onSuccess={() => setAccess(true)} 
        onPayClick={onPayClick}
      />
    </div>
  );
};
