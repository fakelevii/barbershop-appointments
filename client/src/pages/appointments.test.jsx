import { afterEach,beforeEach,it,expect,vi } from 'vitest';
import { cleanup,render,screen,waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth-context';
import { api } from '../lib/api';
import Appointments from './Appointments';
vi.mock('../lib/api',()=>({api:{get:vi.fn(),patch:vi.fn()},errorMessage:e=>e.response.data.message,displayDate:value=>value}));
const original='2030-01-07T01:00:00.000Z',requested='2030-01-07T02:00:00.000Z';
function show(role){render(<AuthContext.Provider value={{user:{name:'Test',role}}}><MemoryRouter><Appointments/></MemoryRouter></AuthContext.Provider>);}
beforeEach(()=>{vi.resetAllMocks();api.get.mockResolvedValue({data:{items:[{_id:'booking',service:'service',serviceName:'Haircut',durationMinutes:30,startAt:original,endAt:'2030-01-07T01:30:00.000Z',status:'confirmed',barber:{_id:'barber',user:{name:'John Doe'}},rescheduleRequest:{_id:'request',status:'pending',startAt:requested}}],total:1,pages:1,counts:{confirmed:1}}});api.patch.mockResolvedValue({data:{}});});
afterEach(cleanup);
it('customer sees both times and can withdraw but cannot approve or request twice',async()=>{
 show('customer');const user=userEvent.setup();await screen.findByText(original);expect(screen.getByText('Requested: '+requested)).toBeTruthy();expect(screen.queryByRole('link',{name:'Reschedule'})).toBeNull();expect(screen.queryByRole('button',{name:'Approve reschedule'})).toBeNull();await user.click(screen.getByRole('button',{name:'Withdraw request'}));await user.click(screen.getByRole('button',{name:'Confirm'}));await waitFor(()=>expect(api.patch).toHaveBeenCalledWith('/appointments/booking/reschedule/request',{action:'withdraw'}));
});
it.each(['approve','decline'])('barber can %s a request',async action=>{
 show('barber');const user=userEvent.setup();await user.click(await screen.findByRole('button',{name:action==='approve'?'Approve reschedule':'Decline reschedule'}));await user.click(screen.getByRole('button',{name:'Confirm'}));await waitFor(()=>expect(api.patch).toHaveBeenCalledWith('/appointments/booking/reschedule/request',{action}));
});
it('admin cannot approve, decline or withdraw',async()=>{
 show('admin');await screen.findByText('Reschedule pending');for(const name of ['Approve reschedule','Decline reschedule','Withdraw request'])expect(screen.queryByRole('button',{name})).toBeNull();
});
it('approval conflict shows error and retains original time',async()=>{
 api.patch.mockRejectedValue({response:{data:{message:'Requested time is no longer available'}}});show('barber');const user=userEvent.setup();await user.click(await screen.findByRole('button',{name:'Approve reschedule'}));await user.click(screen.getByRole('button',{name:'Confirm'}));await screen.findByText('Requested time is no longer available');expect(screen.getByText(original)).toBeTruthy();expect(screen.getByText('Reschedule pending')).toBeTruthy();
});
