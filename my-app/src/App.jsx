import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './components/Toast';
import { Analytics } from './components/Analytics';
import CookieConsent from './components/CookieConsent';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Home from './pages/Home';
import InvoiceGenerator from './pages/InvoiceGenerator';
import InvoiceHistory from './pages/InvoiceHistory';
import Contacts from './pages/Contacts';
import HSFinder from './pages/HSFinder';
import ExportForms from './pages/ExportForms';
import AIChatAssistant from './pages/AIChatAssistant';
import ShipmentTracker from './pages/ShipmentTracker';
import ProfileBilling from './pages/ProfileBilling';
import Settings from './pages/Settings';
import Pricing from './pages/Pricing';
import Success from './pages/Success';
import Cancel from './pages/Cancel';
import Marketplace from './pages/Marketplace';
import CreateListing from './pages/CreateListing';
import MyListings from './pages/MyListings';
import ListingDetail from './pages/ListingDetail';
import MarketplaceLeads from './pages/MarketplaceLeads';
import ExportFormsHistory from './pages/ExportFormsHistory';
import './App.css';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
      <Analytics />
      <CookieConsent />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/success" element={<ProtectedRoute><Success /></ProtectedRoute>} />
        <Route path="/cancel" element={<ProtectedRoute><Cancel /></ProtectedRoute>} />
        <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Home />} />
          <Route path="invoice" element={<InvoiceGenerator />} />
          <Route path="invoices" element={<InvoiceHistory />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="hs-finder" element={<HSFinder />} />
          <Route path="export-forms" element={<ExportForms />} />
          <Route path="export-forms-history" element={<ExportFormsHistory />} />
          <Route path="chat" element={<AIChatAssistant />} />
          <Route path="shipment" element={<ShipmentTracker />} />
          <Route path="profile" element={<ProfileBilling />} />
          <Route path="settings" element={<Settings />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="marketplace/create" element={<CreateListing />} />
          <Route path="marketplace/my-listings" element={<MyListings />} />
          <Route path="marketplace/listing/:id" element={<ListingDetail />} />
          <Route path="marketplace/leads" element={<MarketplaceLeads />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
