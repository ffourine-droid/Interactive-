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
  Database,
  Image as ImageIcon,
  Music,
  User,
  WifiOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';

interface Payment {
  id: string;
  transaction_code: string;
  amount: number;
  plan: string;
  lesson_id: string;
  phone_number: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  verified_at: string;
  rejection_reason: string;
}

interface Experiment {
  id: string | number;
  title: string;
  keywords: string;
  html_content: string;
  subject?: string;
  grade?: string;
  category?: string;
  slides?: string[];
  audio_url?: string;
}

interface Profile {
  id: string;
  username: string;
  phone_number: string;
  created_at: string;
}

export const AdminPayments: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'payments' | 'content' | 'users'>('payments');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    pending: 0,
    approvedToday: 0,
    revenueToday: 0,
    totalRevenue: 0
  });

  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<Partial<Experiment> | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Rejection state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Deletion state
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const { showToast } = useToast();

  const ADMIN_PASSWORD = "azilearn-admin-2024"; // In real app, use env var

  useEffect(() => {
    if (isAuthenticated) {
      fetchPayments();
      fetchExperiments();
      fetchProfiles();
      
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
    try {
      const { data, error } = await supabase.from('experiments').select('*').order('title');
      if (error) throw error;
      if (data) setExperiments(data);
    } catch (err: any) {
      console.error('Error fetching experiments:', err);
      showToast('Failed to load experiments.', 'error');
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setProfiles(data);
    } catch (err: any) {
      console.error('Error fetching profiles:', err);
      showToast('Failed to load user profiles.', 'error');
    }
  };

  const fetchPayments = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setPayments(data);
        calculateStats(data);
      }
    } catch (err: any) {
      console.error('Fetch payments error:', err);
      alert('Failed to fetch payments: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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
    if (!navigator.onLine) {
      showToast("You are offline. Cannot approve payment.", "error");
      return;
    }

    try {
      let days = 1;
      if (plan === 'weekly') days = 7;
      if (plan === 'monthly') days = 30;

      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('payments')
        .update({
          status: 'approved',
          verified_at: new Date().toISOString(),
          expires_at: expiresAt
        })
        .eq('id', id);
      
      if (error) throw error;
      
      showToast("Payment approved successfully!", "success");
      fetchPayments();
    } catch (err: any) {
      console.error('Approval error:', err);
      showToast("Failed to approve payment: " + err.message, "error");
    }
  };

  const rejectPayment = async (id: string, reason: string) => {
    if (!navigator.onLine) {
      showToast("You are offline. Cannot reject payment.", "error");
      return;
    }

    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'rejected',
          verified_at: new Date().toISOString(),
          rejection_reason: reason || 'Invalid transaction'
        })
        .eq('id', id);
      
      if (error) throw error;
      
      showToast("Payment rejected.", "info");
      setRejectingId(null);
      setRejectionReason('');
      fetchPayments();
    } catch (err: any) {
      console.error('Rejection error:', err);
      showToast("Failed to reject payment: " + err.message, "error");
    }
  };

  const deleteExperiment = async (id: string | number) => {
    try {
      const { error } = await supabase.from('experiments').delete().eq('id', id);
      if (error) throw error;
      
      showToast("Experiment deleted.", "success");
      setDeletingId(null);
      fetchExperiments();
    } catch (err: any) {
      console.error('Delete error:', err);
      showToast("Failed to delete experiment: " + err.message, "error");
    }
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'slides' | 'audio') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const bucket = type === 'slides' ? 'slides' : 'audio';
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${fileName}`;

        console.log(`Uploading ${file.name} to ${bucket}...`);

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error details:', uploadError);
          throw new Error(`Upload failed for ${file.name}: ${uploadError.message}`);
        }

        const { data } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        if (data?.publicUrl) {
          uploadedUrls.push(data.publicUrl);
        }
      }

      if (type === 'slides') {
        setEditingExp(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            slides: [...(prev.slides || []), ...uploadedUrls]
          };
        });
      } else {
        setEditingExp(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            audio_url: uploadedUrls[0]
          };
        });
      }
      
      console.log('Upload successful:', uploadedUrls);
      showToast(`${type === 'slides' ? 'Slides' : 'Audio'} uploaded successfully!`, "success");
    } catch (err: any) {
      console.error('File upload error:', err);
      showToast('Upload failed: ' + err.message, "error");
    } finally {
      setIsUploading(false);
      // Clear the input so the same file can be selected again
      e.target.value = '';
    }
  };

  const removeSlide = (index: number) => {
    setEditingExp(prev => ({
      ...prev!,
      slides: prev?.slides?.filter((_, i) => i !== index)
    }));
  };

  const saveExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExp) return;

    try {
      if (editingExp.id) {
        const { error } = await supabase.from('experiments').update(editingExp).eq('id', editingExp.id);
        if (error) throw error;
        showToast("Experiment updated successfully!", "success");
      } else {
        const { error } = await supabase.from('experiments').insert([editingExp]);
        if (error) throw error;
        showToast("New experiment created!", "success");
      }
      
      setIsExpModalOpen(false);
      setEditingExp(null);
      fetchExperiments();
    } catch (err: any) {
      console.error('Save error:', err);
      showToast("Failed to save experiment: " + err.message, "error");
    }
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
          <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-brand-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock className="text-brand-accent" size={32} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-8">Admin Access</h1>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter Admin Password"
                  className="w-full bg-brand-bg border border-brand-border rounded-2xl py-4 px-6 outline-none focus:border-brand-accent/50 transition-all text-center font-bold"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginError(null);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-accent transition-colors"
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
                className="w-full bg-brand-accent text-white py-4 rounded-2xl font-bold hover:opacity-90 active:scale-95 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
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
              className="p-3 bg-brand-surface border border-brand-border rounded-2xl text-brand-muted hover:text-brand-accent transition-all shadow-sm"
            >
              <Home size={24} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-brand-accent/10 rounded-xl">
                  <Shield className="text-brand-accent" size={20} />
                </div>
                <span className="font-bold uppercase tracking-widest text-[10px] text-brand-accent">Admin Dashboard</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Management Console</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex gap-4">
              <div className="bg-brand-surface border border-brand-border rounded-3xl p-4 flex items-center gap-4 shadow-sm">
                <div className="p-3 bg-brand-accent/10 rounded-2xl">
                  <TrendingUp className="text-brand-accent" size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Revenue Today</p>
                  <p className="text-xl font-bold tracking-tight">KES {stats.revenueToday}</p>
                </div>
              </div>
              <div className="bg-brand-surface border border-brand-border rounded-3xl p-4 flex items-center gap-4 shadow-sm">
                <div className="p-3 bg-indigo-500/10 rounded-2xl">
                  <TrendingUp className="text-indigo-500" size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Total Revenue</p>
                  <p className="text-xl font-bold tracking-tight">KES {stats.totalRevenue}</p>
                </div>
              </div>
              <div className="bg-brand-surface border border-brand-border rounded-3xl p-4 flex items-center gap-4 shadow-sm">
                <div className="p-3 bg-amber-500/10 rounded-2xl">
                  <Clock className="text-amber-500" size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Pending</p>
                  <p className="text-xl font-bold tracking-tight">{stats.pending}</p>
                </div>
              </div>
              <button 
                onClick={() => fetchPayments(true)}
                disabled={refreshing}
                className="p-4 bg-brand-surface border border-brand-border rounded-3xl hover:bg-brand-bg transition-all disabled:opacity-50 shadow-sm"
                title="Refresh Data"
              >
                <Database className={`${refreshing ? 'animate-spin' : ''}`} size={24} />
              </button>
            </div>
            <button 
              onClick={handleLogout}
              className="p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-3xl hover:bg-red-500/20 transition-all shadow-sm"
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
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-8 py-4 rounded-3xl font-bold transition-all ${
              activeTab === 'users' 
                ? 'bg-brand-accent text-white shadow-xl shadow-brand-accent/20' 
                : 'bg-brand-surface/20 text-brand-text/40 hover:text-brand-text'
            }`}
          >
            <User size={20} />
            Users
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
                  placeholder="Search phone number..."
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
                        <td className="px-8 py-6 font-bold">KES {p.amount}</td>
                        <td className="px-8 py-6 text-xs text-brand-text/40">
                          {new Date(p.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}
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
        ) : activeTab === 'users' ? (
          <div className="bg-brand-surface/20 border border-brand-surface/40 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-brand-surface/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <h2 className="text-2xl font-bold">User Profiles</h2>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text/20" size={18} />
                <input
                  type="text"
                  placeholder="Search users by name or phone..."
                  className="w-full bg-brand-bg border border-brand-surface/60 rounded-2xl py-3 pl-12 pr-6 outline-none focus:border-brand-accent/50 transition-all text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-surface/10">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-brand-text/40">Username</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-brand-text/40">Phone Number</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-brand-text/40">Joined Date</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-brand-text/40">Total Payments</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-brand-text/40 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-surface/40">
                  {profiles
                    .filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()) || u.phone_number.includes(searchQuery))
                    .map((user) => {
                      const userPayments = payments.filter(p => p.phone_number === user.phone_number);
                      return (
                        <tr key={user.id} className="hover:bg-brand-surface/10 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center text-brand-accent font-black">
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold">{user.username}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 font-mono text-sm">{user.phone_number}</td>
                          <td className="px-8 py-6 text-sm text-brand-text/60">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-8 py-6">
                            <span className="px-3 py-1 bg-brand-surface/40 rounded-lg text-xs font-bold">
                              {userPayments.length} Payments
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="px-4 py-2 bg-brand-accent/10 text-brand-accent rounded-xl text-xs font-bold hover:bg-brand-accent/20 transition-all"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Experiments & Lessons</h2>
              <button 
                onClick={() => {
                  setEditingExp({ title: '', keywords: '', html_content: '', subject: '', grade: '', category: 'notes' });
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 bg-brand-surface/40 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-text/60">
                      {exp.subject || 'General'}
                    </span>
                    {exp.grade && (
                      <span className="px-3 py-1 bg-brand-accent/10 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-accent">
                        {exp.grade}
                      </span>
                    )}
                    {exp.category && (
                      <span className="px-3 py-1 bg-indigo-500/10 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-500">
                        {exp.category}
                      </span>
                    )}
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
        {/* Modals */}
        <AnimatePresence>
          {selectedUser && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedUser(null)}
                className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl bg-brand-bg border border-brand-surface/40 rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8 border-b border-brand-surface/40 bg-brand-surface/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-accent rounded-2xl flex items-center justify-center text-white text-xl font-black">
                      {selectedUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tighter">{selectedUser.username}</h2>
                      <p className="text-xs font-bold text-brand-text/40 uppercase tracking-widest">{selectedUser.phone_number}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedUser(null)}
                    className="p-2 hover:bg-brand-surface/20 rounded-xl transition-colors"
                  >
                    <XCircle size={24} className="text-brand-text/40" />
                  </button>
                </div>

                <div className="p-8 max-h-[60vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 bg-brand-surface/10 rounded-2xl border border-brand-surface/20">
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 mb-1">Joined Date</p>
                      <p className="font-bold">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="p-4 bg-brand-surface/10 rounded-2xl border border-brand-surface/20">
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 mb-1">Total Spent</p>
                      <p className="font-bold">KES {payments.filter(p => p.phone_number === selectedUser.phone_number && p.status === 'approved').reduce((acc, p) => acc + p.amount, 0)}</p>
                    </div>
                  </div>

                  <h3 className="text-xs font-black uppercase tracking-widest text-brand-text/40 mb-4">Payment History</h3>
                  <div className="space-y-3">
                    {payments
                      .filter(p => p.phone_number === selectedUser.phone_number)
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((p) => (
                        <div key={p.id} className="p-4 bg-brand-surface/5 border border-brand-surface/20 rounded-2xl flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-bold">{p.transaction_code}</span>
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                p.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                                'bg-amber-500/10 text-amber-500'
                              }`}>
                                {p.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-brand-text/40 font-bold">
                              {new Date(p.created_at).toLocaleString()} • {p.plan} plan
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-black">KES {p.amount}</p>
                          </div>
                        </div>
                      ))}
                    {payments.filter(p => p.phone_number === selectedUser.phone_number).length === 0 && (
                      <div className="py-8 text-center bg-brand-surface/5 rounded-2xl border border-dashed border-brand-surface/40">
                        <p className="text-xs font-bold text-brand-text/40">No payment history found.</p>
                      </div>
                    )}
                  </div>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-brand-text/40">Grade / Form</label>
                      <select 
                        className="w-full bg-brand-surface/20 border border-brand-surface/40 rounded-2xl py-4 px-6 outline-none focus:border-brand-accent/50 transition-all appearance-none"
                        value={editingExp?.grade || ''}
                        onChange={e => setEditingExp({...editingExp!, grade: e.target.value})}
                      >
                        <option value="">Select Class</option>
                        {[...Array(12)].map((_, i) => (
                          <option key={i} value={`Grade ${i + 1}`}>Grade {i + 1}</option>
                        ))}
                        {[...Array(4)].map((_, i) => (
                          <option key={i} value={`Form ${i + 1}`}>Form {i + 1}</option>
                        ))}
                        <option value="KCSE">KCSE Revision</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-brand-text/40">Category</label>
                      <select 
                        className="w-full bg-brand-surface/20 border border-brand-surface/40 rounded-2xl py-4 px-6 outline-none focus:border-brand-accent/50 transition-all appearance-none"
                        value={editingExp?.category || 'notes'}
                        onChange={e => setEditingExp({...editingExp!, category: e.target.value})}
                      >
                        <option value="notes">Notes</option>
                        <option value="slides">Slides</option>
                        <option value="audio">Audio</option>
                      </select>
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
                    <label className="text-xs font-black uppercase tracking-widest text-brand-text/40">HTML Content (Optional if using slides)</label>
                    <textarea 
                      rows={8}
                      className="w-full bg-brand-surface/20 border border-brand-surface/40 rounded-2xl py-4 px-6 outline-none focus:border-brand-accent/50 transition-all font-mono text-sm"
                      value={editingExp?.html_content || ''}
                      onChange={e => setEditingExp({...editingExp!, html_content: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-xs font-black uppercase tracking-widest text-brand-text/40">Instagram-style Slides</label>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {editingExp?.slides?.map((url, idx) => (
                          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group">
                            <img src={url} alt={`Slide ${idx}`} className="w-full h-full object-cover" loading="lazy" />
                            <button 
                              type="button"
                              onClick={() => removeSlide(idx)}
                              className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        ))}
                        <label className="aspect-square rounded-xl border-2 border-dashed border-brand-surface/60 flex flex-col items-center justify-center cursor-pointer hover:border-brand-accent/50 transition-colors">
                          <Plus size={24} className="text-brand-text/20" />
                          <span className="text-[10px] font-bold text-brand-text/40 mt-1">Add Slide</span>
                          <input 
                            type="file" 
                            multiple 
                            accept="image/*" 
                            className="hidden" 
                            onChange={e => handleFileUpload(e, 'slides')}
                            disabled={isUploading}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs font-black uppercase tracking-widest text-brand-text/40">Audio Background</label>
                      {editingExp?.audio_url ? (
                        <div className="p-4 bg-brand-surface/20 rounded-2xl border border-brand-surface/40 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-brand-accent/10 rounded-xl">
                              <Music size={20} className="text-brand-accent" />
                            </div>
                            <span className="text-xs font-bold truncate max-w-[150px]">Audio Uploaded</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setEditingExp(prev => ({ ...prev!, audio_url: undefined }))}
                            className="text-red-500 hover:text-red-600 p-2"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ) : (
                        <label className="w-full py-8 rounded-2xl border-2 border-dashed border-brand-surface/60 flex flex-col items-center justify-center cursor-pointer hover:border-brand-accent/50 transition-colors">
                          <Plus size={24} className="text-brand-text/20" />
                          <span className="text-[10px] font-bold text-brand-text/40 mt-1">Upload Audio</span>
                          <input 
                            type="file" 
                            accept="audio/*" 
                            className="hidden" 
                            onChange={e => handleFileUpload(e, 'audio')}
                            disabled={isUploading}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {isUploading && (
                    <div className="flex items-center gap-3 text-brand-accent animate-pulse">
                      <Loader2 className="animate-spin" size={20} />
                      <span className="text-xs font-bold uppercase tracking-widest">Uploading assets...</span>
                    </div>
                  )}
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
