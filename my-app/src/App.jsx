import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import InvoiceGenerator from './pages/InvoiceGenerator';
import ExportForms from './pages/ExportForms';
import AIChatAssistant from './pages/AIChatAssistant';
import ShipmentTracker from './pages/ShipmentTracker';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="invoice" element={<InvoiceGenerator />} />
          <Route path="export-forms" element={<ExportForms />} />
          <Route path="chat" element={<AIChatAssistant />} />
          <Route path="shipment" element={<ShipmentTracker />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
