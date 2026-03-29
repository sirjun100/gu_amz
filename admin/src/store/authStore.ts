import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
  setHasHydrated: (state: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (token, user) => {
        localStorage.setItem('auth_token', token)
        localStorage.setItem('user_info', JSON.stringify(user))
        set({ token, user, isAuthenticated: true })
      },

      clearAuth: () => {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_info')
        set({ token: null, user: null, isAuthenticated: false })
      },

      setHasHydrated: (hydrated) => {
        set({ _hasHydrated: hydrated })
      },
    }),
    {
      name: 'auth-storage-tg',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          localStorage.setItem('auth_token', state.token)
        }
        if (state?.user) {
          localStorage.setItem('user_info', JSON.stringify(state.user))
        }
        setTimeout(() => {
          useAuthStore.setState({ _hasHydrated: true })
        }, 0)
      },
    }
  )
)
