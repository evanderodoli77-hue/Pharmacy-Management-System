💊 PharmTrack: Real-Time Pharmacy Management System

PharmTrack is a modern, single-page web application (SPA) designed to streamline key operations for small to medium-sized pharmacies, focusing on inventory control and point-of-sale (POS) transactions.

The system is built using React for a responsive frontend and leverages Google Firestore for real-time, scalable data persistence.

✨ Key Features

Real-Time Dashboard: Get instant visual insights into key metrics, including total stock value, revenue, and recent sales transactions.

Inventory Management (CRUD): Easily add, view, update, and delete medicine records.

Stock Alerts: Visual indicators for items that are low in stock (quantity ≤ 10) or approaching their expiry date (within 60 days).

Point-of-Sale (POS) System: A fast and intuitive interface for searching inventory, building customer carts, and processing sales.

Automatic Stock Deduction: When a sale is processed, the corresponding stock quantity is deducted from the inventory in real-time.

Scalable Architecture: Utilizes Firestore, allowing for quick, concurrent updates across multiple users (e.g., multiple cashiers or pharmacists).

💻 Technology Stack

While the initial design envisioned a Node.js/Express and MySQL setup, this implementation utilizes a modern, serverless-friendly stack for a high-performance, real-time application delivered in a single file:

Component

Technology

Purpose

Frontend

React (Functional Components, Hooks)

Building a responsive, component-based user interface.

Styling

Tailwind CSS

Utility-first CSS framework for rapid, mobile-first design.

Database

Google Firestore

Real-time, NoSQL cloud database for inventory and sales data.

Authentication

Firebase Auth

Secure user authentication for access control.

📦 Project Structure

The entire application logic is contained within a single React component file, adhering to modern development practices by isolating concerns within different React components (InventoryManager, SalesPoint, Dashboard).

pharmacy-management/
├── PharmacyManagementApp.jsx  <-- All core logic, UI, and Firebase interactions
└── README.md


▶️ Setup and Installation

A. Running in a Collaborative Environment (Canvas/Sandbox)

If running within the environment where this code was generated, the setup is automatic:

Ensure the PharmacyManagementApp.jsx file is loaded.

Click the Preview button.

Firebase authentication and configuration are automatically injected via global variables (__app_id, __firebase_config, __initial_auth_token), allowing the app to connect and synchronize data immediately.

B. Local Development Setup

To run this application locally on your computer, you must:

Initialize a React Project: Use Vite or Create React App.

Install Dependencies:

npm install firebase tailwindcss


Firebase Project: Create your own Google Firebase project and configure Firestore and Authentication.

Replace Configuration: Replace the placeholder global variables (__firebase_config, etc.) within PharmacyManagementApp.jsx with your actual Firebase project credentials to enable database connectivity.

Run: Start your local development server (e.g., npm run dev).

🔮 Future Enhancements

Prescription Tracking: Add a module to manage prescription validity and refills.

User Roles: Implement role-based access control (Admin, Pharmacist, Cashier) for the UI elements.

Supplier Management: Track purchase orders and supplier information.

PDF Reporting: Integrate a client-side library to generate printable daily/monthly sales reports.
