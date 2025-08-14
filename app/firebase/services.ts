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
import { 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { db, auth } from './config';
import { Reservation, VenueType, StaffMember, Item, ItemBorrowing, ItemStatus, ItemBorrowingStatus } from '../types';

// Authentication services
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const createUser = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

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

export const updateVenue = async (id: string, data: Partial<VenueType>): Promise<void> => {
  const venueDoc = doc(db, 'venues', id);
  await updateDoc(venueDoc, {
    ...data,
    updatedAt: serverTimestamp()
  });
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
  const reservationsSnapshot = await getDocs(reservationsCollection);
  
  const reservations = reservationsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Reservation));
  
  // Sort by startDate first, then by startTime in JavaScript
  reservations.sort((a, b) => {
    if (a.startDate !== b.startDate) {
      return a.startDate.localeCompare(b.startDate);
    }
    return a.startTime.localeCompare(b.startTime);
  });
  
  return reservations;
};

export const getReservationsByVenue = async (venueId: string): Promise<Reservation[]> => {
  const reservationsCollection = collection(db, 'reservations');
  const q = query(
    reservationsCollection, 
    where('venueId', '==', venueId)
  );
  const reservationsSnapshot = await getDocs(q);
  
  const reservations = reservationsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Reservation));
  
  // Sort by startDate first, then by startTime in JavaScript
  reservations.sort((a, b) => {
    if (a.startDate !== b.startDate) {
      return a.startDate.localeCompare(b.startDate);
    }
    return a.startTime.localeCompare(b.startTime);
  });
  
  return reservations;
};

export const getTodayReservations = async (): Promise<Reservation[]> => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const reservationsCollection = collection(db, 'reservations');
  const q = query(
    reservationsCollection,
    where('startDate', '<=', today),
    where('endDate', '>=', today)
  );
  const reservationsSnapshot = await getDocs(q);
  
  const reservations = reservationsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Reservation));
  
  // Sort by startDate first, then by startTime in JavaScript
  reservations.sort((a, b) => {
    if (a.startDate !== b.startDate) {
      return a.startDate.localeCompare(b.startDate);
    }
    return a.startTime.localeCompare(b.startTime);
  });
  
  return reservations;
};

export const getUpcomingReservations = async (): Promise<Reservation[]> => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const reservationsCollection = collection(db, 'reservations');
  const q = query(
    reservationsCollection,
    where('startDate', '>', today)
  );
  const reservationsSnapshot = await getDocs(q);
  
  const reservations = reservationsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Reservation));
  
  // Sort by startDate first, then by startTime in JavaScript
  reservations.sort((a, b) => {
    if (a.startDate !== b.startDate) {
      return a.startDate.localeCompare(b.startDate);
    }
    return a.startTime.localeCompare(b.startTime);
  });
  
  return reservations;
};

