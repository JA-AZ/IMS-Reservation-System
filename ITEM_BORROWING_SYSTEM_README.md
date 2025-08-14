# Item Borrowing System

## Overview

The Item Borrowing System is an integrated feature within the existing venue reservation system that allows users to borrow specific items for short-term or long-term periods. This system provides comprehensive management of inventory items and borrowing requests with conflict detection and status tracking.

## Features

### 1. Item Management
- **Display all items** in a table/list format
- **Item status tracking**: Available, Borrowed, Out of Service, Maintenance
- **Add new items** to the inventory
- **Delete existing items** from the inventory
- **Edit item details** including name, description, serial number, status, and category

### 2. Borrowing Calendar
- **Daily calendar view** showing time slots from 7:00 AM to 10:00 PM
- **4 consecutive days** per page view
- **Navigation controls** to browse different date ranges
- **Visual indicators** showing:
  - Reserved time slots (Yellow)
  - Confirmed bookings (Green)
  - Cancelled reservations (Red)
  - Available time slots (Gray)
- **Click functionality** to view booking details

### 3. Borrowing Reservation Form
- **Borrower's Name** (required)
- **Teacher/Adviser Name** (required)
- **Department** (required)
- **Items selection** (dropdown/checkbox list from available items)
- **Date picker** (required)
- **Time selection** (start and end time, 7 AM - 10 PM)
- **Room/Location** where items will be used
- **Received By** (staff member handling the transaction)
- **Status** (Reserved, Confirmed, Cancelled - defaults to "Reserved")

### 4. Booking Management
- **Table displaying all bookings** with sortable columns
- **Filter options** by:
  - Date range (Today, Tomorrow, This Week, Next Week)
  - Status (Reserved, Confirmed, Cancelled)
  - Department
  - Search functionality across all fields
- **Actions for each booking**:
  - View details
  - Edit booking
  - Change status
  - Cancel/Delete booking

## Database Requirements

### Firebase Collections

#### 1. `items` Collection
```typescript
{
  id: string;                    // Auto-generated document ID
  name: string;                  // Item name/title
  description: string;           // Item description
  serialNumber: string;          // Unique serial number
  status: ItemStatus;            // Available, Borrowed, Out of Service, Maintenance
  category?: string;             // Optional category
  createdAt: Timestamp;          // Auto-generated timestamp
  updatedAt: Timestamp;          // Auto-updated timestamp
}
```

#### 2. `itemBorrowings` Collection
```typescript
{
  id: string;                    // Auto-generated document ID
  borrowerName: string;          // Name of the person borrowing
  teacherAdviserName: string;    // Name of teacher/adviser
  department: string;            // Department name
  itemIds: string[];             // Array of item IDs being borrowed
  items: Item[];                 // Populated items for display (computed field)
  date: string;                  // Date in YYYY-MM-DD format
  startTime: string;             // Start time in HH:MM format
  endTime: string;               // End time in HH:MM format
  roomLocation: string;          // Room or location where items will be used
  receivedBy: string;            // Staff member handling the transaction
  status: ItemBorrowingStatus;   // Reserved, Confirmed, Cancelled
  bookedOn: Timestamp;           // Auto-generated timestamp when booking was created
  createdAt: Timestamp;          // Auto-generated timestamp
  updatedAt: Timestamp;          // Auto-updated timestamp
}
```

### Database Rules

