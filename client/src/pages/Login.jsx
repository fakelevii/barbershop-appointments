import { useState } from 'react';
import { Link,useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { api,errorMessage } from '../lib/api';
export default function Login({register=false}) {
 const {setUser}=useAuth(),navigate=useNavigate();
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e) {
  e.preventDefault();setError('');setBusy(true);
  try {const result=await api.post('/auth/'+(register?'register':'login'),{name,email,password});setUser(result.data);navigate('/appointments');}
  catch(e) {setError(errorMessage(e));} finally {setBusy(false);}
 }
 return <div className="auth-card panel"><p className="eyebrow">THE BARBER ROOM</p><h1>{register?'Make yourself at home.':'Welcome back.'}</h1><p className="muted">{register?'Create your customer account to book your next appointment.':'Log in to manage your appointments.'}</p>
  {error && <div role="alert" className="alert alert-danger">{error}</div>}
  <form onSubmit={submit}>
   {register && <div className="mb-3"><label className="form-label" htmlFor="name">Full name</label><input id="name" autoComplete="name" className="form-control" value={name} onChange={e=>setName(e.target.value)} required maxLength={80}/></div>}
   <div className="mb-3"><label className="form-label" htmlFor="email">Email address</label><input id="email" type="email" autoComplete="email" className="form-control" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
   <div className="mb-4"><label className="form-label" htmlFor="password">Password</label><input id="password" type="password" autoComplete={register?'new-password':'current-password'} className="form-control" value={password} onChange={e=>setPassword(e.target.value)} required minLength={register?10:undefined} maxLength={72}/>{register && <small className="muted">At least 10 characters.</small>}</div>
   <button disabled={busy} className="btn btn-primary w-100">{busy?'Please wait…':register?'Create account':'Log in'}</button>
  </form><p className="mt-4 mb-0">{register?'Already have an account?':'New here?'} <Link to={register?'/login':'/register'}>{register?'Log in':'Create an account'}</Link></p>
 </div>;
}
