# Export AI Agent - Professional SaaS Platform

## Overview
The Export AI Agent is a full-stack SaaS platform designed to automate export documentation and ensure compliance for international trade. It offers AI-powered tools to streamline various export processes, enabling users to generate invoices, complete forms, track shipments, and receive expert advice. The platform includes robust user authentication, subscription management via Stripe, and data persistence, making it a production-ready solution for businesses involved in global trade. The project aims to provide a professional, monetized service that simplifies complex export procedures and reduces manual effort.

## User Preferences
- Professional SaaS platform design
- Complete monetization with Stripe
- User authentication and data persistence
- Real-time statistics and user profiles
- Production-ready for investors and customers
- Comprehensive export automation features
- AI-powered assistance throughout

## System Architecture
The platform is built with a React frontend and a Node.js/Express backend.
- **UI/UX**: Features a professional, responsive design using React 18, Tailwind CSS v3, and Framer Motion for animations.
- **Authentication**: Utilizes Supabase Auth for user management, supporting Google OAuth and email/password logins, with protected routes.
- **Subscription & Billing**: Integrated with Stripe for subscription plans (Free/Pro), checkout flows, and customer portal management, with webhook integration for status updates.
- **Database**: Supabase PostgreSQL handles data persistence for user profiles, invoices, export forms, chat history, and shipments, enforced with Row Level Security (RLS).
- **Key Features**:
    - **Dashboard**: Displays user-specific statistics with AI Insights (monthly metrics, top clients, export value).
    - **Invoice Generator**: Creates professional PDF invoices with AI-assigned HS codes, auto-fill from contacts, and AI product description suggestions.
    - **Export Document Generator**: AI-guided completion and PDF generation for 4 export forms (Shipping Bill, Bill of Lading, Packing List, Certificate of Origin) with contact auto-fill.
    - **AI Chat Assistant**: OpenAI GPT-4-mini powered expert for trade advice with quick action buttons and country-specific guidance.
    - **Contacts/CRM**: Manage business contacts with Excel export and integration throughout the platform.
    - **HS Code Finder**: AI-powered harmonized system code search and assignment.
    - **Invoice History**: Track and search all generated invoices with advanced filtering.
    - **Shipment Tracker**: Provides real-time international shipment updates.
    - **Profile & Billing Page**: Manages user subscriptions and billing via Stripe.
- **Technical Implementations**:
    - Frontend: React 18, React Router, Vite, Axios.
    - Backend: Node.js, Express 5, PDFKit for document generation, RESTful API.
    - Express 5 compatibility ensures proper Stripe webhook handling and SPA fallback.
    - Secure session management and environment variable usage for sensitive data.

## External Dependencies
- **Supabase**: Provides authentication services and PostgreSQL database hosting.
- **Stripe**: Handles all payment processing, subscription management, and customer billing portals.
- **OpenAI**: Powers AI features such as HS code assignment, expert chat assistance (GPT-4-mini), and AI-guided form filling.
- **Crisp Chat**: Live chat widget for 24/7 customer support (requires setup - see Configuration below).

## Recent Updates - Production Audit & Optimization (October 2025)

### Platform Hardening - Completed Tasks (3/10)

**Task 1: Professional Toast Notification System** ✅
- Created comprehensive Toast component library (ToastProvider with useToast hook)
- 4 toast types: success, error, warning, info with beautiful gradient design
- Timer cleanup with useEffect (prevents memory leaks)
- Monotonic ID generation (prevents collisions)
- Mobile responsive positioning (left-4 right-4 on mobile, right-4 on desktop)
- Replaced all 19 alert() calls across 10 pages with professional toasts
- Created ConfirmDialog component to replace blocking confirm() dialogs
- Non-blocking modals with backdrop blur and animations

**Task 2: Loading Skeletons** ✅
- Built LoadingSkeleton component library with 6 skeleton types:
  - TableSkeleton (dynamic columns with inline CSS Grid)
  - CardSkeleton (responsive card grids)
  - ListSkeleton (list with avatars)
  - FormSkeleton (form fields)
  - StatsSkeleton (gradient stats cards)
  - SearchResultSkeleton (search results with badges)
- Integrated across 6 data-fetching pages (Contacts, HS Finder, Export Forms, Invoice History, Dashboard, Marketplace)
- Smooth transitions from skeleton → actual content
- Professional loading UX replaces generic spinners

**Task 3: Upgrade Prompt Integration** ✅
- Integrated UpgradePrompt modal into HS Finder and Export Forms (matching Invoice Generator)
- Shows beautiful upgrade modal when quota limits reached (402/403 status)
- Consistent upgrade flow across all quota-limited features
- Clear CTAs to Pro plan with benefits and pricing
- Non-blocking modals with "Maybe Later" option

**Task 4: Form Validation System** ✅
- Built comprehensive validation utilities (`validation.js`):
  - Reusable validators: required, email, phone, minLength, maxLength, pattern, number ranges
  - useFormValidation custom hook with nested field support (dot notation like "address.city")
  - Helper functions: setNestedValue/getNestedValue for nested object/array handling
