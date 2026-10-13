import { useEffect, useState } from 'react';
import { AuthContext } from './auth-context';
import { api } from './lib/api';
export default function AuthProvider({children}) {
 const [user,setUser]=useState(null),[loading,setLoading]=useState(true);
 useEffect(()=>{api.get('/me').then(r=>setUser(r.data)).catch(()=>setUser(null)).finally(()=>setLoading(false));},[]);
 return <AuthContext.Provider value={{user,setUser,loading}}>{children}</AuthContext.Provider>;
}
