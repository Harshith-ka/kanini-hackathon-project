import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from './api'
import { useLanguage } from './LanguageContext'
import { t } from './i18n'
import toast from 'react-hot-toast'

export default function Register() {
    const { lang } = useLanguage()
    const [form, setForm] = useState({ full_name: '', email: '', username: '', password: '', confirm_password: '' })
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!form.full_name || !form.email || !form.password || !form.confirm_password) {
            setError('Please fill in all required fields.')
            return
        }

        if (form.password !== form.confirm_password) {
            setError('Passwords do not match.')
            return
        }

        setLoading(true)
        try {
            await register({
                full_name: form.full_name,
                email: form.email,
                username: form.username || form.email, // Default username to email if empty
                password: form.password,
                role: 'patient'
            })
            toast.success('Registration successful! Please login.')
            navigate('/login')
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.')
            toast.error(err.message || 'Registration failed')
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
                maxWidth: '500px',
                padding: '3rem',
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 40px 100px -20px rgba(0, 0, 0, 0.1)',
                zIndex: 1,
                animation: 'slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', margin: 0 }}>
                        {t(lang, 'registerTitle')}
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '0.9375rem', marginTop: '6px', fontWeight: 500 }}>
                        Create your secure patient portal account.
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {error && (
                        <div style={{
                            padding: '1rem', background: '#fef2f2', border: '1px solid #fee2e2',
                            borderRadius: '16px', color: '#b91c1c', fontSize: '0.8125rem', fontWeight: 700,
                            display: 'flex', gap: '10px', alignItems: 'center', animation: 'fadeIn 0.3s ease'
                        }}>
                            <span style={{ fontSize: 16 }}>⚠️</span> {error}
                        </div>
                    )}

                    <div>
                        <label style={labelStyle}>{t(lang, 'fullName')}</label>
                        <input type="text" required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} style={inputStyle} placeholder="John Doe" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>{t(lang, 'clinicalId')}</label>
                            <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} placeholder="john@example.com" />
                        </div>
                        <div>
                            <label style={labelStyle}>{t(lang, 'username')}</label>
                            <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} style={inputStyle} placeholder="johndoe123" />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>{t(lang, 'password')}</label>
                            <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={inputStyle} placeholder="••••••••" />
                        </div>
                        <div>
                            <label style={labelStyle}>{t(lang, 'confirmPassword')}</label>
                            <input type="password" required value={form.confirm_password} onChange={e => setForm({ ...form, confirm_password: e.target.value })} style={inputStyle} placeholder="••••••••" />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: '1rem', padding: '14px', background: 'var(--accent)',
                            color: '#fff', border: 'none', borderRadius: '16px', fontWeight: 800,
                            fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 15px 30px -5px rgba(37, 99, 235, 0.3)',
                            transform: loading ? 'scale(0.98)' : 'none'
                        }}
                    >
                        {loading ? 'Creating Account...' : t(lang, 'register')}
                    </button>

                    <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
                        {t(lang, 'alreadyAccount')} <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>{t(lang, 'login')}</Link>
                    </div>
                </form>
            </div>
        </div>
    )
}

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
