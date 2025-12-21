// ============================================================================
// Onboarding & Persona Interfaces
// ============================================================================

export type SeniorityLevel =
  | 'ENTRY'
  | 'JUNIOR'
  | 'MID'
  | 'SENIOR'
  | 'LEAD'
  | 'EXECUTIVE';

export type QuestionType =
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'SCALE'
  | 'TEXT';

export interface IPersona {
  id: string;
  code: string;
  name: string;
  description: string;
  primaryGoal: string;
  targetSeniority: SeniorityLevel;
  iconUrl: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOnboardingQuestion {
  id: string;
  code: string;
  questionText: string;
  questionType: QuestionType;
  options: unknown | null;
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
  personaWeight: unknown | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOnboardingAnswer {
  id: string;
  userId: string;
  questionId: string;
  answerValue: unknown;
  version: number;
  isCurrent: boolean;
  answeredAt: Date;
  createdAt: Date;
}

export interface ISubmitOnboardingAnswer {
  questionId: string;
  answerValue: unknown;
}

