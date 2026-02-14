import { Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Dashboard from './Dashboard'
import AddPatient from './AddPatient'
import Chat from './Chat'
import Fairness from './Fairness'
import Admin from './Admin'
import Login from './Login'
import Register from './Register'
import PatientDashboard from './PatientDashboard'
import { logout } from './api'
import { useLanguage } from './LanguageContext'
import { Toaster } from 'react-hot-toast'

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

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isPublicRoute = location.pathname === '/login' || location.pathname === '/register'

  if (!token && !isPublicRoute) {
    return <Navigate to="/login" />
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Toaster position="top-right" toastOptions={{ style: { background: '#334155', color: '#fff' } }} />
      {/* Navigation Command Center */}
      {token && !isPublicRoute && (
        <aside style={{
          width: 300, background: 'var(--sidebar-bg)', borderRight: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', flexDirection: 'column', padding: '2.5rem 1.5rem',
          boxShadow: '10px 0 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '3.5rem', padding: '0 8px' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14, background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
              boxShadow: '0 8px 16px rgba(37, 99, 235, 0.4)'
            }}>🏥</div>
            <div>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>VitalCore</h2>
              <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Clinical OS</div>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {userRole !== 'patient' && (
              <>
                <Link to="/" style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 14,
                  background: location.pathname === '/' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: location.pathname === '/' ? '#fff' : '#94a3b8',
                  textDecoration: 'none', fontWeight: 600, fontSize: 14, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }} className="nav-link">
                  <span style={{ fontSize: 18 }}>📊</span> Dashboard
                </Link>

                <Link to="/add" style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 14,
                  background: location.pathname === '/add' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: location.pathname === '/add' ? '#fff' : '#94a3b8',
                  textDecoration: 'none', fontWeight: 600, fontSize: 14, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }} className="nav-link">
                  <span style={{ fontSize: 18 }}>➕</span> Triage Entry
                </Link>
              </>
            )}

            {userRole === 'patient' && (
              <>
                <Link to="/my-health" style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 14,
                  background: location.pathname === '/my-health' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: location.pathname === '/my-health' ? '#fff' : '#94a3b8',
                  textDecoration: 'none', fontWeight: 600, fontSize: 14, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }} className="nav-link">
                  <span style={{ fontSize: 18 }}>👤</span> My Health
                </Link>
                <Link to="/chat" style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 14,
                  background: location.pathname === '/chat' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: location.pathname === '/chat' ? '#fff' : '#94a3b8',
                  textDecoration: 'none', fontWeight: 600, fontSize: 14, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }} className="nav-link">
                  <span style={{ fontSize: 18 }}>💬</span> Clinical AI
                </Link>
              </>
            )}

            {userRole === 'admin' && (
              <Link to="/admin" style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 14,
                background: location.pathname === '/admin' ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: location.pathname === '/admin' ? '#fff' : '#94a3b8',
                textDecoration: 'none', fontWeight: 600, fontSize: 14, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }} className="nav-link">
                <span style={{ fontSize: 18 }}>⚙️</span> Admin Audit
              </Link>
            )}
          </nav>

          <div style={{ marginTop: 'auto', padding: '1.5rem 0 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>

            {/* Language Switcher */}
            <div style={{ display: 'flex', gap: 6, marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 10 }}>
              {(['en', 'hi', 'te', 'ta'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  style={{
                    flex: 1,
                    background: lang === l ? 'var(--accent)' : 'transparent',
                    color: lang === l ? '#fff' : '#94a3b8',
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 0',
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s'
                  }}
                >
                  {l}
                </button>
              ))}
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
              background: 'rgba(255,255,255,0.03)', borderRadius: 16, marginBottom: 12
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: '#334155',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 14
              }}>
                {localStorage.getItem('triage_fullname')?.charAt(0) || 'U'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {localStorage.getItem('triage_fullname') || 'Clinical User'}
                </div>
                <div style={{ color: 'var(--accent)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                  {userRole || 'Staff'}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 13,
                fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#94a3b8';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            >
              Sign Out
            </button>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        padding: isPublicRoute ? 0 : '2.5rem 3rem',
        overflowY: 'auto',
        maxHeight: '100vh',
        background: isPublicRoute ? 'var(--bg)' : 'transparent'
      }}>
        <div style={{ maxWidth: isPublicRoute ? 'none' : 1600, margin: 0, animation: 'slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          {token && !isPublicRoute && (
            <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }}></span>
                  Live System Active
                </div>
                <h1 style={{ fontSize: '2.25rem', margin: 0, fontWeight: 900, letterSpacing: '-0.04em' }}>
                  {location.pathname === '/' ? 'Clinical Command Center' :
                    location.pathname === '/add' ? 'Patient Triage Intake' :
                      location.pathname === '/chat' ? 'Conversational AI Assistant' :
                        location.pathname === '/fairness' ? 'Algorithmic Risk Audit' :
                          location.pathname === '/admin' ? 'Infrastucture Audit' :
                            location.pathname === '/my-health' ? 'Personal Health Portal' : ''}
                </h1>
                <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '1rem' }}>
                  {location.pathname === '/my-health' ? 'Encrypted clinical records and predictive health status.' : 'Enterprise-grade triage monitoring and risk assessment.'}
                </p>
              </div>

              {location.pathname === '/' && (
                <button
                  onClick={() => navigate('/add')}
                  style={{
                    padding: '14px 28px', background: 'var(--accent)', color: '#fff', border: 'none',
                    borderRadius: 14, fontWeight: 800, fontSize: 14, cursor: 'pointer',
                    boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  + New Patient Intake
                </button>
              )}
            </header>
          )}

          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
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

      <style>{`
        .nav-link:hover {
          background: rgba(255,255,255,0.05) !important;
          color: #fff !important;
          transform: translateX(4px);
        }
      `}</style>
    </div>
  )
}
