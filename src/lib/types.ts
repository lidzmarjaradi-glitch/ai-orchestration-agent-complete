export type CompletionStatus = 'Complete' | 'Partial' | 'Failed' | 'Unknown';

export type IterationRecord = {
  id: number;
  iteration: number;
  promptSent: string;
  executorOutput: string;
  evaluatorOutput: string;
  evaluatorStatus: CompletionStatus;
  createdAt: string;
};

export type ProjectState = {
  projectName: string;
  goal: string;
  techStack: string;
  constraints: string;
  notes: string;
  acceptanceCriteria: string;
  currentPrompt: string;
  executorOutput: string;
  evaluatorOutput: string;
  history: IterationRecord[];
  status: string;
  lastSavedAt?: string | null;
};
