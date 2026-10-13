import { useEffect,useState } from 'react';
import { Link,useLocation } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { api,errorMessage,displayDate } from '../lib/api';
export default function Appointments() {
 const {user}=useAuth(),location=useLocation();
 const [result,setResult]=useState({items:[],total:0,pages:0,counts:{}}),[page,setPage]=useState(1),[status,setStatus]=useState(''),[search,setSearch]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true),[refresh,setRefresh]=useState(0),[busy,setBusy]=useState(''),[confirm,setConfirm]=useState(null);
 useEffect(()=>{
  let active=true;
  api.get('/appointments',{params:{page,status,search}}).then(r=>{if(active){setResult(r.data);setLoading(false);}}).catch(e=>{if(active){setError(errorMessage(e));setLoading(false);}});
  return ()=>{active=false;};
 },[page,status,search,refresh]);
 async function update() {
  setBusy(confirm.id);setError('');
  try {await api.patch('/appointments/'+confirm.id+'/status',{status:confirm.status});setConfirm(null);setRefresh(r=>r+1);}
  catch(e){setError(errorMessage(e));}finally{setBusy('');}
 }
 return <><div className="section-intro"><div><p className="eyebrow">{user.role==='customer'?'YOUR TIME IN THE CHAIR':'THE DAY AT A GLANCE'}</p><h1>{user.role==='customer'?'Your appointments':'Appointment dashboard'}</h1><p className="muted">Hello, {user.name}. {user.role==='customer'?'Your next fresh start is right here.':'Keep the shop running smoothly.'}</p></div>{user.role==='customer' && <Link to="/book" className="btn btn-primary">Book an appointment ↗</Link>}</div>
  {location.state?.message && <div role="status" className="alert alert-success">{location.state.message}</div>}
  {error && <div role="alert" className="alert alert-danger">{error}</div>}
  <div className="row g-3 mb-4">{['confirmed','completed','cancelled','no-show'].map(s=><div className="col-6 col-lg-3" key={s}><div className="stat-card"><span>{s.replace('-',' ')}</span><strong>{result.counts[s] || 0}</strong></div></div>)}</div>
  <section className="panel">
   <div className="row g-3 mb-4"><div className="col-md-8"><label htmlFor="search" className="form-label">Search services</label><input id="search" className="form-control" placeholder="Search your appointment list" value={search} maxLength={80} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></div><div className="col-md-4"><label htmlFor="status" className="form-label">Status</label><select id="status" className="form-select" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">All appointments</option>{['confirmed','completed','cancelled','no-show'].map(s=><option key={s} value={s}>{s}</option>)}</select></div></div>
   {confirm && <div role="alert" className="alert alert-warning">Set this appointment to <strong>{confirm.status}</strong>? <button disabled={!!busy} className="btn btn-sm btn-dark ms-2" onClick={update}>Confirm</button><button disabled={!!busy} className="btn btn-sm btn-link" onClick={()=>setConfirm(null)}>Keep appointment</button></div>}
   {loading?<p role="status">Loading appointments…</p>:result.items.length===0?<div className="empty-state">No appointments found.</div>:<div className="table-responsive"><table className="table align-middle"><thead><tr><th>Service</th>{user.role!=='customer' && <th>Customer</th>}<th>Barber</th><th>When</th><th>Status</th><th>Actions</th></tr></thead><tbody>{result.items.map(a=>{
    const upcoming=new Date(a.startAt)>new Date();
    return <tr key={a._id}><td><strong>{a.serviceName}</strong><small className="d-block muted">{a.durationMinutes} minutes</small></td>{user.role!=='customer' && <td>{a.customer?.name}<small className="d-block muted">{a.customer?.email}</small></td>}<td>{a.barber?.user?.name || 'Former barber'}</td><td>{displayDate(a.startAt)}</td><td><span className={'status-badge status-'+a.status}>{a.status}</span></td><td>{a.status==='confirmed' && <div className="d-flex flex-wrap gap-2">{user.role==='customer' && upcoming && <Link className="btn btn-sm btn-outline-secondary" to={'/book?appointment='+a._id+'&barber='+a.barber._id+'&service='+a.service}>Reschedule</Link>}{upcoming && <button disabled={!!busy} className="btn btn-sm btn-outline-danger" onClick={()=>setConfirm({id:a._id,status:'cancelled'})}>Cancel</button>}{user.role!=='customer' && !upcoming && <><button disabled={!!busy || new Date(a.endAt)>new Date()} className="btn btn-sm btn-outline-success" onClick={()=>setConfirm({id:a._id,status:'completed'})}>Complete</button><button disabled={!!busy} className="btn btn-sm btn-outline-secondary" onClick={()=>setConfirm({id:a._id,status:'no-show'})}>No-show</button></>}</div>}</td></tr>;
   })}</tbody></table></div>}
   <div className="pagination-row"><span className="muted">{result.total} appointment{result.total===1?'':'s'}</span><div className="d-flex align-items-center gap-3"><button className="btn btn-sm btn-outline-secondary" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page} of {Math.max(1,result.pages)}</span><button className="btn btn-sm btn-outline-secondary" disabled={page>=result.pages} onClick={()=>setPage(p=>p+1)}>Next</button></div></div>
  </section>
 </>;
}
