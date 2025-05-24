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
};

export type ReservationStatus = 'Processing' | 'Reserved' | 'Confirmed' | 'Cancelled';

export type Reservation = {
  id: string;
  venueId: string;
  venueName: string;
  department: string;
  eventTitle: string;
  reservedBy: string;
  email: string;
  startDate: string;
  endDate: string; // Same as startDate for single-day events
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  receivedBy: string;
  notes?: string; // Optional notes/details field
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}; 