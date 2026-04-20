import { useState } from 'react';
import { User, LogIn } from 'lucide-react';

interface Props {
  onLogin: (userId: string) => void;
}

export function LoginPage({ onLogin }: Props) {
  const [uid, setUid] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (uid.trim()) onLogin(uid.trim());
  };

  return (
    <div className="login-shell" style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
      height: '100vh', background: 'var(--bg)', padding: 20 
    }}>
      <div className="surface" style={{ 
        padding: '32px 24px', width: '100%', maxWidth: 400, 
        display: 'flex', flexDirection: 'column', gap: 24,
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: 56, height: 56, background: 'var(--bg)', 
            borderRadius: '50%', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', margin: '0 auto 16px',
            border: '1px solid var(--border)'
          }}>
            <User size={28} color="var(--accent)" />
          </div>
          <div className="page-title" style={{ fontSize: '1.5rem', marginBottom: 8 }}>歡迎回來</div>
          <div className="page-subtitle">請輸入您的 User ID 或 Email 開始學習</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="config-section">
            <label>UserID / Email</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. ryan@example.com"
              value={uid}
              autoFocus
              onChange={e => setUid(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary btn-lg" 
            disabled={!uid.trim()}
          >
            <LogIn size={18} /> 登入並同步
          </button>
        </form>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
          登入後您的單字庫將會自動與 Google Sheets 同步，<br/>在不同裝置登入同一 ID 即可存取相同內容。
        </div>
      </div>
    </div>
  );
}
