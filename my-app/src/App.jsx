import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Home from './pages/Home';
import InvoiceGenerator from './pages/InvoiceGenerator';
import ExportForms from './pages/ExportForms';
import AIChatAssistant from './pages/AIChatAssistant';
import ShipmentTracker from './pages/ShipmentTracker';
import ProfileBilling from './pages/ProfileBilling';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Home />} />
          <Route path="invoice" element={<InvoiceGenerator />} />
          <Route path="export-forms" element={<ExportForms />} />
          <Route path="chat" element={<AIChatAssistant />} />
          <Route path="shipment" element={<ShipmentTracker />} />
          <Route path="profile" element={<ProfileBilling />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
