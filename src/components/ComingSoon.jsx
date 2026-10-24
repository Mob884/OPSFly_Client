import { useNavigate } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import Header from '../components/Header';

export default function ComingSoon({ title }) {
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <Header />
      <main className="coming-soon">
        <Rocket size={64} color="var(--primary)" style={{ marginBottom: '24px' }} />
        <h2>{title}</h2>
        <p>This feature is coming in Milestone 4.</p>
        <button
          className="btn btn-primary"
          style={{ marginTop: '32px', maxWidth: '200px' }}
          onClick={() => navigate('/')}
        >
          Back Home
        </button>
      </main>
    </div>
  );
}
