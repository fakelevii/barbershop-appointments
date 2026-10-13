import { useEffect,useState } from 'react';
import { useAuth } from '../auth-context';
import { api,errorMessage,today } from '../lib/api';
export default function Schedule() {
 const {user}=useAuth();
 const [barbers,setBarbers]=useState([]),[barber,setBarber]=useState(''),[date,setDate]=useState(today()),[record,setRecord]=useState(null),[loadedKey,setLoadedKey]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const key=barber+'/'+date,loaded=loadedKey===key;
 useEffect(()=>{api.get('/barbers').then(r=>{const list=user.role==='admin'?r.data:r.data.filter(b=>b.user._id===user._id);setBarbers(list);setBarber(list[0]?._id || '');}).catch(e=>setError(errorMessage(e)));},[user]);
 useEffect(()=>{
  if(!barber || !date)return;
  let active=true;
  api.get('/barbers/'+barber+'/schedule',{params:{date}}).then(r=>{if(active){setRecord(r.data);setLoadedKey(key);}}).catch(e=>{if(active)setError(errorMessage(e));});
  return ()=>{active=false;};
 },[barber,date,key]);
 async function save(e){
  e.preventDefault();setBusy(true);setError('');setMessage('');
  try{const r=await api.put('/barbers/'+barber+'/schedule',{date,closed:record.closed,workingHours:record.workingHours,blocked:record.blocked});setRecord(r.data);setMessage('Availability updated. Confirmed appointments have been preserved.');}
  catch(e){setError(errorMessage(e));}finally{setBusy(false);}
 }
 return <><p className="eyebrow">MAKE ROOM FOR YOUR DAY</p><h1>Manage availability</h1><p className="muted">Lunch is always blocked from 12–1 PM. Sunday is closed. Changes cannot overlap confirmed appointments.</p>
  {error && <div role="alert" className="alert alert-danger">{error}</div>}{message && <div role="status" className="alert alert-success">{message}</div>}
  <div className="panel"><div className="row g-3 mb-4"><div className="col-md-6"><label htmlFor="schedule-barber" className="form-label">Barber</label><select id="schedule-barber" className="form-select" value={barber} onChange={e=>{setBarber(e.target.value);setMessage('');setError('');}}>{barbers.map(b=><option key={b._id} value={b._id}>{b.user.name}</option>)}</select></div><div className="col-md-6"><label htmlFor="schedule-date" className="form-label">Date</label><input id="schedule-date" type="date" min={today()} className="form-control" value={date} onChange={e=>{setDate(e.target.value);setMessage('');setError('');}}/></div></div>
   {!loaded?<p role="status">Loading schedule…</p>:<form onSubmit={save}>
    <div className="form-check mb-3"><input id="closed" type="checkbox" className="form-check-input" checked={record.closed} onChange={e=>setRecord({...record,closed:e.target.checked})}/><label className="form-check-label" htmlFor="closed">Unavailable all day</label></div>
    <div className="row g-3 mb-4">{['start','end'].map(field=><div className="col-sm-6" key={field}><label htmlFor={'working-'+field} className="form-label">{field==='start'?'Start of workday':'End of workday'}</label><input id={'working-'+field} type="time" min="09:00" max="18:00" step="900" required className="form-control" value={record.workingHours[field]} onChange={e=>setRecord({...record,workingHours:{...record.workingHours,[field]:e.target.value}})}/></div>)}</div>
    <h2>Blocked periods</h2><p className="muted">Add time off or breaks in addition to lunch.</p>
    {record.blocked.map((block,i)=><div className="row g-2 align-items-end mb-3" key={i}>{['start','end'].map(field=><div className="col-6 col-md-3" key={field}><label htmlFor={'block-'+i+'-'+field} className="form-label">{field==='start'?'From':'Until'}</label><input id={'block-'+i+'-'+field} type="time" required className="form-control" value={block[field]} onChange={e=>setRecord({...record,blocked:record.blocked.map((b,j)=>j===i?{...b,[field]:e.target.value}:b)})}/></div>)}<div className="col-9 col-md-4"><label className="form-label" htmlFor={'reason-'+i}>Reason (optional)</label><input id={'reason-'+i} className="form-control" maxLength={200} value={block.reason || ''} onChange={e=>setRecord({...record,blocked:record.blocked.map((b,j)=>j===i?{...b,reason:e.target.value}:b)})}/></div><div className="col-3 col-md-2"><button type="button" className="btn btn-outline-danger w-100" onClick={()=>setRecord({...record,blocked:record.blocked.filter((_,j)=>j!==i)})}>Remove</button></div></div>)}
    <div className="d-flex gap-3 mt-4"><button type="button" disabled={record.blocked.length>=30} className="btn btn-outline-secondary" onClick={()=>setRecord({...record,blocked:[...record.blocked,{start:'14:00',end:'15:00',reason:''}]})}>Add blocked period</button><button disabled={busy} className="btn btn-primary">{busy?'Saving…':'Save availability'}</button></div>
   </form>}
  </div>
 </>;
}
