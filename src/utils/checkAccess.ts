import { supabase } from '../lib/supabase';

export interface AccessResult {
  access: boolean;
  reason: 'not_found' | 'pending' | 'rejected' | 'expired' | 'granted' | 'error';
  plan?: string;
  lesson_id?: string;
  rejection_reason?: string;
  expires_at?: string;
  status?: string;
  phone_number?: string;
}

export async function checkAccess(phone: string, code?: string): Promise<AccessResult> {
  if (!phone && !code) return { access: false, reason: 'not_found' };

  try {
    // Get the most recent payment for this phone or code
    let query = supabase
      .from('payments')
      .select('*');
    
    if (phone) {
      query = query.eq('phone_number', phone.trim());
    }
    
    if (code) {
      // If code is provided, we can search by it
      // If it's only 4 digits, we might need to use ilike or just eq if we store only 4 digits
      // But usually it's better to search by the full code if available
      query = query.ilike('transaction_code', `%${code.trim().toUpperCase()}%`);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return { access: false, reason: 'not_found' };
    }

    const latestPayment = data[0];

    // If rejected, no access
    if (latestPayment.status === 'rejected') {
      return { 
        access: false, 
        reason: 'rejected', 
        rejection_reason: latestPayment.rejection_reason,
        status: 'rejected',
        phone_number: latestPayment.phone_number
      };
    }

    // If approved, check expiry
    if (latestPayment.status === 'approved') {
      const isExpired = latestPayment.expires_at && new Date(latestPayment.expires_at) < new Date();
      if (isExpired) {
        return { access: false, reason: 'expired', status: 'approved', phone_number: latestPayment.phone_number };
      }
      return { 
        access: true, 
        reason: 'granted', 
        plan: latestPayment.plan, 
        lesson_id: latestPayment.lesson_id,
        expires_at: latestPayment.expires_at,
        status: 'approved',
        phone_number: latestPayment.phone_number
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
        status: 'pending',
        phone_number: latestPayment.phone_number
      };
    }

    return { access: false, reason: 'not_found' };
  } catch (err) {
    console.error('Access check error:', err);
    return { access: false, reason: 'not_found' };
  }
}
