import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './store/auth.js';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import Search from './pages/patient/Search.jsx';
import Book from './pages/patient/Book.jsx';
import MyAppointments from './pages/patient/MyAppointments.jsx';
import Calendar from './pages/doctor/Calendar.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';

export default function App() {
  const { setSession, setReady } = useAuth();

  // Restaure la session au chargement grâce au cookie refresh
  useEffect(() => {
    axios.post('/api/auth/refresh', null, { withCredentials: true })
      .then(({ data }) => setSession(data))
      .catch(() => {})
      .finally(setReady);
  }, [setSession, setReady]);

  return (
    <BrowserRouter>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Search />} />
          <Route path="/medecin/:id" element={<Book />} />
          <Route element={<ProtectedRoute roles={['PATIENT']} />}>
            <Route path="/mes-rdv" element={<MyAppointments />} />
          </Route>
          <Route element={<ProtectedRoute roles={['MEDECIN', 'SECRETAIRE']} />}>
            <Route path="/calendrier" element={<Calendar />} />
          </Route>
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/admin" element={<Dashboard />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}