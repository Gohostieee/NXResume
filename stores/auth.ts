import { create } from "zustand";
import { persist } from "zustand/middleware";

// Simplified user type (auth is now handled by Clerk)
type User = {
  id: string;
  name: string;
  email: string;
  picture?: string | null;
  username?: string;
  locale?: string;
};

type AuthState = {
  user: User | null;
};

type AuthActions = {
  setUser: (user: User | null) => void;
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => {
        set({ user });
      },
    }),
    { name: "auth" },
  ),
);
