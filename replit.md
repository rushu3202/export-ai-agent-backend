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
- **UI/UX**: Features a professional, responsive design using React 18, Tailwind CSS v3, and Framer Motion for animations. Includes a professional toast notification system, loading skeletons, reusable UI components, and a comprehensive settings page.
- **Authentication**: Utilizes Supabase Auth for user management, supporting Google OAuth and email/password logins, with protected routes.
- **Subscription & Billing**: Integrated with Stripe for subscription plans (Free/Pro), checkout flows, and customer portal management, with webhook integration for status updates. Includes a 7-day free trial system with upgrade prompts.
- **Database**: Supabase PostgreSQL handles data persistence for user profiles, invoices, export forms, chat history, and shipments, enforced with Row Level Security (RLS).
- **Key Features**:
    - **Dashboard**: Displays user-specific statistics with AI Insights.
    - **Invoice Generator**: Creates professional PDF invoices with AI-assigned HS codes and auto-fill features.
    - **Export Document Generator**: AI-guided completion and PDF generation for various export forms.
    - **AI Chat Assistant**: OpenAI GPT-4-mini powered expert for trade advice.
    - **Contacts/CRM**: Manage business contacts with Excel export.
    - **HS Code Finder**: AI-powered harmonized system code search.
    - **Invoice History**: Track and search all generated invoices.
    - **Shipment Tracker**: Provides real-time international shipment updates.
    - **Profile & Billing Page**: Manages user subscriptions and billing via Stripe.
    - **Onboarding Flow**: 4-step user onboarding and an interactive dashboard tour.
- **Technical Implementations**:
    - Frontend: React 18, React Router, Vite, Axios.
    - Backend: Node.js, Express 5, PDFKit for document generation, RESTful API.
    - Comprehensive form validation system (frontend and backend).
    - Global React Error Boundary for robust error handling.
    - SEO optimization, mobile responsiveness, and performance enhancements for public-facing pages.

## External Dependencies
- **Supabase**: Provides authentication services and PostgreSQL database hosting.
- **Stripe**: Handles all payment processing, subscription management, and customer billing portals.
- **OpenAI**: Powers AI features such as HS code assignment, expert chat assistance (GPT-4-mini), and AI-guided form filling.
- **Crisp Chat**: Live chat widget for customer support.