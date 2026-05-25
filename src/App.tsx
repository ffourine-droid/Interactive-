/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AziLearn - Subscription-based study materials platform
 */
import React, { useState, useEffect, Suspense } from 'react';
import { Loader2, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ToastProvider, useToast } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Page } from './types';

// Static load all pages to eliminate chunk load delay and make all navigation instantaneous
import Home from './pages/Home';
import TeacherAssignmentCreator from './components/TeacherAssignmentCreator';
import StudentAssignmentView from './components/StudentAssignmentView';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherSignup from './pages/TeacherSignup';
import TeacherLogin from './pages/TeacherLogin';
import TeacherClassView from './pages/TeacherClassView';
import ParentPage from './pages/ParentPage';
import LandingPage from './components/LandingPage';
import StudentExamsPage from './pages/StudentExamsPage';
import TakeExamPage from './pages/TakeExamPage';
import CreateExamPage from './pages/CreateExamPage';
import ExamResultsPage from './pages/ExamResultsPage';
import AdminDashboard from './pages/AdminDashboard';
import GroupWorkPage from './pages/GroupWorkPage';
import StoryQuest from './components/StoryQuest';

import { examService } from './services/examService';

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
  const [currentPageProps, setCurrentPageProps] = useState<any>(null);

  const navigateTo = (page: Page, props?: any) => {
    setCurrentPage(page);
    setCurrentPageProps(props);
  };
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('azilearn_theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [selectedClassName, setSelectedClassName] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [showImportOnCreator, setShowImportOnCreator] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    // Seed prebuilt exams on startup
    examService.seedPrebuiltExams();
  }, []);

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
              <StudentAssignmentView 
                onBack={() => setCurrentPage('home')} 
                onExamsClick={() => setCurrentPage('student-exams')}
                preSelectedAssignmentId={currentPageProps?.preSelectedAssignmentId}
              />
            </motion.div>
          </Suspense>
        );
      case 'student-exams':
        return (
          <Suspense fallback={<LoadingFallback text="Loading Assessments..." />}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              key="student-exams"
              className="min-h-screen"
            >
              <StudentExamsPage
                onBack={() => setCurrentPage('home')}
                onStartExam={(id) => {
                  setSelectedExamId(id);
                  setCurrentPage('take-exam');
                }}
              />
            </motion.div>
          </Suspense>
        );
      case 'take-exam':
        return (
          <Suspense fallback={<LoadingFallback text="Starting Assessment..." />}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              key="take-exam"
              className="min-h-screen"
            >
              {selectedExamId && (
                <TakeExamPage 
                  examId={selectedExamId}
                  onBack={() => setCurrentPage('student-exams')}
                  onSubmitted={(attempt) => {
                    // Logic for showing results handled within TakeExamPage or via separate state
                    // For now, let's keep it simple
                    setCurrentPage('student-exams');
                  }}
                />
              )}
            </motion.div>
          </Suspense>
        );
      case 'create-exam':
        return (
          <Suspense fallback={<LoadingFallback text="Opening Creator..." />}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              key="create-exam"
              className="min-h-screen"
            >
              <CreateExamPage 
                onBack={() => setCurrentPage('teacher-dashboard')} 
                initialData={currentPageProps?.editingExam || currentPageProps?.importedWork}
                preSelectedClassId={currentPageProps?.preSelectedClassId}
              />
            </motion.div>
          </Suspense>
        );
      case 'exam-results':
        return (
          <Suspense fallback={<LoadingFallback text="Loading Results..." />}>
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              key="exam-results"
              className="min-h-screen"
            >
              {selectedExamId && (
                <ExamResultsPage 
                  examId={selectedExamId}
                  onBack={() => setCurrentPage('teacher-dashboard')}
                />
              )}
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
                initialData={currentPageProps?.importedWork}
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
                onExamsClick={() => setCurrentPage('create-exam')}
                onViewExamResults={(id) => {
                  setSelectedExamId(id);
                  setCurrentPage('exam-results');
                }}
                onEditExam={(exam) => {
                  setCurrentPageProps({ editingExam: exam });
                  setCurrentPage('create-exam');
                }}
                onCreateAssignment={(importMode) => {
                  setSelectedClassId(null);
                  setShowImportOnCreator(!!importMode);
                  setCurrentPage('teacher');
                }}
                onImportWork={(work) => {
                  setCurrentPageProps({ importedWork: work });
                  if (work.type === 'assignment') {
                    setCurrentPage('teacher');
                  } else {
                    setCurrentPage('create-exam');
                  }
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
                onAddAssignment={(cid) => {
                  setSelectedClassId(cid);
                  setCurrentPage('teacher');
                }}
                onAddExam={(cid) => {
                  setSelectedClassId(cid);
                  setCurrentPageProps({ preSelectedClassId: cid });
                  setCurrentPage('create-exam');
                }}
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
/* Admin consolidated into admin-dashboard */
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
      case 'admin-dashboard':
        return (
          <Suspense fallback={<LoadingFallback text="Entering Admin Terminal..." />}>
            <AdminDashboard onBack={() => setCurrentPage('home')} />
          </Suspense>
        );
      case 'story-quest':
        return (
          <Suspense fallback={<LoadingFallback text="Opening Stories..." />}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              key="story-quest"
              className="max-w-[420px] mx-auto min-h-screen font-sans"
            >
              <StoryQuest onBack={() => setCurrentPage('home')} />
            </motion.div>
          </Suspense>
        );
      case 'groupwork':
        return (
          <Suspense fallback={<LoadingFallback text="Entering My Work..." />}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              key="groupwork"
              className="max-w-[360px] mx-auto min-h-screen"
            >
              <GroupWorkPage onBack={() => setCurrentPage('home')} />
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
                onAdminClick={() => setCurrentPage('admin-dashboard')}
                onAdminTerminalClick={() => setCurrentPage('admin-dashboard')}
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
                onExamsClick={() => setCurrentPage('student-exams')}
                onArenaClick={() => setCurrentPage('groupwork')}
                onParentClick={() => setCurrentPage('parent')}
                onStoriesClick={() => setCurrentPage('story-quest')}
                selectedClass={selectedClass}
                setSelectedClass={setSelectedClass}
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
