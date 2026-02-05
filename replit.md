# Overview

This is a Material Management Group web application for DRDO (Defense Research and Development Organization) that manages supply orders and demand orders with comprehensive tracking capabilities. The system provides a complete procurement management solution with role-based access control, real-time monitoring, and data visualization features. It's designed to handle high concurrency with up to 150 homepage users and 100 authenticated users simultaneously.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Technology Stack
- **Backend Framework**: Node.js with Express.js for the web server
- **Database**: MySQL using mysql2 driver with connection pooling (hosted on sql.freedb.tech)
- **Authentication**: Custom role-based authentication system using bcryptjs for password hashing
- **Frontend**: Vanilla JavaScript with Tailwind CSS for styling
- **Real-time Communication**: Socket.IO for live updates and visitor tracking
- **Data Visualization**: Chart.js with multiple plugins for dashboard analytics
- **Session Management**: Express-session with memory store optimized for shared logins

## Authentication & Authorization
- **Role-based Access Control**: Four user roles (admin, viewer, king/gamer, permission/super_admin)
- **Security Features**: Password hashing with bcrypt (12 rounds), security question verification for password resets
- **Session Configuration**: 8-hour session duration optimized for shared login scenarios
- **Default Users**: Automatically creates system users on initialization with environment variable support

## Database Architecture
- **Connection Pool**: Optimized MySQL pool with 50 connections, 30-second timeouts, and automatic reconnection
- **Primary Tables**: 
  - Users table with role-based permissions
  - Supply orders table for tracking procurement orders
  - Demand orders table for managing procurement requests
- **Performance Optimization**: Connection limits and idle timeouts configured for high concurrency

## Frontend Architecture
- **Multi-page Application**: Separate interfaces for different user roles and functions
  - Homepage with visitor counter and analytics
  - Main dashboard for authenticated users
  - Permission management interface
  - Gaming portal for specific user role
- **Progressive Web App**: Service worker implementation for offline capability and caching
- **Responsive Design**: Tailwind CSS with dark mode support and mobile-first approach

## Real-time Features
- **Visitor Tracking**: Live visitor counter using Socket.IO
- **Session Management**: Real-time session monitoring and timeout warnings
- **Data Updates**: Live chart updates and data synchronization

## Data Processing & Analytics
- **Excel Integration**: XLSX library for import/export functionality
- **Chart Visualization**: Multiple chart types including delivery tracking, trend analysis, and comparison charts
- **Calculator Module**: Built-in calculation features for financial data processing

# External Dependencies

## Database Services
- **MySQL Database**: Hosted on sql.freedb.tech (freedb_sharma/freedb_shashank database)
- **Connection Details**: Hard-coded credentials in db.js (should be moved to environment variables)

## Third-party Libraries
- **Chart.js Ecosystem**: Core charting library with date-fns adapter, data labels plugin, and zoom plugin
- **Tailwind CSS**: Utility-first CSS framework loaded via CDN
- **Socket.IO**: Real-time bidirectional communication library
- **XLSX**: Excel file processing and generation
- **bcryptjs**: Password hashing and security functions

## Environment Configuration
- **Session Secret**: Configurable via SESSION_SECRET environment variable
- **Admin Credentials**: ADMIN_PASSWORD and SECURITY_ANSWER should be set in environment variables
- **Port Configuration**: Configurable via PORT environment variable (defaults to 5000)

## Security Considerations
- Database credentials are currently hard-coded and should be moved to environment variables
- Session secret has a fallback default value for development
- CORS is enabled for all origins in Socket.IO configuration
- Memory-based session store may not be suitable for production scaling

## Performance Optimizations
- Connection pooling configured for high concurrency (150 users)
- Service worker caching for static assets
- Session cleanup and memory management
- Optimized chart rendering and data processing