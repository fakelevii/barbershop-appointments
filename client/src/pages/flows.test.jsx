import { afterEach,beforeEach,describe,it,expect,vi } from 'vitest';
import { cleanup,render,screen,waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter,Route,Routes } from 'react-router-dom';
import { AuthContext } from '../auth-context';
import { api } from '../lib/api';
import Booking from './Booking';
import Barbers from './Barbers';
import Login from './Login';
import Schedule from './Schedule';
vi.mock('../lib/api',()=>({
 api:{get:vi.fn(),post:vi.fn(),patch:vi.fn(),put:vi.fn()},
 errorMessage:e=>e.response?.data?.message || 'Request failed',
 today:()=> '2030-01-07'
}));
const customer={_id:'customer',name:'Customer',role:'customer'};
const haircut={_id:'haircut',name:'Haircut',durationMinutes:30};
const barber={_id:'john',user:{_id:'barber-user',name:'John Doe'},services:[haircut]};
function show(element,path='/',user=customer) {
 return render(<AuthContext.Provider value={{user,setUser:vi.fn(),loading:false}}><MemoryRouter initialEntries={[path]}><Routes><Route path="*" element={element}/><Route path="/appointments" element={<h1>Appointment history</h1>}/></Routes></MemoryRouter></AuthContext.Provider>);
}
beforeEach(()=>{
 vi.resetAllMocks();
 api.get.mockImplementation(path=>{
  if(path==='/barbers')return Promise.resolve({data:[barber]});
  if(path.includes('/availability'))return Promise.resolve({data:{times:['09:00','09:15','09:30']}});
  if(path.includes('/schedule'))return Promise.resolve({data:{closed:false,workingHours:{start:'09:00',end:'18:00'},blocked:[]}});
  if(path.startsWith('/appointments/'))return Promise.resolve({data:{_id:'booking',barber:'john',service:'retired',serviceName:'Original haircut',durationMinutes:30}});
  return Promise.reject(new Error('Unexpected route '+path));
 });
});
afterEach(cleanup);
describe('customer and barber flows',()=>{
 it('lists the barber and only their offered service',async()=>{
  show(<Barbers/>);
  expect(await screen.findByRole('heading',{name:'John Doe'})).toBeTruthy();
  expect(screen.getByText('Haircut · 30m')).toBeTruthy();
  expect(screen.queryByText(/Hair coloring/)).toBeNull();
 });
 it('books after barber, service, time and review selection',async()=>{
  api.post.mockResolvedValue({data:{status:'confirmed'}});
  const user=userEvent.setup();show(<Booking/>);
  await screen.findByRole('option',{name:'John Doe'});
  await user.selectOptions(screen.getByLabelText('Your barber'),'john');
  await user.selectOptions(screen.getByLabelText('Service'),'haircut');
  await user.click(await screen.findByRole('button',{name:'09:15'}));
  await user.click(screen.getByRole('button',{name:'Review appointment'}));
  await user.click(screen.getByRole('button',{name:'Confirm booking'}));
  await screen.findByRole('heading',{name:'Appointment history'});
  expect(api.post).toHaveBeenCalledWith('/appointments',{barber:'john',service:'haircut',date:'2030-01-07',time:'09:15'});
 });
 it('failed booking shows conflict without successful navigation',async()=>{
  api.post.mockRejectedValue({response:{data:{message:'That time is no longer available'}}});
  const user=userEvent.setup();show(<Booking/>,'/book?barber=john');
  await screen.findByRole('option',{name:'Haircut · 30 minutes'});
  await user.selectOptions(screen.getByLabelText('Service'),'haircut');
  await user.click(await screen.findByRole('button',{name:'09:00'}));
  await user.click(screen.getByRole('button',{name:'Review appointment'}));
  await user.click(screen.getByRole('button',{name:'Confirm booking'}));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByRole('heading',{name:'Appointment history'})).toBeNull();
 });
 it('reschedules a retired service using the booked snapshot',async()=>{
  api.patch.mockResolvedValue({data:{status:'confirmed'}});
  const user=userEvent.setup();show(<Booking/>,'/book?appointment=booking&barber=john&service=retired');
  expect(await screen.findByRole('option',{name:'Original haircut · 30 minutes'})).toBeTruthy();
  await user.click(await screen.findByRole('button',{name:'09:15'}));
  await user.click(screen.getByRole('button',{name:'Review appointment'}));
  await user.click(screen.getByRole('button',{name:'Confirm new time'}));
  await screen.findByRole('heading',{name:'Appointment history'});
  expect(api.patch).toHaveBeenCalledWith('/appointments/booking/reschedule',{date:'2030-01-07',time:'09:15'});
 });
 it('registration sends customer details and displays server errors',async()=>{
  api.post.mockRejectedValue({response:{data:{message:'This record already exists'}}});
  const user=userEvent.setup();show(<Login register/>);
  await user.type(screen.getByLabelText('Full name'),'Test Customer');
  await user.type(screen.getByLabelText('Email address'),'test@example.com');
  await user.type(screen.getByLabelText('Password'),'ExamplePassword123!');
  await user.click(screen.getByRole('button',{name:'Create account'}));
  expect((await screen.findByRole('alert')).textContent).toBe('This record already exists');
  expect(api.post).toHaveBeenCalledWith('/auth/register',{name:'Test Customer',email:'test@example.com',password:'ExamplePassword123!'});
 });
 it('barber saves time off with working hours',async()=>{
  api.put.mockResolvedValue({data:{closed:false,workingHours:{start:'09:00',end:'18:00'},blocked:[{start:'14:00',end:'15:00',reason:''}]}});
  const user=userEvent.setup();show(<Schedule/>,'/schedule',{_id:'barber-user',name:'John Doe',role:'barber'});
  await screen.findByRole('button',{name:'Save availability'});
  await user.click(screen.getByRole('button',{name:'Add blocked period'}));
  await user.click(screen.getByRole('button',{name:'Save availability'}));
  await waitFor(()=>expect(api.put).toHaveBeenCalledWith('/barbers/john/schedule',{date:'2030-01-07',closed:false,workingHours:{start:'09:00',end:'18:00'},blocked:[{start:'14:00',end:'15:00',reason:''}]}));
 });
});
