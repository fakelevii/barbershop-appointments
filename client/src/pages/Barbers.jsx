import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { api,errorMessage } from '../lib/api';
import { useAuth } from '../auth-context';
export default function Barbers() {
 const {user}=useAuth();
 const [barbers,setBarbers]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{api.get('/barbers').then(r=>setBarbers(r.data)).catch(e=>setError(errorMessage(e))).finally(()=>setLoading(false));},[]);
 return <>
  <section className="hero"><div><p className="eyebrow">GOOD HAIR. GOOD COMPANY.</p><h1>Your barber.<br/>Your time.</h1><p className="hero-copy">A fresh cut starts with the right person. Choose your barber, find your service, and book a time that works for you.</p><a href="#barbers" className="btn btn-primary btn-lg">Meet the barbers <span aria-hidden="true">↗</span></a></div><div className="hero-note"><span className="scissors" aria-hidden="true">✂</span><p>Classic care.<br/>A fresh perspective.</p><small>Instant confirmation · No waiting for approval</small></div></section>
  <section id="barbers"><div className="section-intro"><div><p className="eyebrow">THE PEOPLE BEHIND THE CHAIR</p><h2>Find your barber</h2></div><p>Four barbers. A style for everyone.</p></div>
   {error && <div role="alert" className="alert alert-danger">{error}</div>}
   {loading && <p role="status">Loading barbers…</p>}
   {!loading && !error && barbers.length===0 && <div className="empty-state">The barber profiles have not been set up yet. Run the shop seed command first.</div>}
   <div className="row g-4">{barbers.map((b,i)=><div className="col-sm-6 col-lg-3" key={b._id}><article className="barber-card"><div className={'avatar-panel tone-'+i}><span>{b.user.name.split(' ').map(s=>s[0]).join('')}</span><small>THE BARBER ROOM</small></div><div className="barber-content"><h3>{b.user.name}</h3><p className="muted">{b.bio || 'A clean finish, every time.'}</p><div className="service-tags">{b.services.map(s=><span key={s._id}>{s.name} · {s.durationMinutes}m</span>)}</div>{(!user || user.role==='customer') && <Link className="btn btn-primary w-100 mt-3" to={user?'/book?barber='+b._id:'/login'}>Choose {b.user.name.split(' ')[0]}</Link>}</div></article></div>)}</div>
  </section>
 </>;
}
