import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type User = {
  id: string;
  email: string;
  nick: string;
  plan: string;
  xp: number;
  level: number;
  streak: number;
  createdAt: string;
  badges?: any[];
  subscription?: {
    status: string;
    currentPeriodEnd?: string;
  } | null;
};

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  
  // Theme state
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      theme: 'dark', // Default to dark for this premium look
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: 'exampt-storage',
      partialize: (state) => ({ theme: state.theme }), // Only persist theme, not user data (handled by API/tokens)
    }
  )
);
