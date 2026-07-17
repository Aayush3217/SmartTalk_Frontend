import { create } from 'zustand';

export const useUserStore = create((set) => ({
  currentUser: null,
  isAuthChecking: true,
  
  setCurrentUser: (user) => set({ currentUser: user }),
  clearUser: () => set({ currentUser: null }),
  setAuthChecking: (checking) => set({ isAuthChecking: checking }),
}));
