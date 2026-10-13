import axios from 'axios';
import { useEffect, useState } from 'react';
import './App.css'

function App() {
  const [students, setStudents] = useState([]);
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [age, setAge] = useState('');
  const [editingId, setEditingId] = useState(null);

  const handleEdit = (id) => {
    const studentToEdit = students.find(student => student._id === id);
    setName(studentToEdit.name);
    setCourse(studentToEdit.course);
    setAge(studentToEdit.age);
    setEditingId(id);
  };
  

useEffect(() => {
  axios.get('http://localhost:5000/students')
    .then(response => {
      setStudents(response.data);
    })
}, []);

  return (
    <>
      <h1>Student Management System</h1>
      <br></br>

      <h2>Add Student</h2>
      <input 
        placeholder='Name' 
        value={name} 
        onChange={(e) => setName(e.target.value)} 
      />
      <br></br>
      
      <input 
        placeholder='Course' 
        value={course} 
        onChange={(e) => setCourse(e.target.value)} 
      />
      <br></br>
      
      <input 
        placeholder='Age' 
        value={age} 
        onChange={(e) => setAge(e.target.value)} 
      />
      <br></br>

      <button onClick={() => {
        if (editingId) {
          // Update existing student
          axios.put(`http://localhost:5000/students/${editingId}`, { name, course, age })
            .then(response => {
              setStudents(students.map(student => 
                student._id === editingId ? response.data : student
              ));
              setEditingId(null);
              setName('');
              setCourse('');
              setAge('');
            });
        } else {
          // Add new student
          axios.post('http://localhost:5000/students', { name, course, age })
            .then(response => {
              setStudents([...students, response.data]);
              setName('');
              setCourse('');
              setAge('');
            });
        }
      }}> 
        {editingId ? 'Update Student' : 'Add Student'}
      </button>

      <h2>Students</h2>

      {students.map((student) => (
        <div key={student.id}>
          <p>Name: {student.name}</p>
          <p>Course: {student.course}</p>
          <p>Age: {student.age}</p>
          <br></br>
          <button onClick={() => { 
            handleEdit(student._id);
          }}>
            Edit
          </button>
          <button onClick={() => {
            axios.delete(`http://localhost:5000/students/${student._id}`)
              .then(() => {
                setStudents(students.filter(s => s._id !== student._id));
              });
          }}>
            Delete
          </button>
        </div>
      ))}
    </>
  )
}

export default App
