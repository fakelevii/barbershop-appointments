module.exports = {
  services: [
    { name: 'Haircut', durationMinutes: 30 },
    { name: 'Clean shave', durationMinutes: 15 },
    { name: 'Hair coloring', durationMinutes: 90 },
    { name: 'Hair art', durationMinutes: 60 }
  ],
  barbers: [
    { name: 'John Doe', email: 'john.doe@example.com', services: ['Haircut', 'Clean shave', 'Hair coloring'] },
    { name: 'James Smith', email: 'james.smith@example.com', services: ['Haircut', 'Clean shave', 'Hair art'] },
    { name: 'Michael Brown', email: 'michael.brown@example.com', services: ['Haircut', 'Clean shave'] },
    { name: 'David Wilson', email: 'david.wilson@example.com', services: ['Haircut', 'Clean shave'] }
  ]
};
