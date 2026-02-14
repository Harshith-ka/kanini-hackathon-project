import { Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Dashboard from './Dashboard'
import AddPatient from './AddPatient'
import Chat from './Chat'
import Fairness from './Fairness'
import Admin from './Admin'
import Login from './Login'
import PatientDashboard from './PatientDashboard'
import { logout } from './api'
import { useLanguage } from './LanguageContext'
import { t } from './i18n'

function ProtectedRoute({ children, role }: { children: React.ReactNode, role?: 'admin' | 'patient' }) {
  const token = localStorage.getItem('triage_token')
  const userRole = localStorage.getItem('triage_role')

  if (!token) return <Navigate to="/login" replace />
  if (role && userRole !== role) {
    return <Navigate to={userRole === 'admin' ? '/' : '/my-health'} replace />
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
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Sidebar Navigation */}
      {token && location.pathname !== '/login' && (
        <aside style={{
          width: 280,
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2.5rem', padding: '0 0.5rem' }}>
            <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px var(--accent-glow)' }}>
              <span style={{ fontSize: 18 }}>🏥</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>TriAlge</span>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, padding: '0 0.5rem' }}>Main Menu</div>

            {userRole === 'admin' && (
              <>
                <Link to="/" style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12,
                  background: location.pathname === '/' ? 'var(--accent)' : 'transparent',
                  color: location.pathname === '/' ? '#fff' : 'var(--text-muted)',
                  textDecoration: 'none', fontWeight: 600, transition: 'all 0.2s'
                }}>
                  <span>📊</span> {t(lang, 'navDashboard')}
                </Link>
                <Link to="/fairness" style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12,
                  background: location.pathname === '/fairness' ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: location.pathname === '/fairness' ? '#fff' : '#94a3b8',
                  textDecoration: 'none', fontWeight: 600, fontSize: 14, transition: 'all 0.2s'
                }}>
                  <span>⚖️</span> {t(lang, 'navFairness')}
                </Link>
                <Link to="/admin" style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12,
                  background: location.pathname === '/admin' ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: location.pathname === '/admin' ? '#fff' : '#94a3b8',
                  textDecoration: 'none', fontWeight: 600, fontSize: 14, transition: 'all 0.2s'
                }}>
                  <span>⚙️</span> {t(lang, 'navAdmin')}
                </Link>
              </>
            )}

            {userRole === 'patient' && (
              <>
                <Link to="/my-health" style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12,
                  background: location.pathname === '/my-health' ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: location.pathname === '/my-health' ? '#fff' : '#94a3b8',
                  textDecoration: 'none', fontWeight: 600, fontSize: 14, transition: 'all 0.2s'
                }}>
                  <span>🏥</span> My Health
                </Link>
                <Link to="/chat" style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12,
                  background: location.pathname === '/chat' ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: location.pathname === '/chat' ? '#fff' : '#94a3b8',
                  textDecoration: 'none', fontWeight: 600, fontSize: 14, transition: 'all 0.2s'
                }}>
                  <span>💬</span> AI Assistant
                </Link>
              </>
            )}
          </nav>

          <div style={{ marginTop: 'auto', padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{localStorage.getItem('triage_fullname') || 'Healthcare Staff'}</div>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>{userRole}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
                style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'var(--surface-solid)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 12, fontWeight: 600 }}
              >
                {lang === 'en' ? 'हिन्दी' : 'English'}
              </button>
              <button
                onClick={handleLogout}
                style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: 12, fontWeight: 600 }}
              >
                Logout
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        padding: '2.5rem',
        overflowY: 'auto',
        maxHeight: '100vh',
        background: location.pathname === '/login' ? 'var(--bg)' : 'transparent'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }}></span>
                Live System Active
              </div>
              <h1 style={{ fontSize: '2rem', margin: 0 }}>
                {location.pathname === '/' ? 'Hospital Command Center' :
                  location.pathname === '/add' ? 'Patient Intake' :
                    location.pathname === '/chat' ? 'Conversational Triage' :
                      location.pathname === '/fairness' ? 'Algorithmic Fairness' :
                        location.pathname === '/admin' ? 'System Administration' :
                          location.pathname === '/my-health' ? 'Personal Health Dashboard' : ''}
              </h1>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>{location.pathname === '/my-health' ? 'Intelligent personalized health insights' : 'Real-time triage and operational monitoring'}</p>
            </div>

            {location.pathname === '/' && (
              <button
                onClick={() => navigate('/add')}
                style={{ padding: '12px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, boxShadow: '0 4px 14px var(--accent-glow)' }}
              >
                + New Intake
              </button>
            )}
          </header>

          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute role="admin"><Dashboard /></ProtectedRoute>} />
            <Route path="/my-health" element={<ProtectedRoute role="patient"><PatientDashboard /></ProtectedRoute>} />
            <Route path="/add" element={<ProtectedRoute><AddPatient /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/fairness" element={<ProtectedRoute role="admin"><Fairness /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to={token ? (userRole === 'admin' ? '/' : '/my-health') : '/login'} replace />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
