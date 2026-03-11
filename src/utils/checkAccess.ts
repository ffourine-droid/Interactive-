import { supabase } from '../lib/supabase';

export interface AccessResult {
  access: boolean;
  reason: 'not_found' | 'pending' | 'rejected' | 'expired' | 'granted';
  plan?: string;
  lesson_id?: string;
  rejection_reason?: string;
}

export async function checkAccess(phone: string): Promise<AccessResult> {
  if (!phone) return { access: false, reason: 'not_found' };

  try {
    // Get all payments for this phone number, ordered by expiry (latest first)
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('phone_number', phone.trim())
      .order('expires_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return { access: false, reason: 'not_found' };
    }

    // 1. Check if any are approved and not expired
    const activePayment = data.find(p => 
      p.status === 'approved' && 
      (!p.expires_at || new Date(p.expires_at) > new Date())
    );

    if (activePayment) {
      return { access: true, reason: 'granted', plan: activePayment.plan, lesson_id: activePayment.lesson_id };
    }

    // 2. If none active, check if any are pending
    const pendingPayment = data.find(p => p.status === 'pending');
    if (pendingPayment) {
      return { access: false, reason: 'pending' };
    }

    // 3. Check if any were rejected
    const rejectedPayment = data.find(p => p.status === 'rejected');
    if (rejectedPayment) {
      return { access: false, reason: 'rejected', rejection_reason: rejectedPayment.rejection_reason };
    }

    // 4. Check if any are expired
    const expiredPayment = data.find(p => p.status === 'approved' && p.expires_at && new Date(p.expires_at) < new Date());
    if (expiredPayment) {
      return { access: false, reason: 'expired' };
    }

    return { access: false, reason: 'not_found' };
  } catch (err) {
    console.error('Access check error:', err);
    return { access: false, reason: 'not_found' };
  }
}
