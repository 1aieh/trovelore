# Testing Script

This script provides step-by-step instructions for testing all major features of the Trovelore dashboard application.

## Setup Testing Environment

1. Start the development server:
```bash
npm run dev
```

2. Open your browser to http://localhost:3000

## Authentication Testing

### Admin Login
1. Navigate to the login page
2. Enter admin credentials:
   - Email: admin@trovelore.com
   - Password: [your admin password]
3. Verify you're redirected to the dashboard
4. Verify admin navigation shows all sections including Users management

### User Management Testing
1. Navigate to Users page
2. Create a new Portugal Office user:
   - Name: Portugal Office Test
   - Email: portugal@trovelore.com
   - Password: [secure password]
   - Role: Portugal Office
3. Create a new Viewer user:
   - Name: Viewer Test
   - Email: viewer@trovelore.com
   - Password: [secure password]
   - Role: Viewer
4. Edit the Viewer user and change their name
5. Log out and log in as the Portugal Office user
6. Verify you can access the Portugal Office view
7. Verify you cannot access the Users management page
8. Log out and log in as the Viewer user
9. Verify you cannot access the Portugal Office view or Users management

## Order Management Testing

### Shopify Sync Testing
1. Log in as Admin
2. Navigate to the dashboard
3. Click "Sync with Shopify"
4. Verify orders are imported successfully
5. Check that order details match Shopify data

### Manual Order Creation
1. Navigate to Orders page
2. Click "Add Order"
3. Fill in all required fields:
   - Order Reference: TEST-001
   - Buyer information
   - Products with quantities and prices
   - Shipping details
4. Submit the form
5. Verify the new order appears in the orders list
6. Open the order details page
7. Verify all information is displayed correctly

### Order Editing
1. Find an existing order
2. Click "Edit"
3. Modify several fields
4. Save changes
5. Verify changes are reflected in the order details

## Payment Tracking Testing

### Recording Payments
1. Navigate to an unpaid order
2. Click "Record Payment"
3. Select "Deposit" payment type
4. Enter 25% of the total amount
5. Submit the payment
6. Verify payment status changes to "Deposit Paid"
7. Record final payment
8. Verify payment status changes to "Paid"

### Payment Reminders
1. Navigate to Payments page
2. Filter for orders with pending deposits
3. Select several orders
4. Click "Send Deposit Reminders"
5. Verify confirmation message
6. Check email logs to confirm reminders were recorded

## Email Notification Testing

### Template Customization
1. Navigate to Email Templates page
2. Select "Deposit Reminder" template
3. Modify the subject and content
4. Save changes
5. Verify changes are saved

### Sending Custom Email
1. Navigate to an order's details
2. Click "Send Email"
3. Select "Custom Email"
4. Enter a subject and message
5. Send the email
6. Verify the email is logged in the order's email history

## Portugal Office View Testing

### Incoming Orders
1. Log in as Portugal Office user
2. Navigate to Portugal Office view
3. Check the "Incoming Orders" tab
4. Verify orders in production are displayed
5. Verify order details are accessible

### Shipping Management
1. Navigate to "Ready to Ship" tab
2. Select an order
3. View order details
4. Verify shipping information is displayed
5. Verify buyer contact information is accessible

## Block Management Testing

1. Log in as Admin
2. Navigate to Blocks page
3. Create a new block:
   - Name: Test Block April 2025
   - Shipping Month: April 2025
4. Add several orders to the block
5. Verify orders show the correct block assignment
6. Generate a block report
7. Verify all orders in the block are included

## Report Generation Testing

1. Navigate to Reports page
2. Generate a payment status report
3. Verify report includes all orders with correct payment information
4. Generate a shipping status report
5. Verify report includes all orders with correct shipping information

## Mobile Responsiveness Testing

1. Use browser developer tools to simulate mobile device
2. Test navigation menu functionality
3. Verify all pages display correctly on small screens
4. Test form submission on mobile view
5. Verify tables adapt to small screens

## Error Handling Testing

1. Attempt to create an order with missing required fields
2. Verify appropriate error messages
3. Attempt to record a payment larger than the order total
4. Verify validation prevents the action
5. Simulate offline state and test application behavior
6. Verify appropriate error handling for API failures

## Performance Testing

1. Load the orders page with 100+ orders
2. Verify page loads within acceptable time
3. Test filtering and sorting with large dataset
4. Verify Shopify sync handles large order volumes
5. Test email sending with multiple recipients

## Security Testing

1. Attempt to access protected routes without authentication
2. Verify redirection to login page
3. Log in as Viewer and attempt to access admin routes
4. Verify access is denied
5. Test input fields with potentially malicious content
6. Verify proper sanitization and validation
