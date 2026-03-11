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
  Lock,
  Key,
  LogOut,
  Home,
  Plus,
  Edit,
  Trash2,
  FileText,
  LayoutDashboard,
  Database
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

interface Experiment {
  id: string | number;
  title: string;
  keywords: string;
  html_content: string;
  subject?: string;
}

export const AdminPayments: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'payments' | 'content'>('payments');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    pending: 0,
    approvedToday: 0,
    revenueToday: 0,
    totalRevenue: 0
  });

  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<Partial<Experiment> | null>(null);

  // Rejection state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Deletion state
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const ADMIN_PASSWORD = "azilearn-admin-2024"; // In real app, use env var

  useEffect(() => {
    if (isAuthenticated) {
      fetchPayments();
      fetchExperiments();
      
      const paymentsSub = supabase
        .channel('payments_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
          fetchPayments();
        })
        .subscribe();

      const experimentsSub = supabase
        .channel('experiments_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'experiments' }, () => {
          fetchExperiments();
        })
        .subscribe();

      return () => {
        paymentsSub.unsubscribe();
        experimentsSub.unsubscribe();
      };
    }
  }, [isAuthenticated]);

  const fetchExperiments = async () => {
    const { data } = await supabase.from('experiments').select('*').order('title');
    if (data) setExperiments(data);
  };

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
    const totalRevenue = data
      .filter(p => p.status === 'approved')
      .reduce((sum, p) => sum + p.amount, 0);

    setStats({ pending, approvedToday, revenueToday, totalRevenue });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    
    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      setLoginError("Incorrect admin password. Please try again.");
    }
    setIsLoggingIn(false);
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

  const rejectPayment = async (id: string, reason: string) => {
    await supabase
      .from('payments')
      .update({
        status: 'rejected',
        verified_at: new Date().toISOString(),
        rejection_reason: reason || 'Invalid transaction'
      })
      .eq('id', id);
    setRejectingId(null);
    setRejectionReason('');
  };

  const deleteExperiment = async (id: string | number) => {
    await supabase.from('experiments').delete().eq('id', id);
    setDeletingId(null);
    fetchExperiments();
  };

  const saveExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExp) return;

    if (editingExp.id) {
      await supabase.from('experiments').update(editingExp).eq('id', editingExp.id);
    } else {
      await supabase.from('experiments').insert([editingExp]);
    }
    
    setIsExpModalOpen(false);
    setEditingExp(null);
    fetchExperiments();
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
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
        <div className="w-full max-w-md">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-brand-text/40 hover:text-brand-accent transition-colors mb-8 mx-auto font-bold"
          >
            <Home size={18} />
            Back to Home
          </button>
          <div className="bg-brand-surface/20 border border-brand-surface/40 rounded-[2.5rem] p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-brand-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock className="text-brand-accent" size={32} />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tighter mb-8">Admin Access</h1>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter Admin Password"
                  className="w-full bg-brand-bg border border-brand-surface/60 rounded-2xl py-4 px-6 outline-none focus:border-brand-accent/50 transition-all text-center"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginError(null);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text/20 hover:text-brand-accent transition-colors"
                >
                  {showPassword ? <Lock size={18} /> : <Key size={18} />}
                </button>
              </div>

              {loginError && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-bold"
                >
                  <AlertCircle size={16} />
                  {loginError}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-brand-accent text-white py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-accent/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoggingIn ? <Loader2 className="animate-spin" size={20} /> : 'Sign In to Dashboard'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Sidebar / Top Nav */}
      <div className="max-w-7xl mx-auto p-6 lg:p-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-6">
            <button 
              onClick={onBack}
              className="p-3 bg-brand-surface/20 border border-brand-surface/40 rounded-2xl text-brand-text/60 hover:text-brand-accent transition-all"
            >
              <Home size={24} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-brand-accent/10 rounded-xl">
                  <Shield className="text-brand-accent" size={20} />
                </div>
                <span className="font-black uppercase tracking-widest text-xs text-brand-accent">Admin Dashboard</span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tighter">Management Console</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex gap-4">
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
                <div className="p-3 bg-indigo-500/10 rounded-2xl">
                  <TrendingUp className="text-indigo-500" size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Total Revenue</p>
                  <p className="text-xl font-black tracking-tighter">KES {stats.totalRevenue}</p>
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
            <button 
              onClick={handleLogout}
              className="p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-3xl hover:bg-red-500/20 transition-all"
              title="Logout"
            >
              <LogOut size={24} />
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-8 py-4 rounded-3xl font-bold transition-all ${
              activeTab === 'payments' 
                ? 'bg-brand-accent text-white shadow-xl shadow-brand-accent/20' 
                : 'bg-brand-surface/20 text-brand-text/40 hover:text-brand-text'
            }`}
          >
            <LayoutDashboard size={20} />
            Payments
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-2 px-8 py-4 rounded-3xl font-bold transition-all ${
              activeTab === 'content' 
                ? 'bg-brand-accent text-white shadow-xl shadow-brand-accent/20' 
                : 'bg-brand-surface/20 text-brand-text/40 hover:text-brand-text'
            }`}
          >
            <Database size={20} />
            Content
          </button>
        </div>

        {activeTab === 'payments' ? (
          <div className="bg-brand-surface/20 border border-brand-surface/40 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-brand-surface/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex bg-brand-bg p-1 rounded-2xl border border-brand-surface/60 overflow-x-auto">
                {(['pending', 'approved', 'rejected', 'all'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all capitalize whitespace-nowrap ${
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
                    <th className="px-8 py-4">Phone Number</th>
                    <th className="px-8 py-4">Plan / Lesson</th>
                    <th className="px-8 py-4">M-Pesa Code</th>
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
                            <span className="font-bold text-brand-accent">{p.phone_number}</span>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(p.phone_number);
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
                        <td className="px-8 py-6 text-sm font-mono opacity-60">
                          {p.transaction_code.startsWith('PHONE_') ? 'N/A' : p.transaction_code}
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
                                onClick={() => setRejectingId(p.id)}
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
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Experiments & Lessons</h2>
              <button 
                onClick={() => {
                  setEditingExp({ title: '', keywords: '', html_content: '', subject: '' });
                  setIsExpModalOpen(true);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-brand-accent text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-xl shadow-brand-accent/20"
              >
                <Plus size={20} />
                Add New Experiment
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {experiments.map((exp) => (
                <div key={exp.id} className="bg-brand-surface/20 border border-brand-surface/40 rounded-3xl p-6 hover:border-brand-accent/30 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-brand-accent/10 rounded-2xl">
                      <FileText className="text-brand-accent" size={24} />
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingExp(exp);
                          setIsExpModalOpen(true);
                        }}
                        className="p-2 bg-brand-surface/40 rounded-xl text-brand-text/60 hover:text-brand-accent transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => setDeletingId(exp.id)}
                        className="p-2 bg-brand-surface/40 rounded-xl text-brand-text/60 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-2 line-clamp-1">{exp.title}</h3>
                  <p className="text-xs text-brand-text/40 mb-4 line-clamp-2">{exp.keywords}</p>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-brand-surface/40 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-text/60">
                      {exp.subject || 'General'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rejection Modal */}
        <AnimatePresence>
          {rejectingId && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setRejectingId(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-brand-bg border border-brand-surface/40 rounded-[2.5rem] p-8 shadow-2xl"
              >
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <XCircle className="text-red-500" size={32} />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tighter mb-2 text-center">Reject Payment</h2>
                <p className="text-brand-text/60 mb-6 text-center">Provide a reason for rejecting this transaction.</p>
                
                <div className="space-y-4">
                  <input 
                    type="text"
                    placeholder="e.g. Invalid transaction code"
                    className="w-full bg-brand-surface/20 border border-brand-surface/40 rounded-2xl py-4 px-6 outline-none focus:border-brand-accent/50 transition-all"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setRejectingId(null)}
                      className="flex-1 py-4 rounded-2xl font-bold border border-brand-surface/40 hover:bg-brand-surface/10 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => rejectPayment(rejectingId, rejectionReason)}
                      className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Deletion Modal */}
        <AnimatePresence>
          {deletingId && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeletingId(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-brand-bg border border-brand-surface/40 rounded-[2.5rem] p-8 shadow-2xl"
              >
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="text-red-500" size={32} />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tighter mb-2 text-center">Delete Experiment?</h2>
                <p className="text-brand-text/60 mb-8 text-center">This action cannot be undone. Are you sure you want to delete this content?</p>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setDeletingId(null)}
                    className="flex-1 py-4 rounded-2xl font-bold border border-brand-surface/40 hover:bg-brand-surface/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => deleteExperiment(deletingId)}
                    className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isExpModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsExpModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-4xl bg-brand-bg border border-brand-surface/40 rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto shadow-2xl"
              >
                <h2 className="text-3xl font-extrabold tracking-tighter mb-8">
                  {editingExp?.id ? 'Edit Experiment' : 'New Experiment'}
                </h2>
                <form onSubmit={saveExperiment} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-brand-text/40">Title</label>
                      <input 
                        type="text"
                        required
                        className="w-full bg-brand-surface/20 border border-brand-surface/40 rounded-2xl py-4 px-6 outline-none focus:border-brand-accent/50 transition-all"
                        value={editingExp?.title || ''}
                        onChange={e => setEditingExp({...editingExp!, title: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-brand-text/40">Subject</label>
                      <input 
                        type="text"
                        className="w-full bg-brand-surface/20 border border-brand-surface/40 rounded-2xl py-4 px-6 outline-none focus:border-brand-accent/50 transition-all"
                        value={editingExp?.subject || ''}
                        onChange={e => setEditingExp({...editingExp!, subject: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-brand-text/40">Keywords (Comma separated)</label>
                    <input 
                      type="text"
                      className="w-full bg-brand-surface/20 border border-brand-surface/40 rounded-2xl py-4 px-6 outline-none focus:border-brand-accent/50 transition-all"
                      value={editingExp?.keywords || ''}
                      onChange={e => setEditingExp({...editingExp!, keywords: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-brand-text/40">HTML Content</label>
                    <textarea 
                      required
                      rows={12}
                      className="w-full bg-brand-surface/20 border border-brand-surface/40 rounded-2xl py-4 px-6 outline-none focus:border-brand-accent/50 transition-all font-mono text-sm"
                      value={editingExp?.html_content || ''}
                      onChange={e => setEditingExp({...editingExp!, html_content: e.target.value})}
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button 
                      type="submit"
                      className="flex-1 bg-brand-accent text-white py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-accent/20"
                    >
                      Save Experiment
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsExpModalOpen(false)}
                      className="px-8 bg-brand-surface/20 text-brand-text/60 py-4 rounded-2xl font-bold hover:bg-brand-surface/40 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
