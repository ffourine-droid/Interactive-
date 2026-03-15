import { supabase } from '../lib/supabase';

export interface AccessResult {
  access: boolean;
  reason: 'not_found' | 'pending' | 'rejected' | 'expired' | 'granted';
  plan?: string;
  lesson_id?: string;
  rejection_reason?: string;
  expires_at?: string;
  status?: string;
}

export async function checkAccess(phone: string): Promise<AccessResult> {
  if (!phone) return { access: false, reason: 'not_found' };

  try {
    // Get all payments for this phone number, ordered by creation (latest first)
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('phone_number', phone.trim())
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return { access: false, reason: 'not_found' };
    }

    // 1. Check for the most recent payment
    const latestPayment = data[0];

    // If rejected, no access
    if (latestPayment.status === 'rejected') {
      return { 
        access: false, 
        reason: 'rejected', 
        rejection_reason: latestPayment.rejection_reason,
        status: 'rejected'
      };
    }

    // If approved, check expiry
    if (latestPayment.status === 'approved') {
      const isExpired = latestPayment.expires_at && new Date(latestPayment.expires_at) < new Date();
      if (isExpired) {
        return { access: false, reason: 'expired', status: 'approved' };
      }
      return { 
        access: true, 
        reason: 'granted', 
        plan: latestPayment.plan, 
        lesson_id: latestPayment.lesson_id,
        expires_at: latestPayment.expires_at,
        status: 'approved'
      };
    }

    // If pending, grant immediate access (as per new requirement)
    if (latestPayment.status === 'pending') {
      // Calculate provisional expiry based on plan
      let days = 1;
      if (latestPayment.plan === 'weekly') days = 7;
      if (latestPayment.plan === 'monthly') days = 30;
      
      const provisionalExpiry = new Date(new Date(latestPayment.created_at).getTime() + days * 24 * 60 * 60 * 1000).toISOString();

      return { 
        access: true, 
        reason: 'granted', 
        plan: latestPayment.plan, 
        lesson_id: latestPayment.lesson_id,
        expires_at: provisionalExpiry,
        status: 'pending'
      };
    }

    return { access: false, reason: 'not_found' };
  } catch (err) {
    console.error('Access check error:', err);
    return { access: false, reason: 'not_found' };
  }
}
