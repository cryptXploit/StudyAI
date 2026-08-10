# Frontend Setup & Auth Flow Guide

This guide explains how to configure and run the frontend application locally.

## Setup Instructions
1. Navigate to the rontend directory: cd frontend
2. Install dependencies: 
pm install
3. Copy the environment variables: cp .env.local.example .env.local
4. Run the development server: 
pm run dev

## Authentication Flows
- **Email/Password**: Users can sign up and login using their email. Supabase handles the password hashing and verification.
- **Google OAuth**: One-click login is supported via Supabase OAuth integrations. Ensure your Google Cloud Console has the correct redirect URI configured: https://<YOUR_SUPABASE_URL>/auth/v1/callback.

## Route Protection
Our middleware.ts automatically intercepts requests. If a user tries to access /dashboard without a valid session, they are redirected to /login?redirectTo=/dashboard.
