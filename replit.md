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

## Recent Updates - Sprint 1: Marketing & Conversion (October 2025)
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

## Configuration Required
### Crisp Chat Setup
1. Sign up for Crisp Chat at https://crisp.chat (free tier available)
2. Get your CRISP_WEBSITE_ID from the Crisp dashboard
3. Update `my-app/src/components/CrispChat.jsx`:
   ```javascript
   window.CRISP_WEBSITE_ID = "YOUR_CRISP_WEBSITE_ID"; // Replace with your actual ID
   ```
4. The chat widget will appear on all pages (landing + authenticated app)