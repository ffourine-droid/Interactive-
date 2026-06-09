import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Shield, FileText, ChevronUp, ExternalLink, Mail, Globe, 
  MapPin, CheckCircle2, AlertCircle, Calendar, Sparkles, BookOpen, Clock
} from 'lucide-react';

interface LegalPageProps {
  initialTab?: 'terms' | 'privacy';
  onBack: () => void;
}

export default function LegalPage({ initialTab = 'terms', onBack }: LegalPageProps) {
  const [activeTab, setActiveTab ] = useState<'terms' | 'privacy'>(initialTab);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Sync state with prop if it changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text transition-colors duration-300 pb-24 relative select-none">
      
      {/* HEADER BAR */}
      <header className="sticky top-0 z-50 bg-brand-surface/90 backdrop-blur-md border-b border-brand-border/60 px-4 py-4 shrink-0">
        <div className="max-w-[720px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-2xl border border-brand-border flex items-center justify-center hover:bg-brand-surface/80 active:scale-95 transition-all text-brand-text"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-sans font-black text-xl tracking-tight text-brand-text select-none">
                  Azi<span className="text-[#FF6B2C]">Learn</span>
                </span>
                <span className="px-2 py-0.5 text-[8px] font-black tracking-widest uppercase bg-[#FF6B2C]/10 text-[#FF6B2C] border border-[#FF6B2C]/20 rounded-full">
                  Legal
                </span>
              </div>
              <p className="text-[10px] text-brand-muted font-bold mt-0.5 uppercase tracking-wider">Compliance & Agreements</p>
            </div>
          </div>
          <button 
            onClick={onBack}
            className="text-xs font-black uppercase tracking-widest text-brand-muted hover:text-brand-text transition-colors"
          >
            Exit
          </button>
        </div>
      </header>

      <div className="max-w-[720px] mx-auto px-4 pt-6 space-y-6">
        
        {/* TAB TOGGLER */}
        <div className="flex bg-brand-surface border border-brand-border p-1 rounded-2xl">
          <button
            onClick={() => { setActiveTab('terms'); scrollToTop(); }}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'terms' 
                ? 'bg-[#FF6B2C]/15 border-l-2 border-r-2 border-[#FF6B2C]/20 text-[#FF6B2C] font-bold shadow-sm'
                : 'text-brand-muted hover:text-brand-text'
            }`}
          >
            <FileText size={14} />
            Terms of Use
          </button>
          <button
            onClick={() => { setActiveTab('privacy'); scrollToTop(); }}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'privacy' 
                ? 'bg-[#FF6B2C]/15 border-l-2 border-r-2 border-[#FF6B2C]/20 text-[#FF6B2C] font-bold shadow-sm'
                : 'text-brand-muted hover:text-brand-text'
            }`}
          >
            <Shield size={14} />
            Privacy Policy
          </button>
        </div>

        {/* HERO DOC HEADERS */}
        <AnimatePresence mode="wait">
          {activeTab === 'terms' ? (
            <motion.div 
              key="terms-header"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 text-center space-y-3 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF6B2C]/5 rounded-bl-[4rem] pointer-events-none" />
              <div className="w-12 h-12 rounded-2xl bg-[#FF6B2C]/10 text-[#FF6B2C] flex items-center justify-center mx-auto shadow-sm">
                <FileText size={24} />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-black text-brand-text tracking-tight uppercase">Terms of Use</h1>
                <p className="text-brand-muted text-[13px] font-medium max-w-md mx-auto leading-relaxed">
                  Please read these Terms carefully before accessing or using the AziLearn classroom and gaming forums.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF6B2C]/10 text-[#FF6B2C] border border-[#FF6B2C]/15 rounded-full text-[10px] font-extrabold uppercase tracking-widest">
                <Calendar size={12} />
                Effective Date: June 2025
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="privacy-header"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 text-center space-y-3 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF6B2C]/5 rounded-bl-[4rem] pointer-events-none" />
              <div className="w-12 h-12 rounded-2xl bg-[#FF6B2C]/10 text-[#FF6B2C] flex items-center justify-center mx-auto shadow-sm">
                <Shield size={24} />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-black text-brand-text tracking-tight uppercase">Privacy Policy</h1>
                <p className="text-brand-muted text-[13px] font-medium max-w-md mx-auto leading-relaxed">
                  How we process, protect, and respect student and teacher records under the laws of Kenya.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF6B2C]/10 text-[#FF6B2C] border border-[#FF6B2C]/15 rounded-full text-[10px] font-extrabold uppercase tracking-widest">
                <CheckCircle2 size={12} />
                Compliant with Kenya DPA 2019
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LEGAL WORDINGS BODY */}
        <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 md:p-8 shadow-sm text-brand-text font-sans">
          <AnimatePresence mode="wait">
            {activeTab === 'terms' ? (
              <motion.div
                key="terms-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6 text-sm leading-relaxed"
              >
                {/* Notice Box */}
                <div className="bg-[#FF6B2C]/5 border-l-4 border-[#FF6B2C] rounded-2xl p-4 flex gap-3 items-start select-text">
                  <AlertCircle size={18} className="text-[#FF6B2C] shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-brand-text block mb-1">Attention Parents & Guardians:</strong>
                    AziLearn is designed for students in Grades 1–12. If you are under 18, you may only use this platform with direct parental or guardian supervision. By continuing access, parents agree to these Terms on behalf of their child.
                  </div>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">1.</span> Who We Are
                  </h2>
                  <p className="text-[13px] text-brand-muted">
                    AziLearn is a local Competency-Based Curriculum (CBC) and KCSE educational revision platform designed exclusively for Kenyan students in Grades 1–12. The platform is currently in Early Access, operated securely from Kenya and globally accessible at <strong className="text-brand-text">azilearn.vercel.app</strong>.
                  </p>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">2.</span> Acceptance of Terms
                  </h2>
                  <p className="text-[13px] text-brand-muted">
                    By accessing or continuing to interact with AziLearn as a student, class teacher, parent, or super-admin, you explicitly declare your receipt of and absolute agreement to these Terms. Minors under 18 must receive direct guardian permission prior to starting interactive activities. Teachers confirm they have necessary administrative authority from their school administration to subscribe students to classroom structures.
                  </p>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">3.</span> Platform Access & Accounts
                  </h2>
                  <div className="space-y-3">
                    <div className="p-3.5 bg-brand-bg rounded-xl border border-brand-border">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#FF6B2C] mb-1">Students</h3>
                      <ul className="list-disc pl-5 text-xs text-brand-muted space-y-1.5">
                        <li>Access using a safe username assigned by their school class teacher</li>
                        <li>Must safeguard credentials and never access via other classmate identities</li>
                        <li>May choose Guest Mode access (temporary offline/session states that can be periodically cleared)</li>
                      </ul>
                    </div>

                    <div className="p-3.5 bg-brand-bg rounded-xl border border-brand-border">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#FF6B2C] mb-1">Teachers</h3>
                      <ul className="list-disc pl-5 text-xs text-brand-muted space-y-1.5">
                        <li>Must authenticate using TS-aligned details, school identity, and secure PIN</li>
                        <li>Retain complete responsibility and oversight of all notes/assignments generated in their classrooms</li>
                        <li>Are strictly forbidden from issuing duplicate keys or improper off-topic bulletin comments</li>
                        <li>Are reminded that credentials are registered on an individual basis and are strictly non-transferable</li>
                      </ul>
                    </div>

                    <div className="p-3.5 bg-brand-bg rounded-xl border border-brand-border">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#FF6B2C] mb-1">Parents & Guardians</h3>
                      <ul className="list-disc pl-5 text-xs text-brand-muted space-y-1.5">
                        <li>Access the parent board using their child's unique 4-digit numeric parent code</li>
                        <li>Provide helpful, read-only analytics oversight (are blocked from altering any test attempts or assignment scores directly)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">4.</span> Permitted Use
                  </h2>
                  <p className="text-[13px] text-brand-muted">
                    AziLearn is offered exclusively for legitimate, lawful, national-curriculum focused educational purposes: browsing revision notes, taking teacher assignment booklets, taking timed mock exams under correct classroom codes, joining Arena challenges, or monitoring academic progress streams.
                  </p>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">5.</span> Prohibited Conduct
                  </h2>
                  <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 space-y-2 text-xs text-brand-muted">
                    <p className="font-extrabold text-red-500 uppercase tracking-widest text-[10px]">Strict Prohibition & Account Suspension Warnings:</p>
                    <ul className="list-disc pl-4 space-y-1.5">
                      <li>Never copy, leak, swap, or publish teacher exam sheets or questions</li>
                      <li>Never upload hostile, profane, or inappropriate forum attachments/comments</li>
                      <li>Never scrape notes or images to redistribute/mirror on auxiliary platforms</li>
                      <li>Never configure automate scripts or cronjobs to spoof XP gain, leaderboards, or scoreboards</li>
                      <li>Never attempt SQL injections or bypass supabase row-level authentication rules</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">6.</span> Content Ownership
                  </h2>
                  <p className="text-[13px] text-brand-muted">
                    All core learning resources (the pre-built interactive syllabus containing a 412+ question database, story themes, character designs, and illustrations) is proprietary property owned explicitly by AziLearn. You retain ownership of user-created quizzes or class posts but grant us an irrevocable, royalty-free license to display, index, and securely host these materials as necessary.
                  </p>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">7.</span> Timed Exams & Academic Integrity
                  </h2>
                  <p className="text-[13px] text-brand-muted">
                    To maintain strict classroom standards, the platform logs detailed timestamp data for student exam attempts, including whether and when answers are modified or locked. If submissions are made outside of the predetermined exam timer, those responses will be formally flagged as <code className="bg-brand-bg px-1 rounded">has_overtime</code> which teaches can disqualify at their complete discretion.
                  </p>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">8.</span> Free Service & Premium Features
                  </h2>
                  <p className="text-[13px] text-brand-muted">
                    AziLearn is currently in its Early Access phase, meaning basic study modules and exams are accessible free of charge. We plan to introduce optional paid subscription packages and advanced teacher helper metrics in the future. Any pricing changes will be explicitly and transparently highlighted across the application prior to implementation.
                  </p>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">9.</span> Disclaimer of Warranties
                  </h2>
                  <p className="text-[13px] text-brand-muted">
                    AziLearn is provided exclusively "as is" and "as available". We do not guarantee 100% uptime, nor do we claim mathematical proofs of immunity against client-side internet fluctuations. You are strongly advised to keep stable wifi connections while loading assignment submissions.
                  </p>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">10.</span> Limitation of Liability
                  </h2>
                  <p className="text-[13px] text-brand-muted">
                    To the maximum legal degree permitted by the Constitution of Kenya and the Law of Contract, AziLearn (including its administrators and content creators) will never be held liable for indirect, minor, or incidental setbacks — including loss of XP levels, leaderboard positions, mock test scores, or database downtime.
                  </p>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">11.</span> Termination
                  </h2>
                  <p className="text-[13px] text-brand-muted">
                    We reserve the sole and undisputed authority to freeze, lock, or fully terminate access profiles representing any teacher, student, or guardian who behaves disruptively or violates classroom integrity directives.
                  </p>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">12.</span> Changes to These Terms
                  </h2>
                  <p className="text-[13px] text-brand-muted">
                    AziLearn may periodically revise these Terms as we release new multiplayer revision features. Continuing to login and study following updates constitutes an automatic, informed acknowledgment of terms updates.
                  </p>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">13.</span> Governing Law
                  </h2>
                  <p className="text-[13px] text-brand-muted">
                    These Terms are governed and interpreted strictly in accordance with the Laws of the Republic of Kenya.
                  </p>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">14.</span> Contact & Feedback
                  </h2>
                  <div className="p-4 bg-brand-bg border border-brand-border rounded-2xl flex flex-col gap-3">
                    <p className="text-xs text-brand-muted">
                      For school portal inquiries, syllabus bugs, or commercial license discussions, please write to us directly:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                      <a href="mailto:support@azilearn.co.ke" className="flex items-center gap-2.5 p-3 bg-brand-surface rounded-xl border border-brand-border hover:border-[#FF6B2C] group transition-all">
                        <Mail size={16} className="text-[#FF6B2C]" />
                        <div className="text-left">
                          <p className="text-[10px] text-brand-muted font-bold block uppercase tracking-wider leading-none">Email Support</p>
                          <span className="text-xs font-semibold text-brand-text group-hover:text-[#FF6B2C]">support@azilearn.co.ke</span>
                        </div>
                      </a>
                      <div className="flex items-center gap-2.5 p-3 bg-brand-surface rounded-xl border border-brand-border">
                        <Globe size={16} className="text-[#FF6B2C]" />
                        <div className="text-left">
                          <p className="text-[10px] text-brand-muted font-bold block uppercase tracking-wider leading-none">Main Hub</p>
                          <span className="text-xs font-semibold text-brand-text">azilearn.vercel.app</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Swap To Privacy link inside content */}
                <div className="border-t border-brand-border pt-6 text-center select-none">
                  <p className="text-xs text-brand-muted">
                    Want to understand how we secure your data?{' '}
                    <button 
                      onClick={() => { setActiveTab('privacy'); scrollToTop(); }}
                      className="text-[#FF6B2C] font-black uppercase tracking-widest text-[10px] hover:underline"
                    >
                      Read our Privacy Policy &rarr;
                    </button>
                  </p>
                </div>

              </motion.div>
            ) : (
              <motion.div
                key="privacy-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6 text-sm leading-relaxed"
              >
                {/* Summary Box */}
                <div className="bg-emerald-500/5 border-l-4 border-emerald-500 rounded-2xl p-4 flex gap-3 items-start select-text">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-brand-text block mb-1">Our Core Commitment:</strong>
                    AziLearn collects only the absolute baseline data required to track educational progress, calculate badges, and enable teacher review. We do not incorporate public advertising networks and will <strong className="text-brand-text">never</strong> sell private records.
                  </div>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">1.</span> Who This Applies To
                  </h2>
                  <p className="text-[13px] text-brand-muted">
                    This Privacy Policy details how we aggregate and secure records for students (including minors under 18), parents, class instructors, and system administrators navigating our platform in accordance with the <strong className="text-brand-text">Kenya Data Protection Act 2019</strong>.
                  </p>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">2.</span> Data We Collect
                  </h2>
                  
                  <div className="space-y-4">
                    <p className="text-[13px] text-brand-muted">
                      To track learning cycles, we maintain specific data collections mapping directly to standard platform categories:
                    </p>

                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-[#FF6B2C] mb-2 font-display">Student Records Table</h3>
                      <div className="overflow-x-auto rounded-2xl border border-brand-border bg-brand-bg">
                        <table className="w-full text-left text-xs text-brand-muted border-collapse">
                          <thead>
                            <tr className="bg-brand-surface border-b border-brand-border">
                              <th className="p-3 font-black text-brand-text uppercase tracking-widest text-[9px]">Data field</th>
                              <th className="p-3 font-black text-brand-text uppercase tracking-widest text-[9px]">Justification / Mapping</th>
                              <th className="p-3 font-black text-brand-text uppercase tracking-widest text-[9px]">DB Target</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-brand-border/40">
                            <tr>
                              <td className="p-3 font-bold text-brand-text">Full Name</td>
                              <td className="p-3">Identifies students on Class Rosters</td>
                              <td className="p-3 font-mono text-[10px]">`students`</td>
                            </tr>
                            <tr>
                              <td className="p-3 font-bold text-brand-text">Username</td>
                              <td className="p-3">Powers gamified Arena levels and login credentials</td>
                              <td className="p-3 font-mono text-[10px]">`students`</td>
                            </tr>
                            <tr>
                              <td className="p-3 font-bold text-brand-text font-sans">Grade / School</td>
                              <td className="p-3">Renders appropriate CBC materials (Grades 1-12)</td>
                              <td className="p-3 font-mono text-[10px]">`students`</td>
                            </tr>
                            <tr>
                              <td className="p-3 font-bold text-brand-text">Test Submissions</td>
                              <td className="p-3">Tracks assessment correct answers and timestamps</td>
                              <td className="p-3 font-mono text-[10px]">`assignment_submissions`</td>
                            </tr>
                            <tr>
                              <td className="p-3 font-bold text-brand-text">Device ID</td>
                              <td className="p-3">Maintains guest sessions state without accounts</td>
                              <td className="p-3 font-mono text-[10px]">`students` / Local Storage</td>
                            </tr>
                            <tr>
                              <td className="p-3 font-bold text-brand-text">Parent Code</td>
                              <td className="p-3">Securely bounds parent dashboard views securely</td>
                              <td className="p-3 font-mono text-[10px]">`students`</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-[#FF6B2C] mb-2 font-display">Teacher Records Table</h3>
                      <div className="overflow-x-auto rounded-2xl border border-brand-border bg-brand-bg">
                        <table className="w-full text-left text-xs text-brand-muted border-collapse">
                          <thead>
                            <tr className="bg-brand-surface border-b border-brand-border">
                              <th className="p-3 font-black text-brand-text uppercase tracking-widest text-[9px]">Collected Record</th>
                              <th className="p-3 font-black text-brand-text uppercase tracking-widest text-[9px]">Processing Objective</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-brand-border/40">
                            <tr>
                              <td className="p-3 font-bold text-brand-text">Teacher Name & School</td>
                              <td className="p-3">Identifies class instructors to students joining from school list</td>
                            </tr>
                            <tr>
                              <td className="p-3 font-bold text-brand-text">Secure PIN (Hashed)</td>
                              <td className="p-3">Authenticates class management and test generation views</td>
                            </tr>
                            <tr>
                              <td className="p-3 font-bold text-brand-text">Created Assignments</td>
                              <td className="p-3">Saves curricular question banks, custom tests, or speed duel sets</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <p className="text-xs text-brand-muted leading-relaxed">
                      Parents are not asked to provide personal identifiers (such as emails or numbers). Verification is completed solely by matching the student's unique 4-digit code.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">3.</span> How We Use Your Data
                  </h2>
                  <p className="text-[13px] text-brand-muted">
                    We process recorded profiles to activate critical educational loops: enabling curriculum content filters, allowing school teachers to score mock attempts, calculating daily streak awards or XP progress, maintaining exam logging, or tracking anonymous speed round analytics.
                  </p>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">4.</span> Data Storage & Security
                  </h2>
                  <p className="text-[13px] text-brand-muted">
                    All student profiles are hosted within EU-based GDPR-compliant data warehouses operated by <strong className="text-brand-text">Supabase (PostgreSQL)</strong>. Security precautions include:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-brand-muted space-y-1.5">
                    <li><strong className="text-brand-text">Row-Level Security (RLS)</strong> constraints that isolate classroom tables completely</li>
                    <li>End-to-end transport layer encryptions (HTTPS / SSL configurations)</li>
                    <li>Unpredictable unique identifiers (UUIDs) avoiding sequential scraping</li>
                    <li>Secure password-hashing techniques securing pin keys</li>
                  </ul>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">5.</span> Children's Data (Minors under 18)
                  </h2>
                  <p className="text-[13px] text-brand-muted leading-relaxed">
                    Under the <strong className="text-brand-text">Kenya Data Protection Act (Section 31)</strong>, consent must be structured prior to processing minor records. Because students are registered directly by teachers inside designated classrooms, the register-confirming teacher acts as the representative, declaring that parental authorization has been logged by the school prior to creating student ids.
                  </p>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">6.</span> Data Sharing Limits
                  </h2>
                  <p className="text-[13px] text-brand-muted">
                    AziLearn never swaps, leaks, trades, or sells records to third-party marketing companies. Records are shared only for school objectives: sharing submissions with verified educators, rendering children's grades to verified guardians via parent codes, or provisioning data processing via host structures like Supabase or Vercel container pipelines.
                  </p>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">7.</span> Data Retention Rules
                  </h2>
                  <div className="overflow-x-auto rounded-2xl border border-brand-border bg-brand-bg">
                    <table className="w-full text-left text-xs text-brand-muted border-collapse">
                      <thead>
                        <tr className="bg-brand-surface border-b border-brand-border">
                          <th className="p-3 font-black text-brand-text uppercase tracking-widest text-[9px]">Record Type</th>
                          <th className="p-3 font-black text-brand-text uppercase tracking-widest text-[9px]">Retention Timeline</th>
                          <th className="p-3 font-black text-brand-text uppercase tracking-widest text-[9px]">Deletion triggers</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border/40">
                        <tr>
                          <td className="p-3 font-bold text-brand-text">Classroom Records</td>
                          <td className="p-3">Duration of the Academic Grade cycle</td>
                          <td className="p-3">Deleted instantly upon Teacher request</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-brand-text">Exam attempt Logs</td>
                          <td className="p-3">Stored until graded/assessed by teacher</td>
                          <td className="p-3">Cleared when school team requests deletion</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-brand-text">Anonymous Analytics</td>
                          <td className="p-3">90 Days only</td>
                          <td className="p-3">Cleared automatically by server cron timers</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">8.</span> Your Rights (Kenya DPA 2019)
                  </h2>
                  <p className="text-[13px] text-brand-muted">
                    As a protected data citizen of the Republic of Kenya, you hold complete rights to query stored records, modify typing inaccuracies, direct the erasure of student records, object to ongoing logs, or request porting parameters. We will address DPA queries within 21 days of receipt.
                  </p>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">9.</span> Cookies & Tracking
                  </h2>
                  <p className="text-[13px] text-brand-muted">
                    We do not track you using cross-site commercial cookie profiles. Local browser storage is used strictly to cache student profile names, theme parameters, or local quiz states so that pupils can resume operations if they lose internet connections in remote areas.
                  </p>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">10.</span> Changes to This Policy
                  </h2>
                  <p className="text-[13px] text-brand-muted font-sans">
                    AziLearn may refresh privacy rules as we adopt new school features. Material adjustments will be flagged clearly inside student news bulletins.
                  </p>
                </div>

                <div className="space-y-4 select-text">
                  <h2 className="text-base font-black uppercase tracking-wider text-brand-text border-b border-brand-border pb-2 flex items-center gap-2 mt-4">
                    <span className="text-brand-accent min-w-[20px]">11.</span> Compliance Contact & Data Controller
                  </h2>
                  <div className="p-4 bg-brand-bg rounded-2xl border border-brand-border space-y-3 text-xs text-brand-muted">
                    <p>
                      The official designated Data Controller representing corporate systems is <strong className="text-brand-text">AziLearn (Kenya)</strong>. If you feel compliance issues require formal oversight, contact us directly:
                    </p>
                    <div className="flex items-center gap-2 px-3 py-2 bg-brand-surface border border-brand-border rounded-xl">
                      <Mail size={14} className="text-[#FF6B2C]" />
                      <span>Email: <a href="mailto:privacy@azilearn.co.ke" className="hover:underline text-brand-text font-semibold">privacy@azilearn.co.ke</a></span>
                    </div>
                    <p className="text-[11px] text-brand-muted leading-relaxed">
                      You also retain absolute rights to record formal grievances with the <strong className="text-brand-text">Office of the Data Protection Commissioner (ODPC) of Kenya</strong> online at <a href="https://www.odpc.go.ke" target="_blank" rel="noopener noreferrer" className="text-[#FF6B2C] hover:underline font-bold">odpc.go.ke</a>.
                    </p>
                  </div>
                </div>

                {/* Swap To Terms link inside content */}
                <div className="border-t border-brand-border pt-6 text-center select-none">
                  <p className="text-xs text-[#FF6B2C] text-brand-muted">
                    Read our complete code of conduct:{' '}
                    <button 
                      onClick={() => { setActiveTab('terms'); scrollToTop(); }}
                      className="text-[#FF6B2C] font-black uppercase tracking-widest text-[10px] hover:underline"
                    >
                      Read Terms of Use &rarr;
                    </button>
                  </p>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* FOOTER */}
      <footer className="mt-12 text-center text-brand-muted text-[11px] font-bold space-y-2 select-none">
        <p>&copy; 2026 AziLearn. All rights reserved.</p>
        <p className="flex items-center justify-center gap-2">
          <button 
            onClick={() => { setActiveTab('terms'); scrollToTop(); }}
            className={`hover:text-brand-text ${activeTab === 'terms' ? 'text-[#FF6B2C] underline' : ''}`}
          >
            Terms of Use
          </button>
          <span>&middot;</span>
          <button 
            onClick={() => { setActiveTab('privacy'); scrollToTop(); }}
            className={`hover:text-brand-text ${activeTab === 'privacy' ? 'text-[#FF6B2C] underline' : ''}`}
          >
            Privacy Policy
          </button>
          <span>&middot;</span>
          <span>Made with Care in Kenya 🇰🇪</span>
        </p>
      </footer>

      {/* FLOATING ACTION BACK-TO-TOP */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-[300] w-12 h-12 rounded-full bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all text-center"
            title="Scroll to top"
          >
            <ChevronUp size={22} />
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
}
