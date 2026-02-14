import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from './api'
import { useLanguage } from './LanguageContext'
import { t } from './i18n'
import toast from 'react-hot-toast'

export default function Login() {
    const { lang } = useLanguage()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!username || !password) {
            setError(t(lang, 'clinicalId') + ' & ' + t(lang, 'password'))
            return
        }

        setLoading(true)
        setError(null)
        try {
            const res = await login(username, password)
            toast.success(`Welcome back, ${res.full_name || res.username}!`)
            // Role-based routing logic
            if (res.role === 'admin') {
                navigate('/')
            } else {
                navigate('/my-health')
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed. Please check your credentials.')
            toast.error('Login failed: ' + (err.message || 'Invalid credentials'))
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
            background: 'radial-gradient(circle at top right, #f8fafc, #e2e8f0, #cbd5e1)',
            padding: '1.5rem',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Aesthetic Elements */}
            <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '40%', height: '40%', background: 'var(--accent-soft)', filter: 'blur(120px)', borderRadius: '50%', zIndex: 0 }}></div>
            <div style={{ position: 'absolute', bottom: '-5%', left: '-5%', width: '30%', height: '30%', background: 'rgba(16, 185, 129, 0.05)', filter: 'blur(100px)', borderRadius: '50%', zIndex: 0 }}></div>

            <div className="glass-card" style={{
                width: '100%',
                maxWidth: '440px',
                padding: '3.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 40px 100px -20px rgba(0, 0, 0, 0.1)',
                zIndex: 1,
                animation: 'slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
                {/* Branding Section */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: 64, height: 64, background: 'var(--accent)', borderRadius: '20px',
                        margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: '#fff', fontSize: 32,
                        boxShadow: '0 20px 40px -10px rgba(37, 99, 235, 0.4)',
                        animation: 'pulse 3s infinite ease-in-out'
                    }}>🏥</div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', margin: 0 }}>
                        {t(lang, 'appTitle')}
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '0.9375rem', marginTop: '6px', fontWeight: 500 }}>
                        Clinical Triage Intelligence
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {error && (
                        <div style={{
                            padding: '1rem', background: '#fef2f2', border: '1px solid #fee2e2',
                            borderRadius: '16px', color: '#b91c1c', fontSize: '0.8125rem', fontWeight: 700,
                            display: 'flex', gap: '10px', alignItems: 'center', animation: 'fadeIn 0.3s ease'
                        }}>
                            <span style={{ fontSize: 16 }}>⚠️</span> {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={labelStyle}>{t(lang, 'clinicalId')}</label>
                        <input
                            type="text"
                            autoComplete="username"
                            placeholder={t(lang, 'clinicalId')}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={{ ...inputStyle, padding: '14px 18px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={labelStyle}>{t(lang, 'password')}</label>
                        <input
                            type="password"
                            autoComplete="current-password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ ...inputStyle, padding: '14px 18px' }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: '0.5rem',
                            padding: '16px',
                            background: 'var(--accent)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '16px',
                            fontWeight: 800,
                            fontSize: '1rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 15px 30px -5px rgba(37, 99, 235, 0.3)',
                            transform: loading ? 'scale(0.98)' : 'none',
                            letterSpacing: '0.02em'
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(37, 99, 235, 0.4)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!loading) {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = '0 15px 30px -5px rgba(37, 99, 235, 0.3)';
                            }
                        }}
                    >
                        {loading ? t(lang, 'authenticating') : t(lang, 'login')}
                    </button>

                    <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
                        New Patient? <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Create Account</Link>
                    </div>
                </form>

                {/* Compliance Footer */}
                <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}></span>
                        <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>End-to-End Encrypted</span>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.5, fontWeight: 500 }}>
                        VitalCore Enterprise v4.2.0 <br />
                        Authorized Personnel Only
                    </p>
                </div>
            </div>
        </div>
    )
}

// Reusable Styles
const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.7rem',
    fontWeight: 800,
    color: '#475569',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.875rem 1rem',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    outline: 'none',
    fontSize: '0.9375rem',
    color: '#1e293b',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease'
};