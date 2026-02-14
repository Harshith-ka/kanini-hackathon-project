import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from './api'

export default function Login() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            const res = await login(username, password)
            if (res.role === 'admin') {
                navigate('/')
            } else {
                navigate('/my-health')
            }
        } catch (err: any) {
            setError(err.message || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            padding: '2rem'
        }}>
            <div className="glass-card" style={{
                width: '100%',
                maxWidth: '440px',
                padding: '3rem',
                border: '1px solid #cbd5e1'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: 48, height: 48, background: 'var(--accent)', borderRadius: 12,
                        margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: '#fff', fontSize: 24,
                        boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
                    }}>🏥</div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0f172a' }}>VitalCore AI</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Clinical Triage & Operational Intelligence</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {error && (
                        <div style={{
                            padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca',
                            borderRadius: '8px', color: '#991b1b', fontSize: '0.875rem', fontWeight: 500
                        }}>
                            {error}
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Email Address</label>
                        <input
                            type="email"
                            placeholder="name@hospital.com"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={{
                                width: '100%', padding: '0.875rem 1rem', borderRadius: '10px',
                                border: '1px solid #cbd5e1', background: '#fff', outline: 'none',
                                transition: 'border-color 0.2s', fontSize: '1rem', color: '#1e293b'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%', padding: '0.875rem 1rem', borderRadius: '10px',
                                border: '1px solid #cbd5e1', background: '#fff', outline: 'none',
                                transition: 'border-color 0.2s', fontSize: '1rem', color: '#1e293b'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: '0.5rem', padding: '0.875rem', background: 'var(--accent)',
                            color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700,
                            fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <a href="#" style={{ fontSize: '0.875rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Forgot your password?</a>
                    </div>
                </form>

                <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Authorized personnel only. Use of this system is monitored for clinical compliance.</p>
                </div>
            </div>
        </div>
    )
}
