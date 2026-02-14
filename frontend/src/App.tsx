import { Routes, Route, Link } from 'react-router-dom'
import Dashboard from './Dashboard'
import AddPatient from './AddPatient'
import Chat from './Chat'
import Fairness from './Fairness'
import Admin from './Admin'
import { useLanguage } from './LanguageContext'
import { t } from './i18n'

export default function App() {
  const { lang, setLang } = useLanguage()
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        background: 'var(--surface)',
        flexWrap: 'wrap',
      }}>
        <Link to="/" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 700, fontSize: '1.125rem' }}>
          {t(lang, 'appTitle')}
        </Link>
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{t(lang, 'navDashboard')}</Link>
          <Link to="/add" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{t(lang, 'navAddPatient')}</Link>
          <Link to="/chat" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{t(lang, 'navChat')}</Link>
          <Link to="/fairness" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{t(lang, 'navFairness')}</Link>
          <Link to="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{t(lang, 'navAdmin')}</Link>
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setLang('en')} style={{ padding: '4px 8px', background: lang === 'en' ? 'var(--accent)' : 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontWeight: lang === 'en' ? 600 : 400 }}>EN</button>
          <button type="button" onClick={() => setLang('hi')} style={{ padding: '4px 8px', background: lang === 'hi' ? 'var(--accent)' : 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontWeight: lang === 'hi' ? 600 : 400 }}>हिं</button>
        </div>
      </header>
      <main style={{ flex: 1, padding: '1.5rem' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add" element={<AddPatient />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/fairness" element={<Fairness />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </div>
  )
}
