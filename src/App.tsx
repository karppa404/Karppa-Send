import { Routes, Route } from 'react-router-dom';
import Index from './pages/index';
import Connect from './pages/connect';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/connect/:sessionId" element={<Connect />} />
    </Routes>
  );
}