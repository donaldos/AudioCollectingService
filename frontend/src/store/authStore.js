import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,

      login: (user, token) => set({ user, token }),

      logout: () => set({ user: null, token: null }),

      updatePoints: (totalPoints) =>
        set((state) => ({
          user: state.user ? { ...state.user, points: totalPoints } : null,
        })),
    }),
    {
      name: 'voicecollect-auth',
    }
  )
)
