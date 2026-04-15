// === Existing Interview Types (preserved) ===

export interface Question {
  id: string;
  title: string;
  description: string;
  correctAnswer?: string;
  goodAnswerCriteria?: string[];
  scoring: {
    max: number;
    rules: { points: number; label: string }[];
  };
  type?: 'text' | 'code' | 'logic';
  codeSnippet?: string;
}

export interface Block {
  id: string;
  title: string;
  timeEstimate: string;
  maxScore: number;
  questions: Question[];
  isProjectBlock?: boolean;
  interviewerGuide?: string[];
}

export interface Candidate {
  sessionId: string;
  name: string;
  date: string;
  contact: string;
}

export interface Scores {
  [questionId: string]: number;
}

export interface Notes {
  [questionId: string]: string;
}

export type InterviewState = 'setup' | 'interview' | 'results';

export interface ProjectCase {
  id: string;
  name: string;
  description: string;
  questions: Question[];
}

// === New Platform Types ===

export type Role = 'admin' | 'teacher' | 'student' | 'deputy';

export interface User {
  id: string;
  username: string;
  password: string;
  role: Role;
  fullName: string;
  createdBy?: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  createdBy: string;
  studentIds: string[];
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  type: 'choice' | 'text';
  options?: string[];
  correctAnswer: string;
  points?: number; // Вес вопроса в баллах (из 100). Если 0/не задан — распределяется автоматически
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  createdBy: string;
  assignedTo: string[];
  assignedGroups: string[];
  questions: QuizQuestion[];
  timeLimitMinutes?: number;
  scheduledAt?: string; // ISO date string for scheduled exam time
  createdAt: string;
}

export interface ExamSnapshot {
  timestamp: string;
  image: string; // Base64 JPEG data URL
  violation?: string;
}

export interface LiveStreamFeed {
  studentId: string;
  quizId: string;
  snapshot: string;
  timestamp: number;
  faceDetected?: boolean;
}

export interface StudentResult {
  id: string;
  studentId: string;
  quizId: string;
  answers: Record<string, string>;
  score: number;
  maxScore: number;
  completedAt: string;
  snapshots?: ExamSnapshot[]; // Optional array of screenshots taken during the exam
}