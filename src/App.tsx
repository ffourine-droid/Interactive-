/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AziLearn - Subscription-based study materials platform
 */
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Loader2, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ToastProvider, useToast } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Page } from './types';

// Lazy load all pages
const Home = lazy(() => import('./pages/Home'));
const AdminPayments = lazy(() => import('./pages/AdminPayments'));
const AdminAssignmentUploader = lazy(() => import('./pages/AdminAssignmentUploader'));
const TeacherAssignmentCreator = lazy(() => import('./components/TeacherAssignmentCreator'));
const StudentAssignmentView = lazy(() => import('./components/StudentAssignmentView'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const TeacherSignup = lazy(() => import('./pages/TeacherSignup'));
const TeacherLogin = lazy(() => import('./pages/TeacherLogin'));
const TeacherClassView = lazy(() => import('./pages/TeacherClassView'));
const ParentPage = lazy(() => import('./pages/ParentPage'));
const LandingPage = lazy(() => import('./components/LandingPage'));

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    if (typeof window !== 'undefined') {
      const hasSeen = localStorage.getItem('azilearn_seen_landing');
      return hasSeen ? 'home' : 'landing';
    }
    return 'landing';
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('azilearn_theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [selectedClassName, setSelectedClassName] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [showImportOnCreator, setShowImportOnCreator] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      showToast('You are back online!', 'success');
    };
    const handleOffline = () => {
      setIsOffline(true);
      showToast('You are offline. Some features may be limited.', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    document.body.className = theme;
    localStorage.setItem('azilearn_theme', theme);
  }, [theme]);

  // Track page changes for Google Analytics
  useEffect(() => {
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('config', 'G-RMW0VBKKBD', {
        page_path: `/${currentPage}`,
        page_title: currentPage.charAt(0).toUpperCase() + currentPage.slice(1)
      });
    }
  }, [currentPage]);

  const renderPage = () => {
    switch (currentPage) {
      case 'assignments':
        return (
          <Suspense fallback={<LoadingFallback text="Entering Classroom..." />}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              key="assignments"
              className="max-w-[420px] mx-auto min-h-screen"
            >
              <StudentAssignmentView onBack={() => setCurrentPage('home')} />
            </motion.div>
          </Suspense>
        );
      case 'teacher':
        return (
          <Suspense fallback={<LoadingFallback text="Loading Teacher Workspace..." />}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              key="teacher"
              className="max-w-4xl mx-auto min-h-screen"
            >
              <TeacherAssignmentCreator 
                onBack={() => setCurrentPage('teacher-dashboard')} 
                preSelectedClassId={selectedClassId || undefined}
                importCode={showImportOnCreator ? ' ' : undefined} // Passing a space triggers the expansion
              />
            </motion.div>
          </Suspense>
        );
      case 'teacher-dashboard':
        return (
          <Suspense fallback={<LoadingFallback text="Entering Dashboard..." />}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              key="teacher-dashboard"
              className="min-h-screen"
            >
              <TeacherDashboard 
                onBack={() => setCurrentPage('landing')} 
                onViewClass={(classId, className) => {
                  setSelectedClassId(classId);
                  setSelectedClassName(className);
                  setCurrentPage('teacher-class');
                }}
                onLogout={() => setCurrentPage('teacher-login')}
                onCreateAssignment={(importMode) => {
                  setSelectedClassId(null);
                  setShowImportOnCreator(!!importMode);
                  setCurrentPage('teacher');
                }}
              />
            </motion.div>
          </Suspense>
        );
      case 'teacher-class':
        return (
          <Suspense fallback={<LoadingFallback text="Loading Class..." />}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              key="teacher-class"
            >
              <TeacherClassView 
                classId={selectedClassId || ''}
                className={selectedClassName || ''} 
                onBack={() => setCurrentPage('teacher-dashboard')} 
                onAddAssignment={() => setCurrentPage('teacher')}
              />
            </motion.div>
          </Suspense>
        );
      case 'teacher-signup':
        return (
          <Suspense fallback={<LoadingFallback text="Creating Account..." />}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              key="teacher-signup"
            >
              <TeacherSignup 
                onBack={() => setCurrentPage('landing')}
                onSuccess={() => setCurrentPage('teacher-dashboard')}
                onNavigateToLogin={() => setCurrentPage('teacher-login')}
              />
            </motion.div>
          </Suspense>
        );
      case 'teacher-login':
        return (
          <Suspense fallback={<LoadingFallback text="Logging in..." />}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              key="teacher-login"
            >
              <TeacherLogin 
                onBack={() => setCurrentPage('landing')}
                onSuccess={() => setCurrentPage('teacher-dashboard')}
                onNavigateToSignup={() => setCurrentPage('teacher-signup')}
              />
            </motion.div>
          </Suspense>
        );
      case 'admin':
        return (
          <Suspense fallback={<LoadingFallback text="Loading Admin Panel..." />}>
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              key="admin"
            >
              <AdminPayments onBack={() => setCurrentPage('home')} />
            </motion.div>
          </Suspense>
        );
      case 'parent':
        return (
          <Suspense fallback={<LoadingFallback text="Opening Parent Portal..." />}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              key="parent"
            >
              <ParentPage onBack={() => setCurrentPage('landing')} />
            </motion.div>
          </Suspense>
        );
      case 'landing':
        return (
          <Suspense fallback={<LoadingFallback text="Loading..." />}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key="landing"
            >
              <LandingPage onNavigate={(portal) => {
                localStorage.setItem('azilearn_seen_landing', 'true');
                if (portal === 'teacher') {
                  const teacherData = localStorage.getItem('azilearn_teacher');
                  setCurrentPage(teacherData ? 'teacher-dashboard' : 'teacher-login');
                } else if (portal === 'parent') {
                  setCurrentPage('parent');
                } else {
                  setCurrentPage('home');
                }
              }} />
            </motion.div>
          </Suspense>
        );
      case 'home':
      default:
        return (
          <Suspense fallback={<LoadingFallback text="" />}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              key="home"
              className="max-w-[360px] mx-auto min-h-screen"
            >
              <Home 
                onBack={() => setCurrentPage('landing')}
                onAdminClick={() => setCurrentPage('admin')}
                onTeacherClick={() => setCurrentPage('teacher')}
                onTeacherDashboardClick={() => {
                  const teacherData = localStorage.getItem('azilearn_teacher');
                  if (teacherData) {
                    setCurrentPage('teacher-dashboard');
                  } else {
                    setCurrentPage('teacher-login');
                  }
                }}
                onAssignmentsClick={() => setCurrentPage('assignments')}
                onParentClick={() => setCurrentPage('parent')}
                theme={theme}
                setTheme={setTheme}
              />
            </motion.div>
          </Suspense>
        );
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text selection:bg-brand-accent/30 transition-colors duration-500">
      <AnimatePresence>
        {isOffline && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-500 text-white text-[10px] font-bold py-1 px-4 flex items-center justify-center gap-2 sticky top-0 z-[1000]"
          >
            <WifiOff size={12} />
            <span>OFFLINE MODE</span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {renderPage()}
      </AnimatePresence>
    </div>
  );
}

function LoadingFallback({ text }: { text: string }) {
  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <Loader2 className="animate-spin text-brand-accent/20" size={40} />
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-brand-accent rounded-full animate-pulse" />
        </div>
      </div>
      {text && <p className="text-brand-muted font-bold text-[10px] animate-pulse lowercase tracking-widest">{text}</p>}
    </div>
  );
}
