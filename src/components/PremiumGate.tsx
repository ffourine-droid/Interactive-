import React, { useState, useEffect } from 'react';
import { Loader2, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { checkAccess, AccessResult } from '../utils/checkAccess';
import { AccessPrompt } from './AccessPrompt';
import { CountdownTimer } from './CountdownTimer';
import { useToast } from './Toast';

interface PremiumGateProps {
  lessonId: string;
  children: React.ReactNode;
  onPayClick: () => void;
  onEnterCode: () => void;
  onClose: () => void;
}

export const PremiumGate: React.FC<PremiumGateProps> = ({ lessonId, children, onPayClick, onEnterCode, onClose }) => {
  const [accessResult, setAccessResult] = useState<AccessResult | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const performCheck = async () => {
    const saved = sessionStorage.getItem('azilearn_phone');
    if (saved) {
      try {
        const result = await checkAccess(saved);
        setAccessResult(result);
      } catch (err: any) {
        console.error('Access check error:', err);
        showToast("Failed to verify access. Please check your connection.", "error");
        setAccessResult({ access: false, reason: 'error' as any });
      }
    } else {
      setAccessResult({ access: false, reason: 'not_found' });
    }
    setLoading(false);
  };

  useEffect(() => {
    performCheck();

    const handleStorage = () => performCheck();
    window.addEventListener('storage', handleStorage);

    // Real-time subscription for status changes
    const saved = sessionStorage.getItem('azilearn_phone');
    if (saved) {
      const channel = supabase
        .channel('payment_status')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'payments',
            filter: `phone_number=eq.${saved}`,
          },
          () => {
            performCheck();
          }
        )
        .subscribe();

      return () => {
        window.removeEventListener('storage', handleStorage);
        supabase.removeChannel(channel);
      };
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [lessonId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] bg-brand-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-accent" size={40} />
      </div>
    );
  }

  if (accessResult?.access) {
    return (
      <>
        {/* Timer/Status Bar */}
        <div className="fixed top-16 left-0 right-0 z-[110] px-6 py-2 bg-brand-accent/10 backdrop-blur-md border-b border-brand-accent/20 flex items-center justify-center gap-4 text-xs font-bold">
          {accessResult.status === 'pending' ? (
            <div className="flex items-center gap-2 text-amber-600">
              <Clock size={14} className="animate-pulse" />
              <span>Awaiting Admin Approval (Temporary Access)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-brand-accent">
              <span className="opacity-60">Time Remaining:</span>
              <CountdownTimer expiresAt={accessResult.expires_at!} onExpire={performCheck} />
            </div>
          )}
        </div>
        <div className="pt-8 h-full">
          {children}
        </div>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-brand-bg/95 backdrop-blur-md flex items-center justify-center p-6">
      <div className="w-full max-w-md relative">
        <button 
          onClick={onClose}
          className="absolute -top-12 left-0 text-brand-muted hover:text-brand-accent font-bold flex items-center gap-2 transition-colors"
        >
          ← Back to Home
        </button>
        <AccessPrompt 
          lessonId={lessonId} 
          onSuccess={performCheck} 
          onPayClick={onPayClick}
        />
      </div>
    </div>
  );
};
