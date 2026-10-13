import { useEffect,useState } from 'react';
import { useNavigate,useSearchParams } from 'react-router-dom';
import { api,errorMessage,today } from '../lib/api';
export default function Booking() {
 const [params]=useSearchParams(),navigate=useNavigate();
 const appointment=params.get('appointment');
 const [barbers,setBarbers]=useState([]),[barber,setBarber]=useState(params.get('barber') || ''),[service,setService]=useState(params.get('service') || ''),[date,setDate]=useState(today()),[time,setTime]=useState('');
 const [booked,setBooked]=useState(null);
 const [availability,setAvailability]=useState({key:'',times:[]}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[review,setReview]=useState(false),[refresh,setRefresh]=useState(0);
 const selectedBarber=barbers.find(b=>b._id===barber),selectedService=appointment && booked?{_id:booked.service,name:booked.serviceName,durationMinutes:booked.durationMinutes}:selectedBarber?.services.find(s=>s._id===service);
 const key=[barber,service,date,refresh].join('/');
 useEffect(()=>{if(appointment)api.get('/appointments/'+appointment).then(r=>{setBooked(r.data);setBarber(r.data.barber);setService(r.data.service);}).catch(e=>setError(errorMessage(e)));},[appointment]);
 useEffect(()=>{api.get('/barbers').then(r=>setBarbers(r.data)).catch(e=>setError(errorMessage(e)));},[]);
 useEffect(()=>{
  if(!barber || !service || !date) return;
  let active=true;
  api.get('/barbers/'+barber+'/availability',{params:{service,date,...(appointment?{appointment}:{})}}).then(r=>{if(active)setAvailability({key,times:r.data.times});}).catch(e=>{if(active){setAvailability({key,times:[]});setError(errorMessage(e));}});
  return ()=>{active=false;};
 },[barber,service,date,key,appointment]);
 const times=availability.key===key?availability.times:[];
 function reset() {setTime('');setReview(false);setError('');}
 async function submit(e) {
  e.preventDefault();setBusy(true);setError('');
  try {
   if(appointment) await api.patch('/appointments/'+appointment+'/reschedule',{date,time});
   else await api.post('/appointments',{barber,service,date,time});
   navigate('/appointments',{state:{message:appointment?'Your appointment has been rescheduled.':'Your appointment is confirmed. See you in the chair!'}});
  } catch(e) {setError(errorMessage(e));setRefresh(r=>r+1);setTime('');setReview(false);}
  finally {setBusy(false);}
 }
 return <><p className="eyebrow">{appointment?'A CHANGE OF PLANS':'YOUR NEXT FRESH START'}</p><h1>{appointment?'Reschedule your appointment':'Book a chair'}</h1><p className="muted">Choose your barber first. All times are Philippine time.</p>
  {error && <div role="alert" className="alert alert-danger">{error}</div>}
  <form className="row g-4" onSubmit={submit}><div className="col-lg-8"><div className="panel">
   <h2 className="step-heading"><span>01</span> Barber & service</h2>
   <label htmlFor="barber" className="form-label">Your barber</label><select id="barber" className="form-select mb-3" value={barber} required disabled={!!appointment} onChange={e=>{setBarber(e.target.value);setService('');reset();}}><option value="">Choose a barber</option>{barbers.map(b=><option key={b._id} value={b._id}>{b.user.name}</option>)}</select>
   <label htmlFor="service" className="form-label">Service</label><select id="service" className="form-select" value={service} required disabled={!barber || !!appointment} onChange={e=>{setService(e.target.value);reset();}}><option value="">Choose a service</option>{(appointment && selectedService?[selectedService]:selectedBarber?.services)?.map(s=><option key={s._id} value={s._id}>{s.name} · {s.durationMinutes} minutes</option>)}</select>
   <h2 className="step-heading mt-4"><span>02</span> Date & time</h2>
   <label htmlFor="date" className="form-label">Appointment date</label><input id="date" className="form-control mb-3" type="date" min={today()} required value={date} onChange={e=>{setDate(e.target.value);reset();}}/>
   {service && (availability.key!==key?<p role="status">Finding available times…</p>:times.length?<fieldset><legend className="form-label">Available start times</legend><div className="time-grid">{times.map(t=><button type="button" aria-pressed={time===t} className={'time-button '+(time===t?'selected':'')} key={t} onClick={()=>{setTime(t);setReview(false);}}>{t}</button>)}</div></fieldset>:<div className="empty-state">No available times for this service on this date. Try another date.</div>)}
  </div></div><aside className="col-lg-4"><div className="panel booking-summary"><p className="eyebrow">YOUR APPOINTMENT</p><h2>{selectedService?.name || 'A little time for yourself.'}</h2><dl><dt>Barber</dt><dd>{selectedBarber?.user.name || 'Choose your barber'}</dd><dt>Duration</dt><dd>{selectedService?selectedService.durationMinutes+' minutes':'—'}</dd><dt>When</dt><dd>{date}{time?' at '+time:''}</dd></dl><p className="muted small">Instant confirmation. Lunch is 12–1 PM. Your full service duration is reserved.</p>
   {!review?<button type="button" disabled={!time || !selectedService} className="btn btn-primary w-100" onClick={()=>setReview(true)}>Review appointment</button>:<><div className="alert alert-info">Please check your barber, service, date, and time above.</div><button disabled={busy || !times.includes(time)} className="btn btn-primary w-100">{busy?'Securing your time…':appointment?'Confirm new time':'Confirm booking'}</button><button type="button" className="btn btn-link w-100" onClick={()=>setReview(false)}>Keep choosing</button></>}
  </div></aside></form>
 </>;
}
