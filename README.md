# README.md

# Trovelore Dashboard

A comprehensive order management dashboard for tracking orders, buyers, and shipping blocks with Shopify integration.

## Overview

This application provides a complete solution for managing the order workflow from initial customer contact through payment processing to shipping. It features:

- Shopify API integration for automatic order import
- Payment tracking with 25% deposit system
- Block management for grouping orders for shipping
- Email notification system for payment reminders and shipping updates
- Role-based access control for different user types

## Tech Stack

- **Frontend**: Next.js, Shadcn UI, React
- **Backend**: Next.js API routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **API Integration**: Shopify API

## Workflow

The application implements the following workflow:

1. Orders are received via email or created in Shopify
2. Orders are imported into the dashboard via Shopify API
3. 25% deposit is requested from customers
4. Upon deposit payment, orders are placed into production blocks
5. When ready to ship, final payment is requested
6. After payment, orders are shipped from India to Portugal
7. Portugal office receives order details and manages delivery

## Features

### Order Management
- Comprehensive order listing with filtering and sorting
- Detailed order view with payment and shipping information
- Order creation and editing forms
- Product management within orders

### Payment Tracking
- 25% deposit system with automatic calculation
- Payment recording interface
- Payment status visualization
- Payment reminder system

### Block Management
- Group orders into shipping blocks
- Track block shipping status
- Generate block reports for production

### Email Notifications
- Customizable email templates
- Automated payment reminders
- Shipping notifications
- Email history tracking

### Role-Based Access
- Admin view with full access
- Portugal Office view focused on shipping and delivery
- Viewer role for read-only access

## Getting Started

See the [DEPLOYMENT.md](./DEPLOYMENT.md) file for detailed setup and deployment instructions.

For testing procedures, refer to the [TESTING.md](./TESTING.md) file.

## License

Proprietary - All rights reserved
