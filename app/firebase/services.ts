import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';
import { Reservation, VenueType, StaffMember } from '../types';

// Venues
export const getVenues = async (): Promise<VenueType[]> => {
  const venuesCollection = collection(db, 'venues');
  const venuesSnapshot = await getDocs(venuesCollection);
  return venuesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as VenueType));
};

export const getVenueById = async (id: string): Promise<VenueType | null> => {
  const venueDoc = doc(db, 'venues', id);
  const venueSnapshot = await getDoc(venueDoc);
  
  if (!venueSnapshot.exists()) {
    return null;
  }
  
  return {
    id: venueSnapshot.id,
    ...venueSnapshot.data()
  } as VenueType;
};

export const addVenue = async (venue: Omit<VenueType, 'id'>): Promise<string> => {
  const venuesCollection = collection(db, 'venues');
  const docRef = await addDoc(venuesCollection, venue);
  return docRef.id;
};

// Staff
export const getStaffMembers = async (): Promise<StaffMember[]> => {
  const staffCollection = collection(db, 'staff');
  const staffSnapshot = await getDocs(staffCollection);
  return staffSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as StaffMember));
};

// Reservations
export const getReservations = async (): Promise<Reservation[]> => {
  const reservationsCollection = collection(db, 'reservations');
  const q = query(reservationsCollection, orderBy('startDate'), orderBy('startTime'));
  const reservationsSnapshot = await getDocs(q);
  
  return reservationsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Reservation));
};

export const getReservationsByVenue = async (venueId: string): Promise<Reservation[]> => {
  const reservationsCollection = collection(db, 'reservations');
  const q = query(
    reservationsCollection, 
    where('venueId', '==', venueId),
    orderBy('startDate'),
    orderBy('startTime')
  );
  const reservationsSnapshot = await getDocs(q);
  
  return reservationsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Reservation));
};

export const getTodayReservations = async (): Promise<Reservation[]> => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const reservationsCollection = collection(db, 'reservations');
  const q = query(
    reservationsCollection,
    where('startDate', '<=', today),
    where('endDate', '>=', today),
    orderBy('startDate'),
    orderBy('startTime')
  );
  const reservationsSnapshot = await getDocs(q);
  
  return reservationsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Reservation));
};

export const getUpcomingReservations = async (): Promise<Reservation[]> => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const reservationsCollection = collection(db, 'reservations');
  const q = query(
    reservationsCollection,
    where('startDate', '>', today),
    orderBy('startDate'),
    orderBy('startTime')
  );
  const reservationsSnapshot = await getDocs(q);
  
  return reservationsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Reservation));
};

export const addReservation = async (reservation: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  // Check for time conflicts
  const existingReservations = await getReservationsByVenue(reservation.venueId);
  
  const hasConflict = existingReservations.some(existing => {
    // Check for date overlap
    const existingStartDate = existing.startDate;
    const existingEndDate = existing.endDate;
    const newStartDate = reservation.startDate;
    const newEndDate = reservation.endDate;
    
    // If dates don't overlap, there's no conflict
    if (newEndDate < existingStartDate || newStartDate > existingEndDate) {
      return false;
    }
    
    // If dates overlap, check time overlap
    const existingStartTime = existing.startTime;
    const existingEndTime = existing.endTime;
    const newStartTime = reservation.startTime;
    const newEndTime = reservation.endTime;
    
    // Check if times overlap
    return !(newEndTime <= existingStartTime || newStartTime >= existingEndTime);
  });
  
  if (hasConflict) {
    throw new Error('Time conflict: Another event is already scheduled for this venue during the selected time');
  }
  
  const reservationsCollection = collection(db, 'reservations');
  const docRef = await addDoc(reservationsCollection, {
    ...reservation,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  return docRef.id;
};

export const updateReservation = async (id: string, data: Partial<Reservation>): Promise<void> => {
  const reservationDoc = doc(db, 'reservations', id);
  await updateDoc(reservationDoc, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const deleteReservation = async (id: string): Promise<void> => {
  const reservationDoc = doc(db, 'reservations', id);
  await deleteDoc(reservationDoc);
}; 