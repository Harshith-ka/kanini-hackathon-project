import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { Lang } from './i18n'

const defaultLang: Lang = 'en'
const storageKey = 'triage_lang'

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: defaultLang,
  setLang: () => { },
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const s = localStorage.getItem(storageKey) as Lang | null
      return s === 'hi' || s === 'en' || s === 'te' || s === 'ta' ? s : defaultLang
    } catch {
      return defaultLang
    }
  })
  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(storageKey, l)
    } catch { }
  }, [])
  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LangContext)
}
