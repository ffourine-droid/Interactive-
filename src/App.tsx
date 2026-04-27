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
const Home = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const AdminPayments = lazy(() => import('./pages/AdminPayments').then(module => ({ default: module.AdminPayments })));
const AdminAssignmentUploader = lazy(() => import('./pages/AdminAssignmentUploader').then(module => ({ default: module.AdminAssignmentUploader })));
const TeacherAssignmentCreator = lazy(() => import('./components/TeacherAssignmentCreator'));
const StudentAssignmentView = lazy(() => import('./components/StudentAssignmentView'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard').then(module => ({ default: module.TeacherDashboard })));
const TeacherSignup = lazy(() => import('./pages/TeacherSignup').then(module => ({ default: module.TeacherSignup })));
const TeacherLogin = lazy(() => import('./pages/TeacherLogin').then(module => ({ default: module.TeacherLogin })));
const TeacherClassView = lazy(() => import('./pages/TeacherClassView').then(module => ({ default: module.TeacherClassView })));

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
  const [currentPage, setCurrentPage] = useState<Page>('home');
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
            <div className="max-w-[420px] mx-auto min-h-screen">
              <StudentAssignmentView onBack={() => setCurrentPage('home')} />
            </div>
          </Suspense>
        );
      case 'teacher':
        return (
          <Suspense fallback={<LoadingFallback text="Loading Teacher Workspace..." />}>
            <div className="max-w-4xl mx-auto min-h-screen">
              <TeacherAssignmentCreator 
                onBack={() => setCurrentPage('teacher-dashboard')} 
                preSelectedClassId={selectedClassId || undefined}
                importCode={showImportOnCreator ? ' ' : undefined} // Passing a space triggers the expansion
              />
            </div>
          </Suspense>
        );
      case 'teacher-dashboard':
        return (
          <Suspense fallback={<LoadingFallback text="Entering Dashboard..." />}>
            <div className="min-h-screen">
              <TeacherDashboard 
                onBack={() => setCurrentPage('home')} 
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
            </div>
          </Suspense>
        );
      case 'teacher-class':
        return (
          <Suspense fallback={<LoadingFallback text="Loading Class..." />}>
            <TeacherClassView 
              classId={selectedClassId || ''}
              className={selectedClassName || ''} 
              onBack={() => setCurrentPage('teacher-dashboard')} 
              onAddAssignment={() => setCurrentPage('teacher')}
            />
          </Suspense>
        );
      case 'teacher-signup':
        return (
          <Suspense fallback={<LoadingFallback text="Creating Account..." />}>
            <TeacherSignup 
              onBack={() => setCurrentPage('home')}
              onSuccess={() => setCurrentPage('teacher-dashboard')}
              onNavigateToLogin={() => setCurrentPage('teacher-login')}
            />
          </Suspense>
        );
      case 'teacher-login':
        return (
          <Suspense fallback={<LoadingFallback text="Logging in..." />}>
            <TeacherLogin 
              onBack={() => setCurrentPage('home')}
              onSuccess={() => setCurrentPage('teacher-dashboard')}
              onNavigateToSignup={() => setCurrentPage('teacher-signup')}
            />
          </Suspense>
        );
      case 'admin':
        return (
          <Suspense fallback={<LoadingFallback text="Loading Admin Panel..." />}>
            <AdminPayments onBack={() => setCurrentPage('home')} />
          </Suspense>
        );
      case 'home':
      default:
        return (
          <Suspense fallback={<LoadingFallback text="" />}>
            <div className="max-w-[360px] mx-auto min-h-screen">
              <Home 
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
                theme={theme}
                setTheme={setTheme}
              />
            </div>
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
      {renderPage()}
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
