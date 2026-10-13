import { useState } from 'react';
import { useAuth } from '../auth-context';
import { api,errorMessage } from '../lib/api';
export default function Profile() {
 const {user,setUser}=useAuth();
 const [name,setName]=useState(user.name),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e){e.preventDefault();setBusy(true);setError('');setMessage('');try{const r=await api.patch('/me',{name});setUser(r.data);setMessage('Your profile has been updated.');}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
 return <div className="auth-card panel"><p className="eyebrow">YOUR ACCOUNT</p><h1>Profile</h1>{error && <div role="alert" className="alert alert-danger">{error}</div>}{message && <div role="status" className="alert alert-success">{message}</div>}<form onSubmit={submit}><label htmlFor="profile-name" className="form-label">Full name</label><input id="profile-name" className="form-control mb-3" required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/><label htmlFor="profile-email" className="form-label">Email address</label><input id="profile-email" className="form-control mb-3" disabled value={user.email}/><p className="muted">Account type: {user.role}</p><button disabled={busy} className="btn btn-primary">{busy?'Saving…':'Save profile'}</button></form></div>;
}
