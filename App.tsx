import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { Quiz } from './types';
import LoginPage from './LoginPage';
import AdminDashboard from './AdminDashboard';
import TeacherDashboard from './TeacherDashboard';
import StudentDashboard from './StudentDashboard';
import DeputyDashboard from './DeputyDashboard';
import QuizRunner from './QuizRunner';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);

  if (!user) return <LoginPage />;

  // Student taking a quiz
  if (user.role === 'student' && activeQuiz) {
    return (
      <QuizRunner
        quiz={activeQuiz}
        studentId={user.id}
        onFinish={() => setActiveQuiz(null)}
      />
    );
  }

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'student':
      return (
        <StudentDashboard 
          onStartQuiz={(quiz) => {
            const isLocked = quiz.scheduledAt ? new Date() < new Date(quiz.scheduledAt) : false;
            if (!isLocked) setActiveQuiz(quiz);
          }} 
        />
      );
    case 'deputy':
      return <DeputyDashboard />;
    default:
      return <LoginPage />;
  }
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;