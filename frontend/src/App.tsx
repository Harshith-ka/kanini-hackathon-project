import { Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Dashboard from './Dashboard'
import AddPatient from './AddPatient'
import Chat from './Chat'
import Fairness from './Fairness'
import Admin from './Admin'
import Login from './Login'
import { logout } from './api'
import { useLanguage } from './LanguageContext'
import { t } from './i18n'

function ProtectedRoute({ children, role }: { children: React.ReactNode, role?: 'admin' | 'patient' }) {
  const token = localStorage.getItem('triage_token')
  const userRole = localStorage.getItem('triage_role')

  if (!token) return <Navigate to="/login" replace />
  if (role && userRole !== role) {
    return <Navigate to={userRole === 'admin' ? '/' : '/add'} replace />
  }

  return <>{children}</>
}

export default function App() {
  const { lang, setLang } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()

  const token = localStorage.getItem('triage_token')
  const userRole = localStorage.getItem('triage_role')
  const username = localStorage.getItem('triage_username')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

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
        {token && (
          <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {userRole === 'admin' && (
              <>
                <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{t(lang, 'navDashboard')}</Link>
                <Link to="/fairness" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{t(lang, 'navFairness')}</Link>
                <Link to="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{t(lang, 'navAdmin')}</Link>
              </>
            )}
            <Link to="/add" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{t(lang, 'navAddPatient')}</Link>
            <Link to="/chat" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{t(lang, 'navChat')}</Link>
          </nav>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button type="button" onClick={() => setLang('en')} style={{ padding: '4px 8px', background: lang === 'en' ? 'var(--accent)' : 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontWeight: lang === 'en' ? 600 : 400 }}>EN</button>
            <button type="button" onClick={() => setLang('hi')} style={{ padding: '4px 8px', background: lang === 'hi' ? 'var(--accent)' : 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontWeight: lang === 'hi' ? 600 : 400 }}>हिं</button>
          </div>
          {token && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{username}</span>
              <button onClick={handleLogout} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--red)', borderRadius: 12, color: 'var(--red)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>
      <main style={{ flex: 1, padding: '1.5rem' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute role="admin"><Dashboard /></ProtectedRoute>} />
          <Route path="/add" element={<ProtectedRoute><AddPatient /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/fairness" element={<ProtectedRoute role="admin"><Fairness /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to={token ? (userRole === 'admin' ? '/' : '/add') : '/login'} replace />} />
        </Routes>
      </main>
    </div>
  )
}
