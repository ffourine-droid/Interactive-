import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Search, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MoreHorizontal, 
  Copy, 
  Smartphone,
  TrendingUp,
  AlertCircle,
  Loader2,
  Lock
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Payment {
  id: string;
  transaction_code: string;
  amount: number;
  plan: string;
  lesson_id: string;
  phone_number: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  verified_at: string;
  rejection_reason: string;
}

export const AdminPayments: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    pending: 0,
    approvedToday: 0,
    revenueToday: 0
  });

  const ADMIN_PASSWORD = "azilearn-admin-2024"; // In real app, use env var

  useEffect(() => {
    if (isAuthenticated) {
      fetchPayments();
      const subscription = supabase
        .channel('payments_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
          fetchPayments();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isAuthenticated]);

  const fetchPayments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (data) {
      setPayments(data);
      calculateStats(data);
    }
    setLoading(false);
  };

  const calculateStats = (data: Payment[]) => {
    const today = new Date().toISOString().split('T')[0];
    const pending = data.filter(p => p.status === 'pending').length;
    const approvedToday = data.filter(p => p.status === 'approved' && p.verified_at?.startsWith(today)).length;
    const revenueToday = data
      .filter(p => p.status === 'approved' && p.verified_at?.startsWith(today))
      .reduce((sum, p) => sum + p.amount, 0);

    setStats({ pending, approvedToday, revenueToday });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      alert("Incorrect password");
    }
  };

  const approvePayment = async (id: string, plan: string) => {
    let days = 1;
    if (plan === 'weekly') days = 7;
    if (plan === 'monthly') days = 30;

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    await supabase
      .from('payments')
      .update({
        status: 'approved',
        verified_at: new Date().toISOString(),
        expires_at: expiresAt
      })
      .eq('id', id);
  };

  const rejectPayment = async (id: string) => {
    const reason = prompt("Enter rejection reason (e.g. Invalid code, Wrong amount):");
    if (reason === null) return;

    await supabase
      .from('payments')
      .update({
        status: 'rejected',
        verified_at: new Date().toISOString(),
        rejection_reason: reason || 'Invalid transaction'
      })
      .eq('id', id);
  };

  const filteredPayments = payments.filter(p => {
    const matchesFilter = filter === 'all' || p.status === filter;
    const matchesSearch = p.transaction_code.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (p.phone_number && p.phone_number.includes(searchQuery));
    return matchesFilter && matchesSearch;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-brand-surface/20 border border-brand-surface/40 rounded-[2.5rem] p-8 text-center">
          <div className="w-16 h-16 bg-brand-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="text-brand-accent" size={32} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tighter mb-8">Admin Access</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              required
              placeholder="Enter Admin Password"
              className="w-full bg-brand-bg border border-brand-surface/60 rounded-2xl py-4 px-6 outline-none focus:border-brand-accent/50 transition-all text-center"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="submit"
              className="w-full bg-brand-accent text-white py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-accent/20"
            >
              Sign In to Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg p-6 lg:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-brand-accent/10 rounded-xl">
                <Shield className="text-brand-accent" size={20} />
              </div>
              <span className="font-black uppercase tracking-widest text-xs text-brand-accent">Admin Dashboard</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tighter">Payment Verification</h1>
          </div>

          <div className="flex gap-4">
            <div className="bg-brand-surface/20 border border-brand-surface/40 rounded-3xl p-4 flex items-center gap-4">
              <div className="p-3 bg-brand-accent/10 rounded-2xl">
                <TrendingUp className="text-brand-accent" size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Revenue Today</p>
                <p className="text-xl font-black tracking-tighter">KES {stats.revenueToday}</p>
              </div>
            </div>
            <div className="bg-brand-surface/20 border border-brand-surface/40 rounded-3xl p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-2xl">
                <Clock className="text-amber-500" size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Pending</p>
                <p className="text-xl font-black tracking-tighter">{stats.pending}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="bg-brand-surface/20 border border-brand-surface/40 rounded-[2.5rem] overflow-hidden">
          <div className="p-8 border-b border-brand-surface/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex bg-brand-bg p-1 rounded-2xl border border-brand-surface/60">
              {(['pending', 'approved', 'rejected', 'all'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all capitalize ${
                    filter === t ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'text-brand-text/40 hover:text-brand-text'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text/20" size={18} />
              <input
                type="text"
                placeholder="Search code or phone..."
                className="w-full bg-brand-bg border border-brand-surface/60 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-brand-accent/50 transition-all text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 border-b border-brand-surface/40">
                  <th className="px-8 py-4">Transaction Code</th>
                  <th className="px-8 py-4">Plan / Lesson</th>
                  <th className="px-8 py-4">Phone</th>
                  <th className="px-8 py-4">Amount</th>
                  <th className="px-8 py-4">Submitted</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-surface/40">
                <AnimatePresence mode="popLayout">
                  {filteredPayments.map((p) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group hover:bg-brand-surface/10 transition-colors"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold tracking-widest">{p.transaction_code}</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(p.transaction_code);
                              alert("Copied!");
                            }}
                            className="p-1.5 text-brand-text/20 hover:text-brand-accent transition-colors"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          p.plan === 'monthly' ? 'bg-indigo-500/10 text-indigo-500' : 
                          p.plan === 'weekly' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {p.plan}
                        </span>
                        {p.lesson_id && <p className="text-xs text-brand-text/40 mt-1">{p.lesson_id}</p>}
                      </td>
                      <td className="px-8 py-6 text-sm font-medium">
                        {p.phone_number || <span className="text-brand-text/20 italic">Not provided</span>}
                      </td>
                      <td className="px-8 py-6 font-bold">KES {p.amount}</td>
                      <td className="px-8 py-6 text-xs text-brand-text/40">
                        {new Date(p.submitted_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${
                          p.status === 'approved' ? 'text-emerald-500' : 
                          p.status === 'rejected' ? 'text-red-500' : 'text-amber-500'
                        }`}>
                          {p.status === 'approved' ? <CheckCircle2 size={12} /> : 
                           p.status === 'rejected' ? <XCircle size={12} /> : <Clock size={12} />}
                          {p.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {p.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => approvePayment(p.id, p.plan)}
                              className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500/20 transition-colors"
                              title="Approve"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                            <button
                              onClick={() => rejectPayment(p.id)}
                              className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors"
                              title="Reject"
                            >
                              <XCircle size={18} />
                            </button>
                          </div>
                        )}
                        {p.status === 'rejected' && (
                          <div className="flex items-center justify-end gap-2 text-red-500/40" title={p.rejection_reason}>
                            <AlertCircle size={18} />
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            {filteredPayments.length === 0 && (
              <div className="p-20 text-center">
                <p className="text-brand-text/40">No payments found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
