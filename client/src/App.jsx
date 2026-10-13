import { useState } from 'react';
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import AuthProvider from './AuthProvider';
import { useAuth } from './auth-context';
import { api, errorMessage } from './lib/api';
import Barbers from './pages/Barbers';
import Login from './pages/Login';
import Booking from './pages/Booking';
import Appointments from './pages/Appointments';
import Profile from './pages/Profile';
import Schedule from './pages/Schedule';
import Services from './pages/Services';

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Loading your account...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <h1>Access denied</h1>;
  return children;
}
function Shop() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true); setError('');
    try { await api.post('/auth/logout'); setUser(null); navigate('/login'); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  return <>
    <header className="site-header"><div className="container header-inner">
      <Link className="brand" to="/"><span className="brand-mark" aria-hidden="true">✂</span>The Barber Room<span className="brand-sub">GOOD HAIR. GOOD COMPANY.</span></Link>
      <nav aria-label="Main navigation">
        <NavLink to="/" end>Our barbers</NavLink>
        {user ? <>
          <NavLink to="/appointments">Appointments</NavLink>
          {user.role === 'customer' && <NavLink to="/book">Book a visit</NavLink>}
          {['barber', 'admin'].includes(user.role) && <NavLink to="/schedule">Schedule</NavLink>}
          {user.role === 'admin' && <NavLink to="/services">Manage shop</NavLink>}
          <NavLink to="/profile">Profile</NavLink>
          <button className="btn btn-light btn-sm" disabled={busy} onClick={logout}>{busy ? 'Logging out...' : 'Log out'}</button>
        </> : <><NavLink to="/login">Log in</NavLink><NavLink className="btn btn-light btn-sm" to="/register">Create account</NavLink></>}
      </nav>
    </div></header>
    <main className="container main-content">
      {error && <div role="alert" className="alert alert-danger">{error}</div>}
      <Routes>
        <Route path="/" element={<Barbers />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Login register />} />
        <Route path="/appointments" element={<Protected><Appointments /></Protected>} />
        <Route path="/profile" element={<Protected><Profile /></Protected>} />
        <Route path="/book" element={<Protected roles={['customer']}><Booking /></Protected>} />
        <Route path="/schedule" element={<Protected roles={['barber', 'admin']}><Schedule /></Protected>} />
        <Route path="/services" element={<Protected roles={['admin']}><Services /></Protected>} />
        <Route path="*" element={<><h1>Page not found</h1><Link to="/">Back to our barbers</Link></>} />
      </Routes>
    </main>
    <footer className="container site-footer"><span>The Barber Room</span><span>Good hair. Good company.</span></footer>
  </>;
}
export default function App() {
  return <BrowserRouter><AuthProvider><Shop /></AuthProvider></BrowserRouter>;
}