export const addReservation = async (reservation: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  // Check for time conflicts
  const existingReservations = await getReservationsByVenue(reservation.venueId);
  
  const hasConflict = existingReservations.some(existing => {
    // Ignore cancelled reservations
    if (existing.status === 'Cancelled') return false;
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
  // Only check for conflicts if all required fields are present
  const requiredFields = [
    'venueId', 'startDate', 'endDate', 'startTime', 'endTime'
  ];
  const hasAllFields = requiredFields.every(field => (data as any)[field]);

  if (hasAllFields) {
    const venueId = (data as any).venueId;
    const startDate = (data as any).startDate;
    const endDate = (data as any).endDate;
    const startTime = (data as any).startTime;
    const endTime = (data as any).endTime;

    // Fetch all reservations for this venue
    const existingReservations = await getReservationsByVenue(venueId);

    const hasConflict = existingReservations.some(existing => {
      // Ignore cancelled reservations and the reservation being edited
      if (existing.status === 'Cancelled' || existing.id === id) return false;
      // Check for date overlap
      if (endDate < existing.startDate || startDate > existing.endDate) {
        return false;
      }
      // If dates overlap, check time overlap
      return !(endTime <= existing.startTime || startTime >= existing.endTime);
    });

    if (hasConflict) {
      throw new Error('Time conflict: Another event is already scheduled for this venue during the selected time');
    }
  }

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

export const getReservation = async (id: string): Promise<Reservation | null> => {
  try {
    const reservationDoc = doc(db, 'reservations', id);
    const reservationSnap = await getDoc(reservationDoc);
    
    if (reservationSnap.exists()) {
      const reservationData = reservationSnap.data() as Omit<Reservation, 'id'>;
      return {
        id: reservationSnap.id,
        ...reservationData
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching reservation:', error);
    throw error;
  }
}; 

// Item Management Services
export const getItems = async (): Promise<Item[]> => {
  const itemsCollection = collection(db, 'items');
  const q = query(itemsCollection, orderBy('name'));
  const itemsSnapshot = await getDocs(q);
  
  return itemsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Item));
};

export const getItemById = async (id: string): Promise<Item | null> => {
  const itemDoc = doc(db, 'items', id);
  const itemSnapshot = await getDoc(itemDoc);
  
  if (!itemSnapshot.exists()) {
    return null;
  }
  
  return {
    id: itemSnapshot.id,
    ...itemSnapshot.data()
  } as Item;
};

export const addItem = async (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const itemsCollection = collection(db, 'items');
  const docRef = await addDoc(itemsCollection, {
    ...item,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateItem = async (id: string, data: Partial<Item>): Promise<void> => {
  const itemDoc = doc(db, 'items', id);
  await updateDoc(itemDoc, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const deleteItem = async (id: string): Promise<void> => {
  const itemDoc = doc(db, 'items', id);
  await deleteDoc(itemDoc);
};

// Item Borrowing Services
export const getItemBorrowings = async (): Promise<ItemBorrowing[]> => {
  const borrowingsCollection = collection(db, 'itemBorrowings');
  const borrowingsSnapshot = await getDocs(borrowingsCollection);
  
  const borrowings = borrowingsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as ItemBorrowing));
  
  // Sort by date first, then by startTime in JavaScript
  borrowings.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.startTime.localeCompare(b.startTime);
  });
  
  // Populate items for each borrowing
  const populatedBorrowings = await Promise.all(
    borrowings.map(async (borrowing) => {
      const items = await Promise.all(
        borrowing.itemIds.map((itemId: string) => getItemById(itemId))
      );
      return {
        ...borrowing,
        items: items.filter(item => item !== null) as Item[]
      };
    })
  );
  
  return populatedBorrowings;
};

export const getItemBorrowingsByDate = async (date: string): Promise<ItemBorrowing[]> => {
  const borrowingsCollection = collection(db, 'itemBorrowings');
  const q = query(
    borrowingsCollection,
    where('date', '==', date)
  );
  const borrowingsSnapshot = await getDocs(q);
  
  const borrowings = borrowingsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as ItemBorrowing));
  
  // Sort by startTime in JavaScript instead of Firestore
  borrowings.sort((a, b) => a.startTime.localeCompare(b.startTime));
  
  // Populate items for each borrowing
  const populatedBorrowings = await Promise.all(
    borrowings.map(async (borrowing) => {
      const items = await Promise.all(
        borrowing.itemIds.map((itemId: string) => getItemById(itemId))
      );
      return {
        ...borrowing,
        items: items.filter(item => item !== null) as Item[]
      };
    })
  );
  
  return populatedBorrowings;
};

export const getItemBorrowingById = async (id: string): Promise<ItemBorrowing | null> => {
  try {
    const borrowingDoc = doc(db, 'itemBorrowings', id);
    const borrowingSnap = await getDoc(borrowingDoc);
    
    if (borrowingSnap.exists()) {
      const borrowingData = borrowingSnap.data() as Omit<ItemBorrowing, 'id'>;
      
      // Populate items
      const items = await Promise.all(
        borrowingData.itemIds.map((itemId: string) => getItemById(itemId))
      );
      
      return {
        id: borrowingSnap.id,
        ...borrowingData,
        items: items.filter(item => item !== null) as Item[]
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching item borrowing:', error);
    throw error;
  }
};

export const addItemBorrowing = async (borrowing: Omit<ItemBorrowing, 'id' | 'items' | 'bookedOn' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  // Check for time conflicts for each item
  const existingBorrowings = await getItemBorrowingsByDate(borrowing.date);
  
  // Check each requested item for conflicts
  const conflictingItems: string[] = [];
  
  for (const itemId of borrowing.itemIds) {
    const hasConflict = existingBorrowings.some(existing => {
      // Ignore cancelled borrowings
      if (existing.status === 'Cancelled') return false;
      
      // Check if this item is in the existing borrowing
      if (!existing.itemIds.includes(itemId)) return false;
      
      // Check for time overlap
      const existingStartTime = existing.startTime;
      const existingEndTime = existing.endTime;
      const newStartTime = borrowing.startTime;
      const newEndTime = borrowing.endTime;
      
      // Check for any overlap (same item cannot be booked during overlapping times)
      if (newStartTime < existingEndTime && newEndTime > existingStartTime) {
        return true; // Conflict: overlapping times for the same item
      }
      
      return false; // No conflict
    });
    
    if (hasConflict) {
      // Get the item name for better error message
      const item = await getItemById(itemId);
      conflictingItems.push(item?.name || itemId);
    }
  }
  
  if (conflictingItems.length > 0) {
    throw new Error(`Time conflict: The following items are already borrowed during the selected time: ${conflictingItems.join(', ')}. Please choose different items or a different time slot.`);
  }
  
  const borrowingsCollection = collection(db, 'itemBorrowings');
  const docRef = await addDoc(borrowingsCollection, {
    ...borrowing,
    bookedOn: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  return docRef.id;
};

export const updateItemBorrowing = async (id: string, data: Partial<ItemBorrowing>): Promise<void> => {
  // Only check for conflicts if all required fields are present
  const requiredFields = ['itemIds', 'date', 'startTime', 'endTime'];
  const hasAllFields = requiredFields.every(field => (data as any)[field]);

  if (hasAllFields) {
    const itemIds = (data as any).itemIds;
    const date = (data as any).date;
    const startTime = (data as any).startTime;
    const endTime = (data as any).endTime;

    // Fetch all borrowings for this date
    const existingBorrowings = await getItemBorrowingsByDate(date);

    // Check each requested item for conflicts
    const conflictingItems: string[] = [];
    
    for (const itemId of itemIds) {
      const hasConflict = existingBorrowings.some(existing => {
        // Ignore cancelled borrowings and the borrowing being edited
        if (existing.status === 'Cancelled' || existing.id === id) return false;
        
        // Check if this item is in the existing borrowing
        if (!existing.itemIds.includes(itemId)) return false;
        
        // Check for time overlap
        const existingStartTime = existing.startTime;
        const existingEndTime = existing.endTime;
        
        // Check for any overlap (same item cannot be booked during overlapping times)
        if (startTime < existingEndTime && endTime > existingStartTime) {
          return true; // Conflict: overlapping times for the same item
        }
        
        return false; // No conflict
      });
      
      if (hasConflict) {
        // Get the item name for better error message
        const item = await getItemById(itemId);
        conflictingItems.push(item?.name || itemId);
      }
    }

    if (conflictingItems.length > 0) {
      throw new Error(`Time conflict: The following items are already borrowed during the selected time: ${conflictingItems.join(', ')}. Please choose different items or a different time slot.`);
    }
  }

  const borrowingDoc = doc(db, 'itemBorrowings', id);
  await updateDoc(borrowingDoc, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const deleteItemBorrowing = async (id: string): Promise<void> => {
  const borrowingDoc = doc(db, 'itemBorrowings', id);
  await deleteDoc(borrowingDoc);
}; 