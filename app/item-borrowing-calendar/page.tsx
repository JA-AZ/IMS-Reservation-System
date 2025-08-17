'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { ProtectedRoute } from '../context/AuthContext';
import { getItemBorrowingsByDate } from '../firebase/services';
import { ItemBorrowing, ItemBorrowingStatus } from '../types';
import Link from 'next/link';
import { FiChevronLeft, FiChevronRight, FiCalendar, FiClock, FiPackage, FiEdit, FiTrash2, FiChevronDown } from 'react-icons/fi';

export default function ItemBorrowingCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [borrowings, setBorrowings] = useState<{ [date: string]: ItemBorrowing[] }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadedDateRanges, setLoadedDateRanges] = useState<Set<string>>(new Set());
  const [fetchingDates, setFetchingDates] = useState<Set<string>>(new Set());
  const [selectedBorrowing, setSelectedBorrowing] = useState<ItemBorrowing | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });
  
  // Generate responsive date range (1-4 days based on screen size)
  const getDisplayDates = () => {
    const dates = [];
    const maxDays = typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 
                   typeof window !== 'undefined' && window.innerWidth < 768 ? 2 : 
                   typeof window !== 'undefined' && window.innerWidth < 1024 ? 3 : 4;
    
    for (let i = 0; i < maxDays; i++) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };
  
  // Generate time slots from 7 AM to 10 PM with 30-minute intervals
  const timeSlots: string[] = [];
  for (let hour = 7; hour <= 22; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 22) { // Don't add 30-minute slot for 10 PM
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }
  
  useEffect(() => {
    fetchBorrowingsForDates();
  }, [currentDate]);

  

  useEffect(() => {
    const handleResize = () => {
      setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    };

    // Set initial size
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const fetchBorrowingsForDates = async () => {
    try {
      const displayDates = getDisplayDates();
      const datesToFetch: string[] = [];
      
      // Check which dates need to be fetched
      for (const date of displayDates) {
        const dateString = date.toISOString().split('T')[0];
        if (!loadedDateRanges.has(dateString)) {
          datesToFetch.push(dateString);
        }
      }
      
      // If all dates are already loaded, no need to fetch
      if (datesToFetch.length === 0) {
        return;
      }
      
      setLoading(true);
      const newBorrowings = { ...borrowings };
      const newLoadedRanges = new Set(loadedDateRanges);
      const newFetchingDates = new Set(fetchingDates);
      
      for (const dateString of datesToFetch) {
        newFetchingDates.add(dateString);
        setFetchingDates(newFetchingDates);
        
                 try {
           const dateBorrowings = await getItemBorrowingsByDate(dateString);
           console.log(`Loaded ${dateBorrowings.length} borrowings for ${dateString}:`, dateBorrowings);
           newBorrowings[dateString] = dateBorrowings;
           newLoadedRanges.add(dateString);
        } catch (error) {
          console.error(`Error fetching borrowings for ${dateString}:`, error);
          newBorrowings[dateString] = [];
          newLoadedRanges.add(dateString);
        } finally {
          newFetchingDates.delete(dateString);
          setFetchingDates(new Set(newFetchingDates));
        }
      }
      
      setBorrowings(newBorrowings);
      setLoadedDateRanges(newLoadedRanges);
    } catch (error) {
      console.error('Error fetching borrowings:', error);
      setError('Failed to load borrowings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    const maxDays = screenSize.width < 640 ? 1 : screenSize.width < 768 ? 2 : screenSize.width < 1024 ? 3 : 4;
    
    if (direction === 'prev') {
      newDate.setDate(currentDate.getDate() - maxDays);
    } else {
      newDate.setDate(currentDate.getDate() + maxDays);
    }
    setCurrentDate(newDate);
    
    // Preload the next range in the background for smoother navigation
    setTimeout(() => {
      preloadAdjacentRange(direction);
    }, 100);
  };
  
  const preloadAdjacentRange = async (direction: 'prev' | 'next') => {
    const adjacentDate = new Date(currentDate);
    const maxDays = screenSize.width < 640 ? 1 : screenSize.width < 768 ? 2 : screenSize.width < 1024 ? 3 : 4;
    
    if (direction === 'prev') {
      adjacentDate.setDate(currentDate.getDate() - (maxDays * 2));
    } else {
      adjacentDate.setDate(currentDate.getDate() + (maxDays * 2));
    }
    
    const datesToPreload = [];
    for (let i = 0; i < maxDays; i++) {
      const date = new Date(adjacentDate);
      date.setDate(adjacentDate.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      if (!loadedDateRanges.has(dateString) && !fetchingDates.has(dateString)) {
        datesToPreload.push(dateString);
      }
    }
    
    if (datesToPreload.length > 0) {
      // Preload in background without showing loading state
      for (const dateString of datesToPreload) {
        try {
          const dateBorrowings = await getItemBorrowingsByDate(dateString);
          setBorrowings(prev => ({ ...prev, [dateString]: dateBorrowings }));
          setLoadedDateRanges(prev => new Set([...prev, dateString]));
        } catch (error) {
          console.error(`Error preloading borrowings for ${dateString}:`, error);
        }
      }
    }
  };
  
  const getBorrowingsForTimeSlot = (date: string, timeSlot: string) => {
    const dateBorrowings = borrowings[date] || [];
    return dateBorrowings.filter(borrowing => {
      const startTime = borrowing.startTime;
      const endTime = borrowing.endTime;
      
      // Convert time slot to minutes for comparison
      const slotMinutes = timeToMinutes(timeSlot);
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);
      
      // Check if this time slot overlaps with the borrowing
      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    });
  };

  // Get merged time slots for a booking to calculate height
  const getMergedTimeSlots = (date: string, borrowing: ItemBorrowing) => {
    const startMinutes = timeToMinutes(borrowing.startTime);
    const endMinutes = timeToMinutes(borrowing.endTime);
    
    let slotCount = 0;
    timeSlots.forEach(timeSlot => {
      const slotMinutes = timeToMinutes(timeSlot);
      if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
        slotCount++;
      }
    });
    
    return slotCount;
  };

  // Calculate the height for a booking
  const getBookingHeight = (date: string, borrowing: ItemBorrowing) => {
    const startMinutes = timeToMinutes(borrowing.startTime);
    const endMinutes = timeToMinutes(borrowing.endTime);
    
    // Find how many time slots this booking spans
    let slotCount = 0;
    timeSlots.forEach(timeSlot => {
      const slotMinutes = timeToMinutes(timeSlot);
      if (slotMinutes >= startMinutes && slotMinutes <= endMinutes) {
        slotCount++;
      }
    });
    
    // Each time slot is 32px tall (h-8)
    return slotCount * 32;
  };

  // Check if this is the first time slot for a booking (simplified since all bookings align to time slots)
  const isFirstTimeSlot = (date: string, borrowing: ItemBorrowing, timeSlot: string) => {
    return borrowing.startTime === timeSlot;
  };

  // Get all borrowings that start in this time slot
  const getBorrowingsStartingInTimeSlot = (date: string, timeSlot: string) => {
    const dateBorrowings = borrowings[date] || [];
    return dateBorrowings.filter(borrowing => borrowing.startTime === timeSlot);
  };



  // Calculate position for a specific booking - loop through 4 columns
  const calculateBookingPosition = (date: string, booking: ItemBorrowing, timeSlot: string) => {
    const dateBorrowings = borrowings[date] || [];
    
    // Sort all bookings for this date by start time
    const sortedBookings = dateBorrowings.sort((a, b) => 
      timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );
    
    // Find the index of this booking in the sorted list
    const bookingIndex = sortedBookings.findIndex(b => b.id === booking.id);
    
    // Assign column based on booking order (0-3, then loop back to 0)
    const columnIndex = bookingIndex % 4; // 0 = first column, 1 = second column, etc.
    
    // All bookings span 25% width
    const columnWidth = 25; // 25% per column
    const left = columnIndex * columnWidth;
    
    return { left, width: columnWidth };
  };



  // Dynamic color system - each reservation on the same date gets a unique color
  const getReservationColor = (date: string, borrowingId: string) => {
    const dateBorrowings = borrowings[date] || [];
    const index = dateBorrowings.findIndex(b => b.id === borrowingId);
    
    const colors = [
      'bg-blue-100 border-blue-300 text-blue-800',
      'bg-green-100 border-green-300 text-green-800',
      'bg-purple-100 border-purple-300 text-purple-800',
      'bg-orange-100 border-orange-300 text-orange-800',
      'bg-pink-100 border-pink-300 text-pink-800',
      'bg-indigo-100 border-indigo-300 text-indigo-800',
      'bg-teal-100 border-teal-300 text-teal-800',
      'bg-amber-100 border-amber-300 text-amber-800'
    ];
    
    return colors[index % colors.length] || 'bg-gray-100 border-gray-300 text-gray-800';
  };

  const timeToMinutes = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = hours * 60 + (minutes || 0);
    // Debug logging for time conversion
    if (timeString === '09:31' || timeString === '10:31') {
      console.log(`Time conversion: ${timeString} -> ${result} minutes`);
    }
    return result;
  };

  const formatTime12Hour = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  
  const getStatusColor = (status: ItemBorrowingStatus) => {
    switch (status) {
      case 'Reserved':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'Confirmed':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'Cancelled':
        return 'bg-red-100 border-red-300 text-red-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const formatTime = (timeString: string) => {
    return formatTime12Hour(timeString);
  };

  const handleBorrowingClick = (borrowing: ItemBorrowing) => {
    setSelectedBorrowing(borrowing);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedBorrowing(null);
  };

  const handleDeleteBorrowing = async (borrowingId: string) => {
    if (confirm('Are you sure you want to delete this borrowing request?')) {
      try {
        // Import and call delete function
        const { deleteItemBorrowing } = await import('../firebase/services');
        await deleteItemBorrowing(borrowingId);
        
        // Remove from local state
        const newBorrowings = { ...borrowings };
        Object.keys(newBorrowings).forEach(date => {
          newBorrowings[date] = newBorrowings[date].filter(b => b.id !== borrowingId);
        });
        setBorrowings(newBorrowings);
        
        handleCloseModal();
      } catch (error) {
        console.error('Error deleting borrowing:', error);
        alert('Failed to delete borrowing request');
      }
    }
  };

  const toggleDatePicker = () => {
    setShowDatePicker(!showDatePicker);
  };

  const handleDateSelect = (selectedDate: Date) => {
    setCurrentDate(selectedDate);
    setShowDatePicker(false);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
    setShowDatePicker(false);
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const generateCalendarDays = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };
  
  if (loading) {
    return (
      <ProtectedRoute>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }
  
  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
                     {/* Header */}
           <div className={`${screenSize.width < 640 ? 'flex-col space-y-4' : 'flex justify-between'} items-center`}>
             <div className={`${screenSize.width < 640 ? 'text-center' : ''}`}>
               <h1 className={`${screenSize.width < 640 ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900`}>Item Borrowing Calendar</h1>
               <p className="text-gray-600 mt-2">Visual calendar showing item reservations</p>
             </div>
             <Link
               href="/new-item-borrowing"
               className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
             >
               <FiPackage className="mr-2" size={20} />
               New Borrowing Request
             </Link>
           </div>
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
                     {/* Calendar Navigation */}
           <div className="bg-white shadow rounded-lg p-6">
             <div className={`${screenSize.width < 640 ? 'flex-col space-y-4' : 'flex items-center justify-between'} mb-6`}>
               {/* Previous Button */}
               <div className={`${screenSize.width < 640 ? 'flex justify-center' : ''}`}>
                 <button
                   onClick={() => navigateDate('prev')}
                   disabled={loading}
                   className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   <FiChevronLeft className="mr-2" size={16} />
                   Previous
                 </button>
               </div>
               
               {/* Center Section - Title and Controls */}
               <div className="flex items-center space-x-4">
                 <FiCalendar className="text-blue-600" size={24} />
                 <div className="text-center">
                   <h2 className={`${screenSize.width < 640 ? 'text-lg' : 'text-xl'} font-semibold text-gray-900`}>
                     {formatDate(getDisplayDates()[0])} - {formatDate(getDisplayDates()[getDisplayDates().length - 1])}
                   </h2>
                   <div className="flex items-center justify-center space-x-2 mt-1">
                     <span className="text-xs text-gray-500">
                       {getDisplayDates().length} day{getDisplayDates().length > 1 ? 's' : ''} view
                     </span>
                     <button
                       onClick={toggleDatePicker}
                       className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                     >
                       <span>Select Date</span>
                       <FiChevronDown className="ml-1" size={14} />
                     </button>
                   </div>
                 </div>
                 {loading && (
                   <div className="flex items-center text-sm text-gray-500">
                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                     Loading...
                   </div>
                 )}
               </div>
               
               {/* Right Section - Refresh and Next Buttons */}
               <div className={`${screenSize.width < 640 ? 'flex justify-center' : 'flex items-center'} space-x-2`}>
                 <button
                   onClick={() => fetchBorrowingsForDates()}
                   disabled={loading}
                   className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   <FiCalendar className="mr-2" size={16} />
                   Refresh
                 </button>
                 <button
                   onClick={() => navigateDate('next')}
                   disabled={loading}
                   className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   Next
                   <FiChevronRight className="ml-2" size={16} />
                 </button>
               </div>
             </div>
            
                         {/* Calendar Grid */}
             <div className={`${screenSize.width < 640 ? 'overflow-x-hidden' : 'overflow-x-auto'}`}>
               <div className={`${screenSize.width < 640 ? 'w-full' : 'min-w-max'}`}>
                 {/* Header Row */}
                 <div className={`grid gap-1 mb-2`} style={{ gridTemplateColumns: screenSize.width < 640 ? '80px 1fr' : `96px repeat(${getDisplayDates().length}, 1fr)` }}>
                   <div className={`${screenSize.width < 640 ? 'w-20' : 'w-24'} h-12`}></div> {/* Empty corner */}
                   {getDisplayDates().map((date) => {
                     const dateString = date.toISOString().split('T')[0];
                     const isFetching = fetchingDates.has(dateString);
                     return (
                       <div key={date.toISOString()} className="h-12 flex items-center justify-center" style={{ minWidth: screenSize.width < 640 ? '280px' : screenSize.width < 768 ? '200px' : '192px' }}>
                                                    <div className="text-center">
                             <div className="text-sm font-medium text-gray-900">
                               {date.toLocaleDateString('en-US', { weekday: 'short' })}
                             </div>
                             <div className="text-xs text-gray-500">
                               {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                               {borrowings[dateString] && borrowings[dateString].length > 0 && (
                                 <div className="text-xs text-blue-600 font-medium">
                                   ({borrowings[dateString].length} booking{borrowings[dateString].length > 1 ? 's' : ''})
                                 </div>
                               )}
                             </div>
                           {isFetching && (
                             <div className="flex items-center justify-center mt-1">
                               <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                             </div>
                           )}
                         </div>
                       </div>
                     );
                   })}
                 </div>
                 
                 {/* Time Slots */}
                 {timeSlots.map((timeSlot) => (
                   <div key={timeSlot} className={`grid gap-1 mb-1`} style={{ gridTemplateColumns: screenSize.width < 640 ? '80px 1fr' : `96px repeat(${getDisplayDates().length}, 1fr)` }}>
                     {/* Time Label */}
                     <div className={`${screenSize.width < 640 ? 'w-20' : 'w-24'} h-8 flex items-center justify-center text-sm text-gray-600 font-medium`}>
                       <div className="flex items-center">
                         <FiClock className="mr-1" size={14} />
                         {formatTime12Hour(timeSlot)}
                       </div>
                     </div>
                     
                     {/* Date Columns */}
                     {getDisplayDates().map((date) => {
                       const dateString = date.toISOString().split('T')[0];
                       const slotBorrowings = getBorrowingsForTimeSlot(dateString, timeSlot);
                       
                                               return (
                          <div key={dateString} className="border border-gray-200 bg-white p-1 relative" style={{ minWidth: screenSize.width < 640 ? '280px' : screenSize.width < 768 ? '200px' : '192px', minHeight: '32px' }}>
                                                          {(() => {
                                // Get all borrowings that start in this time slot
                                const startingBorrowings = getBorrowingsStartingInTimeSlot(dateString, timeSlot);
                                
                                if (startingBorrowings.length > 0) {
                                  return startingBorrowings.map((borrowing) => {
                                    const height = getBookingHeight(dateString, borrowing);
                                    
                                    // Calculate position for this booking based on its order
                                    const position = calculateBookingPosition(dateString, borrowing, timeSlot);
                                    
                                    return (
                                      <button
                                        key={borrowing.id}
                                        onClick={() => handleBorrowingClick(borrowing)}
                                        className={`absolute text-xs p-1 rounded border text-left ${getReservationColor(dateString, borrowing.id)} hover:opacity-80 transition-opacity cursor-pointer`}
                                        style={{ 
                                          height: `${height}px`, 
                                          top: '2px',
                                          left: `${position.left}%`,
                                          width: `${position.width}%`,
                                          zIndex: 10,
                                          fontSize: '10px'
                                        }}
                                      >
                                        <div className="font-medium truncate leading-tight">{borrowing.borrowerName}</div>
                                        <div className="truncate leading-tight">{borrowing.items.map(item => item.name).join(', ')}</div>
                                        <div className="opacity-75 leading-tight">
                                          {formatTime(borrowing.startTime)} - {formatTime(borrowing.endTime)}
                                        </div>
                                      </button>
                                    );
                                  });
                                } else {
                                  return (
                                    <div className="h-full flex items-center justify-center text-xs text-gray-300">
                                      —
                                    </div>
                                  );
                                }
                              })()}
                          </div>
                        );
                     })}
                   </div>
                 ))}
               </div>
             </div>
            
                       </div>
         </div>

         {/* Date Picker Popup */}
         {showDatePicker && (
           <div className="fixed inset-0 flex items-center justify-center p-4 z-40" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={toggleDatePicker}>
             <div className="bg-white rounded-lg shadow-lg p-6" style={{ width: screenSize.width < 640 ? '90vw' : '320px' }} onClick={(e) => e.stopPropagation()}>
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-medium text-gray-900">Select Date</h3>
                 <button
                   onClick={toggleDatePicker}
                   className="text-gray-400 hover:text-gray-600"
                 >
                   <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>

               {/* Month/Year Navigation */}
               <div className="flex items-center justify-between mb-4">
                 <button
                   onClick={() => changeMonth('prev')}
                   className="p-2 hover:bg-gray-100 rounded-md"
                 >
                   <FiChevronLeft size={16} />
                 </button>
                 <div className="text-center">
                   <div className="text-lg font-semibold text-gray-900">
                     {new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                   </div>
                 </div>
                 <button
                   onClick={() => changeMonth('next')}
                   className="p-2 hover:bg-gray-100 rounded-md"
                 >
                   <FiChevronRight size={16} />
                 </button>
               </div>

               {/* Today Button */}
               <div className="mb-4">
                 <button
                   onClick={goToToday}
                   className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                 >
                   Today
                 </button>
               </div>

               {/* Calendar Grid */}
               <div className="grid grid-cols-7 gap-1 mb-4">
                 {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                   <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                     {day}
                   </div>
                 ))}
                 
                 {generateCalendarDays().map((date, index) => {
                   const isCurrentMonth = date.getMonth() === selectedMonth;
                   const isToday = date.toDateString() === new Date().toDateString();
                   const isInCurrentRange = getDisplayDates().some(displayDate => 
                     displayDate.toDateString() === date.toDateString()
                   );
                   
                   return (
                     <button
                       key={index}
                       onClick={() => handleDateSelect(date)}
                       className={`
                         p-2 text-sm rounded-md transition-colors
                         ${isCurrentMonth 
                           ? 'text-gray-900 hover:bg-blue-50' 
                           : 'text-gray-400'
                         }
                         ${isToday ? 'bg-blue-100 text-blue-900 font-semibold' : ''}
                         ${isInCurrentRange ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                       `}
                     >
                       {date.getDate()}
                     </button>
                   );
                 })}
               </div>
             </div>
           </div>
         )}

         {/* Borrowing Details Modal */}
         {showModal && selectedBorrowing && (
           <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={handleCloseModal}>
             <div className="bg-white rounded-lg shadow-lg p-5" style={{ width: screenSize.width < 640 ? '90vw' : '384px' }} onClick={(e) => e.stopPropagation()}>
               <div className="mt-3">
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-medium text-gray-900">Borrowing Details</h3>
                   <button
                     onClick={handleCloseModal}
                     className="text-gray-400 hover:text-gray-600"
                   >
                     <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                   </button>
                 </div>

                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700">Borrower Name</label>
                     <p className="mt-1 text-sm text-gray-900">{selectedBorrowing.borrowerName}</p>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700">Teacher/Adviser</label>
                     <p className="mt-1 text-sm text-gray-900">{selectedBorrowing.teacherAdviserName}</p>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700">Department</label>
                     <p className="mt-1 text-sm text-gray-900">{selectedBorrowing.department}</p>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700">Items</label>
                     <div className="mt-1 space-y-1">
                       {selectedBorrowing.items.map((item, index) => (
                         <div key={index} className="text-sm text-gray-900">
                           • {item.name} ({item.serialNumber})
                         </div>
                       ))}
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700">Date</label>
                       <p className="mt-1 text-sm text-gray-900">{selectedBorrowing.date}</p>
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700">Time</label>
                       <p className="mt-1 text-sm text-gray-900">
                         {formatTime(selectedBorrowing.startTime)} - {formatTime(selectedBorrowing.endTime)}
                       </p>
                     </div>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700">Room/Location</label>
                     <p className="mt-1 text-sm text-gray-900">{selectedBorrowing.roomLocation}</p>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700">Received By</label>
                     <p className="mt-1 text-sm text-gray-900">{selectedBorrowing.receivedBy}</p>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700">Status</label>
                     <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedBorrowing.status)}`}>
                       {selectedBorrowing.status}
                     </span>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700">Booked On</label>
                     <p className="mt-1 text-sm text-gray-900">
                       {selectedBorrowing.bookedOn?.toDate?.()?.toLocaleString() || 'N/A'}
                     </p>
                   </div>
                 </div>

                 <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                   <Link
                     href={`/item-borrowings/edit/${selectedBorrowing.id}`}
                     className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                   >
                     <FiEdit className="mr-2" size={16} />
                     Edit
                   </Link>
                   <button
                     onClick={() => handleDeleteBorrowing(selectedBorrowing.id)}
                     className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                   >
                     <FiTrash2 className="mr-2" size={16} />
                     Delete
                   </button>
                   <button
                     onClick={handleCloseModal}
                     className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                   >
                     Close
                   </button>
                 </div>
               </div>
             </div>
           </div>
         )}
       </AdminLayout>
     </ProtectedRoute>
   );
 }
