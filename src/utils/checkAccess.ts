import { supabase } from '../lib/supabase';

export interface AccessResult {
  access: boolean;
  reason: 'not_found' | 'pending' | 'rejected' | 'expired' | 'granted';
  plan?: string;
  lesson_id?: string;
  rejection_reason?: string;
}

export async function checkAccess(code: string): Promise<AccessResult> {
  if (!code) return { access: false, reason: 'not_found' };

  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_code', code.trim().toUpperCase())
      .single();

    if (error || !data) {
      return { access: false, reason: 'not_found' };
    }

    if (data.status === 'pending') {
      return { access: false, reason: 'pending' };
    }

    if (data.status === 'rejected') {
      return { access: false, reason: 'rejected', rejection_reason: data.rejection_reason };
    }

    if (data.status === 'approved') {
      // Check expiry for all plans
      if (data.expires_at) {
        if (new Date(data.expires_at) < new Date()) {
          return { access: false, reason: 'expired' };
        }
      }
      return { access: true, reason: 'granted', plan: data.plan, lesson_id: data.lesson_id };
    }

    return { access: false, reason: 'not_found' };
  } catch (err) {
    console.error('Access check error:', err);
    return { access: false, reason: 'not_found' };
  }
}
