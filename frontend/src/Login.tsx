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
                navigate('/add')
            }
        } catch (err: any) {
            setError(err.message || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ maxWidth: 400, margin: '100px auto', padding: '2rem', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Login</h1>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 14, color: 'var(--text-muted)' }}>Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{ padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                        required
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 14, color: 'var(--text-muted)' }}>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                        required
                    />
                </div>
                {error && <div style={{ color: 'var(--red)', fontSize: 14, textAlign: 'center' }}>{error}</div>}
                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        marginTop: '1rem',
                        padding: '0.75rem',
                        borderRadius: 8,
                        border: 'none',
                        background: 'var(--accent)',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                <p>Demo Admin: admin / admin123</p>
            </div>
        </div>
    )
}
