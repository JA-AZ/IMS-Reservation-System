// Types for the venue reservation system

export type VenueType = {
  id: string;
  name: string;
  capacity?: number;
  description?: string;
};

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  contactNo?: string;
};

export type ReservationStatus = 'Processing' | 'Reserved' | 'Confirmed' | 'Cancelled';

export type Reservation = {
  id: string;
  venueId: string;
  venueName: string;
  department: string;
  eventTitle: string;
  reservedBy: string;
  contactNo: string;
  startDate: string;
  endDate: string; // Same as startDate for single-day events
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  receivedBy: string;
  notes: string; // Notes/details field is now required
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
};

// Item Borrowing System Types
export type ItemStatus = 'Available' | 'Borrowed' | 'Out of Service' | 'Maintenance';

export type Item = {
  id: string;
  name: string;
  description: string;
  serialNumber: string;
  status: ItemStatus;
  category?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
};

export type ItemBorrowingStatus = 'Reserved' | 'Confirmed' | 'Cancelled';

export type ItemBorrowing = {
  id: string;
  borrowerName: string;
  teacherAdviserName: string;
  department: string;
  itemIds: string[];
  items: Item[]; // Populated items for display
  date: string; // Legacy field - kept for backward compatibility. Use startDate/endDate for new entries.
  startDate?: string; // Start date of borrowing (for date range or scattered dates)
  endDate?: string; // End date of borrowing (for date range or scattered dates)
  selectedDates?: string[]; // Array of selected dates for scattered date bookings
  startTime: string;
  endTime: string;
  roomLocation: string;
  receivedBy: string;
  status: ItemBorrowingStatus;
  bookedOn: any; // Firestore Timestamp
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}; 