const test = require('node:test');
const assert = require('node:assert/strict');
let scheduling = {};
try { scheduling = require('../domain/availability'); } catch (e) { if(e.code !== 'MODULE_NOT_FOUND') throw e; }
const date='2030-01-07', now=new Date('2030-01-01T00:00:00Z');
function slots(options={}) {
  assert.equal(typeof scheduling.availableStarts,'function','Scheduling engine must exist');
  return scheduling.availableStarts({date,durationMinutes:30,now,...options});
}
test('15-minute starts, lunch and closing boundaries',()=>{
  const times=slots();
  assert.deepEqual(times.slice(0,4),['09:00','09:15','09:30','09:45']);
  for(const time of ['11:30','13:00','17:30']) assert.ok(times.includes(time));
  for(const time of ['11:45','12:00','12:45','17:45']) assert.ok(!times.includes(time));
});
test('90-minute appointments must fit fully before lunch and closing',()=>{
  const times=slots({durationMinutes:90});
  assert.ok(times.includes('10:30')); assert.ok(!times.includes('10:45'));
  assert.ok(times.includes('16:30')); assert.ok(!times.includes('16:45'));
});
test('Sunday closed',()=>assert.deepEqual(slots({date:'2030-01-06'}),[]));
test('bookings reject overlap and allow touching boundaries',()=>{
  const times=slots({busy:[{start:'09:30',end:'10:00'}]});
  assert.ok(times.includes('09:00')); assert.ok(times.includes('10:00'));
  for(const time of ['09:15','09:30','09:45']) assert.ok(!times.includes(time));
});
test('barber time off blocks full service',()=>{
  const times=slots({blocked:[{start:'14:00',end:'15:00'}]});
  assert.ok(times.includes('13:30')); assert.ok(times.includes('15:00'));
  assert.ok(!times.includes('13:45')); assert.ok(!times.includes('14:45'));
});
test('shorter hours still honor lunch',()=>{
  const times=slots({workingHours:{start:'10:00',end:'15:00'}});
  assert.equal(times[0],'10:00'); assert.equal(times.at(-1),'14:30');
  assert.ok(!times.includes('12:00'));
});
test('past date excluded',()=>assert.deepEqual(slots({now:new Date('2030-01-08T00:00:00Z')}),[]));
test('elapsed starts excluded in Philippine time',()=>assert.equal(slots({now:new Date('2030-01-07T01:10:00Z')})[0],'09:15'));
for(const invalid of ['2030-02-30','2030-13-01','2030-1-7','invalid'])
 test('invalid date '+invalid,()=>assert.throws(()=>slots({date:invalid}),/date/i));
for(const invalid of [0,-15,16,Infinity,'30'])
 test('invalid duration '+invalid,()=>assert.throws(()=>slots({durationMinutes:invalid}),/duration/i));
test('reject malformed intervals',()=>{
 assert.throws(()=>slots({blocked:[{start:'14:00',end:'13:00'}]}),/interval/i);
 assert.throws(()=>slots({busy:[{start:'25:00',end:'26:00'}]}),/time/i);
});
test('local booking converted to UTC',()=>{
 assert.equal(typeof scheduling.bookingInstant,'function');
 assert.equal(scheduling.bookingInstant(date,'09:00').toISOString(),'2030-01-07T01:00:00.000Z');
});
