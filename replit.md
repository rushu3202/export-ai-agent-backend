# Export AI Agent

## Overview
A full-stack AI-powered web application for automating export documentation and compliance. The application helps businesses streamline their international trade processes with intelligent automation.

**Status**: Production Ready ✅  
**Last Updated**: October 6, 2025

## Features

### 1. Dashboard
- Real-time statistics tracking
- Feature overview cards
- Quick navigation to all tools

### 2. Invoice Generator
- Professional export invoice generation
- Automatic HS code assignment using AI
- Multi-currency support (USD, EUR, GBP, INR, JPY)
- PDF export functionality

### 3. Export Forms Assistant
- AI-guided form filling for:
  - Shipping Bills
  - Bill of Lading
  - Packing Lists
  - Certificate of Origin
- Intelligent field suggestions
- PDF document generation

### 4. AI Chat Assistant
- Expert export advisor powered by OpenAI
- Real-time help with:
  - Export procedures and documentation
  - HS code classification
  - Customs compliance
  - Shipping and logistics
  - International trade regulations

### 5. Shipment Tracker
- Track international shipments
- Real-time status updates
- Comprehensive shipment details

## Technology Stack

### Frontend
- React 18 with React Router
- Tailwind CSS v3 for styling
- Vite for build tooling
- Responsive design with mobile support

### Backend
- Node.js with Express 5
- OpenAI GPT-4-mini integration
- PDFKit for document generation
- RESTful API architecture

## Project Structure

```
/
├── my-app/                 # React frontend source
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   └── Layout.jsx  # Main app layout with sidebar
│   │   ├── pages/          # Page components
│   │   │   ├── Home.jsx
│   │   │   ├── InvoiceGenerator.jsx
│   │   │   ├── ExportForms.jsx
│   │   │   ├── AIChatAssistant.jsx
│   │   │   └── ShipmentTracker.jsx
│   │   ├── App.jsx         # React Router configuration
│   │   └── index.css       # Tailwind CSS imports
│   ├── dist/               # Production build output
│   └── package.json        # Frontend dependencies
├── dist/                   # Copied production files
├── index.js                # Express server (production entry point)
├── build-copy.js           # Build script to copy frontend to /dist
└── package.json            # Backend dependencies
```

## API Endpoints

### Invoice Generation
- **POST** `/generate-invoice`
  - Generates professional invoices with AI-powered HS codes
  - Returns: PDF download

### AI Chat Assistant
- **POST** `/api/ask-ai`
  - Provides expert export advice
  - Body: `{ message: string }`
  - Returns: `{ response: string }`

### Form Assistance
- **POST** `/api/fill-form`
  - AI-guided form filling suggestions
  - Body: `{ formType: string, formData: object }`
  - Returns: `{ suggestion: string }`

### Form Generation
- **POST** `/api/generate-form`
  - Generates completed export forms as PDFs
  - Body: `{ formType: string, formData: object }`
  - Returns: PDF download

### Health Check
- **GET** `/health`
  - Server health status
  - Returns: `{ status: "ok", timestamp: string }`

## Configuration

### Environment Variables
- `OPENAI_API_KEY` - OpenAI API key for AI features (configured ✅)
- `PORT` - Server port (default: 5000)

### Build & Deployment
1. Frontend build: `cd my-app && npm run build`
2. Copy to dist: `node build-copy.js`
3. Server runs on port 5000
4. All static files served from `/dist`

## Technical Notes

### Express 5 Compatibility
- Using middleware-based SPA fallback instead of wildcard routes
- Middleware checks: GET requests, non-API paths, no file extensions
- Properly serves React Router client-side routes

### OpenAI Integration
- Graceful fallback when API key not configured
- HS code generation for invoice items
- Export expertise chatbot
- Form filling assistance

### Production Ready
- Optimized production builds
- Proper cache control headers
- Health check endpoint for monitoring
- Error handling and validation
- Secure secrets management

## Development Workflow

### Frontend Development
```bash
cd my-app
npm install
npm run dev  # Development server
npm run build  # Production build
```

### Backend Development
```bash
npm install
node index.js  # Starts server on port 5000
```

### Full Build Process
```bash
cd my-app && npm run build  # Build React app
node build-copy.js          # Copy to /dist
# Server auto-restarts via workflow
```

## Recent Changes (Oct 6, 2025)

1. ✅ Created complete React dashboard with sidebar navigation
2. ✅ Implemented all 5 feature pages with professional UI
3. ✅ Built backend API endpoints for AI features
4. ✅ Fixed Express 5 SPA routing compatibility
5. ✅ Integrated OpenAI for HS codes and chat assistance
6. ✅ Configured production deployment
7. ✅ Tested all pages and routing

## Next Steps (Optional Enhancements)

1. Add user authentication
2. Implement database for storing invoices and forms
3. Add email functionality for sending documents
4. Integrate real shipment tracking APIs
5. Add export analytics and reporting
6. Multi-language support
7. Dark mode theme option

## User Preferences
- Professional, clean UI design
- Comprehensive export automation features
- AI-powered assistance throughout
- Production-ready deployment on Replit