#### Security Rules for `items` Collection
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /items/{itemId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

#### Security Rules for `itemBorrowings` Collection
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /itemBorrowings/{borrowingId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### Indexes Required

The following composite indexes should be created in Firebase:

1. **items collection**:
   - `name` (Ascending)

2. **itemBorrowings collection**:
   - `date` (Ascending) + `startTime` (Ascending)
   - `date` (Ascending) + `status` (Ascending)

## Technical Implementation

### File Structure
```
app/
├── items/
│   ├── page.tsx                    # Items Management Page
│   ├── new/
│   │   └── page.tsx               # New Item Form
│   └── edit/
│       └── [id]/
│           └── page.tsx           # Edit Item Form
├── item-borrowings/
│   ├── page.tsx                    # Borrowing Management Page
│   ├── [id]/
│   │   └── page.tsx               # Borrowing Details Page
│   └── edit/
│       └── [id]/
│           └── page.tsx           # Edit Borrowing Form
├── new-item-borrowing/
│   └── page.tsx                    # New Borrowing Request Form
├── item-borrowing-calendar/
│   └── page.tsx                    # Borrowing Calendar View
├── components/
│   └── ...                        # Existing components
├── firebase/
│   └── services.ts                # Updated with item borrowing services
└── types/
    └── index.ts                   # Updated with new types
```

### Key Components

#### 1. Item Management Components
- **ItemsPage**: Main items listing with CRUD operations
- **NewItemPage**: Form for adding new items
- **EditItemPage**: Form for editing existing items

#### 2. Borrowing Management Components
- **ItemBorrowingsPage**: Main borrowing requests listing with filters
- **NewItemBorrowingPage**: Form for creating new borrowing requests
- **ItemBorrowingCalendarPage**: Visual calendar view

#### 3. Firebase Services
- **Item CRUD operations**: `getItems`, `addItem`, `updateItem`, `deleteItem`
- **Borrowing CRUD operations**: `getItemBorrowings`, `addItemBorrowing`, `updateItemBorrowing`, `deleteItemBorrowing`
- **Conflict detection**: Prevents overlapping reservations for the same items
- **Data population**: Automatically populates item details in borrowing records

### Conflict Detection

The system automatically detects and prevents:
- **Time conflicts**: Multiple borrowings of the same item during overlapping time periods
- **Item availability**: Only allows borrowing of items with "Available" status
- **Date validation**: Prevents booking in the past

### Status Management

#### Item Statuses
- **Available**: Item can be borrowed
- **Borrowed**: Item is currently borrowed
- **Out of Service**: Item is not available for borrowing
- **Maintenance**: Item is under maintenance

#### Borrowing Statuses
- **Reserved**: Initial status when request is created
- **Confirmed**: Request has been approved and confirmed
- **Cancelled**: Request has been cancelled

## Usage Instructions

### 1. Setting Up Items
1. Navigate to **Items** in the sidebar
2. Click **Add New Item** to create inventory items
3. Fill in required fields: Name, Description, Serial Number, Status
4. Optionally add a category for organization

### 2. Creating Borrowing Requests
1. Navigate to **New Item Borrowing** in the sidebar
2. Fill in borrower and department information
3. Select items to borrow from available inventory
4. Choose date and time slots (7 AM - 10 PM)
5. Specify room/location and staff member
6. Submit the request

### 3. Managing Borrowings
1. Navigate to **Item Borrowings** to view all requests
2. Use filters to find specific requests
3. Click on actions to view, edit, or delete requests
4. Update status as needed (Reserved → Confirmed → Completed)

### 4. Calendar View
1. Navigate to **Item Borrowing Calendar** for visual overview
2. Use navigation arrows to browse different date ranges
3. Click on booking entries to view details
4. Identify available time slots for new requests

## Integration with Existing System

The Item Borrowing System is fully integrated with the existing venue reservation system:

- **Shared authentication** and user management
- **Consistent UI/UX** design patterns
- **Unified navigation** through the sidebar
- **Similar data structures** and validation patterns
- **Consistent error handling** and user feedback

## Future Enhancements

Potential improvements for future versions:

1. **Email notifications** for booking confirmations and reminders
2. **Bulk operations** for managing multiple items or borrowings
3. **Reporting and analytics** for usage patterns
4. **QR code generation** for item tracking
5. **Mobile app** for on-the-go management
6. **Integration with external systems** (inventory management, student information systems)

## Troubleshooting

### Common Issues

1. **Items not showing as available**: Check item status in Items management
2. **Time conflict errors**: Verify no overlapping bookings exist for selected items
3. **Calendar not loading**: Check Firebase connection and data structure
4. **Permission errors**: Ensure user is authenticated and has proper access

### Debug Information

Enable console logging for debugging:
```typescript
// In Firebase services
console.log('Fetching items:', items);
console.log('Checking conflicts:', hasConflict);
```

## Support

For technical support or questions about the Item Borrowing System, please refer to the main system documentation or contact the development team.
