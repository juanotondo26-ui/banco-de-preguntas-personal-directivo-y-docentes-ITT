export interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

export interface Module {
  id: number;
  title: string;
  description: string;
  cards: Flashcard[];
}

export interface ModuleProgress {
  moduleId: number;
  learnedCardIds: string[];
}

export interface GeneralProgress {
  modulesProgress: { [moduleId: number]: string[] }; // Map of moduleId -> array of learned card IDs
  currentModuleId: number;
  isLandscapeMode: boolean; // Screen horizontal orientation toggle
  isFullScreen: boolean; // Fullscreen modal/view toggle
}
