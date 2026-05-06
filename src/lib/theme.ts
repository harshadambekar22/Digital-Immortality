export type ThemeChoice = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'di:theme'

export function getStoredTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* private mode */
  }
  return 'system'
}

export function setStoredTheme(choice: ThemeChoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, choice)
  } catch {
    /* ignore */
  }
}

export function resolveTheme(choice: ThemeChoice): 'light' | 'dark' {
  if (choice === 'light' || choice === 'dark') return choice
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function applyTheme(choice: ThemeChoice): void {
  document.documentElement.dataset.theme = resolveTheme(choice)
  document.documentElement.dataset.themeMode = choice
}

export function subscribeSystemTheme(callback: () => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const fn = () => callback()
  mq.addEventListener('change', fn)
  return () => mq.removeEventListener('change', fn)
}