- Created ValidatedInput component library (ValidatedInput, ValidatedTextarea, ValidatedSelect):
  - Visual error indicators: red border, AlertCircle icon, error message
  - Touch state management (shows errors only after blur)
  - Consistent styling across all forms
- Backend validation middleware (server.js):
  - validateContact: Name required, email format, phone format, type validation
  - validateInvoice: Seller/buyer names, items array, currency, per-item validation
  - validateListing: Title 5+ chars, description 20+ chars, category, price, quantity
  - Applied to 5 endpoints: POST/PUT contacts, POST invoice, POST/PUT listings
  - Returns 400 with `{error, details: []}` for structured error handling
- Integrated into Contacts form with complete validation flow
- Frontend/backend validation synchronized for consistent user experience

### Pending Audit Tasks (6/10)
5. Settings page (company info, currency/language, subscription display)
6. React error boundary with fallback UI
7. Reusable UI components library expansion
8. ShipmentTracker authenticated API refactor
9. Document history page with filtering
10. Analytics integration (Google Analytics or PostHog)

## Sprint 1: Marketing & Conversion (October 2025)
### High-Converting Landing Page
- **Professional Landing Page**: Animated hero section with ship + world map animations, clear USP
- **Conversion Elements**: Multiple CTAs (Start Free, Book Demo, Upgrade), trust badges, testimonials
- **Trust & Security**: Stats display (10,000+ users, 150+ countries), partner logos, verified company info
- **Company Footer**: EXPORTAGENT LTD details, company number, address, contact information
- **Routing Update**: "/" = public landing, "/app/*" = authenticated app, "/login" = authentication
- **Live Chat Integration**: Crisp Chat widget on all pages for customer support

### SEO Optimization & Mobile Responsiveness
- **Comprehensive SEO**: Dynamic meta tags, Open Graph, Twitter Cards, JSON-LD structured data
- **Mobile Optimization**: Responsive viewport, theme color, Apple mobile app support, PWA-ready
- **Performance**: Preconnect to fonts/APIs, DNS prefetch for Stripe/OpenAI
- **Search Engine Features**: Rich snippets with company info, 4.9/5 ratings, structured data schema

### User Onboarding & Dashboard Tour
- **4-Step Onboarding Flow**: 
  - Step 1: Business type selection (Manufacturer, Trader, Service Provider)
  - Step 2: Company details (name, address, industry)
  - Step 3: Primary goal selection (invoices, documents, HS codes, marketplace)
  - Step 4: Get started CTAs (Create Invoice, Upgrade to Pro, Skip)
  - Automatically shows on first login, marks onboarding_completed in database
  
- **Interactive Dashboard Tour**:
  - AI-powered product tour with tooltips and highlights
  - 4-step walkthrough: Stats Section → AI Insights → Quick Actions → Sidebar Navigation
  - Each step includes AI assistant tips and best practices
  - Shows after onboarding completion (dashboard_tour_completed flag)
  - Progress indicators, skip option, smooth animations
  
- **Database Schema Updates**:
  - Added: onboarding_completed, dashboard_tour_completed (boolean)
  - Added: industry, business_type, primary_goal (varchar)
  - Backend endpoints: /api/complete-onboarding, /api/complete-dashboard-tour
  - All authenticated with Supabase session tokens

### 7-Day Free Trial System
- **Trial Management**:
  - Added trial_ends_at timestamp field to user_profiles
  - Automatic trial initialization: 7 days from signup
  - Backend endpoint: /api/trial-status (calculates days left, trial status)
  - Trial banner shows days remaining with color-coded urgency
  - Trial expired modal with upgrade prompt
  
- **Upgrade Prompts**:
  - Beautiful modal with three variants: trial_expired, quota_exceeded, feature_locked
  - Shows Pro plan benefits and £9.99/month pricing
  - Integrated into invoice generator (shows when quota exceeded)
  - Dashboard shows trial banner when trial is active
  - Modal includes money-back guarantee and secure payment info
  
- **Trial Flow**:
  1. User signs up → trial_ends_at set to 7 days from now
  2. Dashboard shows trial banner with days left
  3. Color-coded urgency: Blue (3+ days), Amber (1-2 days), Red (expiring today)
  4. When trial expires → upgrade modal appears
  5. When quota exceeded → upgrade modal appears
  6. Pro users → no trial banner or limits

## Configuration Required
### Crisp Chat Setup
1. Sign up for Crisp Chat at https://crisp.chat (free tier available)
2. Get your CRISP_WEBSITE_ID from the Crisp dashboard
3. Update `my-app/src/components/CrispChat.jsx`:
   ```javascript
   window.CRISP_WEBSITE_ID = "YOUR_CRISP_WEBSITE_ID"; // Replace with your actual ID
   ```
4. The chat widget will appear on all pages (landing + authenticated app)