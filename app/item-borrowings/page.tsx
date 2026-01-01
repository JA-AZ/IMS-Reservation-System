'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../components/AdminLayout';
import { ProtectedRoute } from '../context/AuthContext';
import { getItemBorrowings, deleteItemBorrowing } from '../firebase/services';
import { ItemBorrowing, ItemBorrowingStatus } from '../types';
import Link from 'next/link';
import { FiPlus, FiEdit, FiTrash2, FiEye, FiClipboard, FiFilter, FiSearch, FiPrinter, FiCalendar, FiChevronLeft, FiChevronRight, FiDownload } from 'react-icons/fi';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ItemBorrowingExport from '../components/ItemBorrowingExport';

export default function ItemBorrowingsPage() {
  const [borrowings, setBorrowings] = useState<ItemBorrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ItemBorrowingStatus | 'All'>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedBorrowing, setSelectedBorrowing] = useState<ItemBorrowing | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  // Helper function to get timestamp value for sorting
  const getTimestamp = (timestamp: any): number => {
    if (!timestamp) return 0;
    if (timestamp.toDate) {
      return timestamp.toDate().getTime();
    }
    if (timestamp instanceof Date) {
      return timestamp.getTime();
    }
    if (typeof timestamp === 'string') {
      return new Date(timestamp).getTime();
    }
    return 0;
  };
  
  useEffect(() => {
    fetchBorrowings();
  }, []);
  
  const fetchBorrowings = async () => {
    try {
      setLoading(true);
      const borrowingsData = await getItemBorrowings();
      
      // Sort by createdAt or bookedOn descending (most recent first)
      const sortedBorrowings = [...borrowingsData].sort((a, b) => {
        const timeA = getTimestamp(a.createdAt || a.bookedOn);
        const timeB = getTimestamp(b.createdAt || b.bookedOn);
        return timeB - timeA; // Descending order (newest first)
      });
      
      setBorrowings(sortedBorrowings);
    } catch (error) {
      console.error('Error fetching borrowings:', error);
      setError('Failed to load borrowings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Get unique departments for dropdown
  const departmentOptions = useMemo(() => {
    const departments = Array.from(
      new Set(borrowings.map(b => b.department.trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
    return departments;
  }, [borrowings]);
  
  // Get min and max dates for date range constraints
  const { minDate, maxDate } = useMemo(() => {
    if (borrowings.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      return { minDate: today, maxDate: today };
    }
    const dates = borrowings.map(b => b.date).filter(Boolean);
    if (dates.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      return { minDate: today, maxDate: today };
    }
    const sortedDates = dates.sort();
    return { minDate: sortedDates[0], maxDate: sortedDates[sortedDates.length - 1] };
  }, [borrowings]);
  
  const filteredBorrowings = useMemo(() => {
    let filtered = [...borrowings];
    
    // Search filter
    if (searchTerm.trim()) {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(borrowing => 
        borrowing.borrowerName.toLowerCase().includes(normalizedSearch) ||
        borrowing.teacherAdviserName.toLowerCase().includes(normalizedSearch) ||
        borrowing.department.toLowerCase().includes(normalizedSearch) ||
        borrowing.items.some(item => 
          item.name.toLowerCase().includes(normalizedSearch) ||
          item.serialNumber.toLowerCase().includes(normalizedSearch)
        )
      );
    }
    
    // Status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(borrowing => borrowing.status === statusFilter);
    }
    
    // Department filter
    if (departmentFilter !== 'All') {
      filtered = filtered.filter(borrowing => 
        borrowing.department.toLowerCase() === departmentFilter.toLowerCase()
      );
    }
    
    // Date range filter
    if (dateRangeStart || dateRangeEnd) {
      filtered = filtered.filter(borrowing => {
        const borrowingDate = new Date(borrowing.date);
        borrowingDate.setHours(0, 0, 0, 0);
        
        if (dateRangeStart && dateRangeEnd) {
          const start = new Date(dateRangeStart);
          start.setHours(0, 0, 0, 0);
          const end = new Date(dateRangeEnd);
          end.setHours(23, 59, 59, 999);
          return borrowingDate >= start && borrowingDate <= end;
        } else if (dateRangeStart) {
          const start = new Date(dateRangeStart);
          start.setHours(0, 0, 0, 0);
          return borrowingDate >= start;
        } else if (dateRangeEnd) {
          const end = new Date(dateRangeEnd);
          end.setHours(23, 59, 59, 999);
          return borrowingDate <= end;
        }
        return true;
      });
    }
    
    return filtered;
  }, [borrowings, searchTerm, statusFilter, departmentFilter, dateRangeStart, dateRangeEnd]);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, departmentFilter, dateRangeStart, dateRangeEnd]);
  
  const totalPages = Math.max(1, Math.ceil(filteredBorrowings.length / pageSize));
  
  // Ensure current page is within bounds when data size changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  
  const paginatedBorrowings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredBorrowings.slice(start, end);
  }, [filteredBorrowings, currentPage]);
  
  const handleClearDateRange = () => {
    setDateRangeStart('');
    setDateRangeEnd('');
  };
  
  const handleToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateRangeStart(today);
    setDateRangeEnd(today);
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const handleDeleteBorrowing = async (borrowingId: string) => {
    if (window.confirm('Are you sure you want to delete this borrowing request? This action cannot be undone.')) {
      try {
        await deleteItemBorrowing(borrowingId);
        setBorrowings((prev) => prev.filter((borrowing) => borrowing.id !== borrowingId));
      } catch (error) {
        console.error('Error deleting borrowing:', error);
        setError('Failed to delete borrowing request. Please try again.');
      }
    }
  };
  
  const handleViewDetails = (borrowing: ItemBorrowing) => {
    setSelectedBorrowing(borrowing);
    setShowModal(true);
  };
  
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedBorrowing(null);
  };

  const formatDateForPDF = (borrowing: ItemBorrowing): string => {
    // Use selectedDates if available (scattered dates)
    if (borrowing.selectedDates && borrowing.selectedDates.length > 0) {
      const dates = borrowing.selectedDates.sort();
      if (dates.length === 1) {
        // Single date
        const d = new Date(dates[0]);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      }
      
      // Group dates by month/year
      const byMonth: Record<string, number[]> = {};
      dates.forEach(dateStr => {
        const d = new Date(dateStr);
        const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
        if (!byMonth[monthKey]) {
          byMonth[monthKey] = [];
        }
        byMonth[monthKey].push(d.getDate());
      });
      
      // Format: "Dec, 20, 23, 25, 2025"
      const parts: string[] = [];
      Object.keys(byMonth).sort().forEach(monthKey => {
        const [year, month] = monthKey.split('-');
        const monthName = new Date(parseInt(year), parseInt(month), 1).toLocaleDateString('en-US', { month: 'short' });
        const days = byMonth[monthKey].sort((a, b) => a - b);
        parts.push(`${monthName}, ${days.join(', ')}, ${year}`);
      });
      return parts.join('; ');
    }
    
    // Use startDate/endDate if available (date range)
    if (borrowing.startDate && borrowing.endDate) {
      const start = new Date(borrowing.startDate);
      const end = new Date(borrowing.endDate);
      
      if (borrowing.startDate === borrowing.endDate) {
        // Single date
        return start.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      } else {
        // Date range
        const startStr = start.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const endStr = end.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        return `${startStr} - ${endStr}`;
      }
    }
    
    // Fallback to legacy date field
    const d = new Date(borrowing.date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handlePrintForm = async (borrowing: ItemBorrowing) => {
    // Prepare the data for the form
    const dateDisplay = formatDateForPDF(borrowing);
    const formData = {
      borrowerName: borrowing.borrowerName,
      department: borrowing.department,
      items: borrowing.items,
      date: dateDisplay,
      startTime: borrowing.startTime,
      endTime: borrowing.endTime,
      roomLocation: borrowing.roomLocation,
      receivedBy: borrowing.receivedBy
    };

    // Create a temporary div to render the form
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '2448px'; // Higher resolution for sharper output
    tempDiv.style.height = '3744px'; // Higher resolution for sharper output
    tempDiv.style.background = 'transparent';
    tempDiv.style.padding = '0';
    tempDiv.style.margin = '0';
    tempDiv.style.fontFamily = 'Inter, sans-serif, Arial';
    tempDiv.style.fontSize = '33px'; // Scaled up font size for higher resolution
    tempDiv.style.lineHeight = '1.2';
    tempDiv.style.color = 'black';
    tempDiv.style.border = 'none';
    tempDiv.style.outline = 'none';
    tempDiv.style.overflow = 'hidden';
    tempDiv.style.boxSizing = 'border-box';

    // Create the HTML content with embedded data and local logo
    const htmlContent = `
      <div style="width: 2448px; height: 3744px; background: transparent; padding: 144px; margin: 0; font-family: 'Inter', sans-serif, Arial; font-size: 33px; line-height: 1.2; color: black; border: none; outline: none; overflow: hidden; box-sizing: border-box;">
          <!-- First Copy of the Form -->
          <div style="border: 6px solid black; padding: 36px; height: 48%; display: flex; flex-direction: column; margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 18px; border-bottom: 6px solid black; margin-bottom: 24px;">
                  <div>
                      <img src="/UC LOGO.jpg" alt="University of Cebu Logo" style="height: 120px; width: auto;">
                  </div>
                  <div style="font-size: 42px; font-weight: bold; text-align: center;">
                      INSTRUCTIONAL MEDIA SERVICES (IMS)
                  </div>
                  <div style="font-size: 48px; font-weight: bold; text-align: right;">
                      BORROWER'S FORM
                  </div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; font-size: 33px;">
                  <div style="width: 48%;">
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="margin-right: 24px;">Borrower's Name:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; font-size: 33px; flex-grow: 1;">${formData.borrowerName}</div>
                      </div>
                  </div>
                  <div style="width: 48%;">
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="margin-right: 24px;">Department:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; font-size: 33px; flex-grow: 1;">${formData.department}</div>
                      </div>
                      <div style="display: flex; align-items: center; margin-bottom: 12px; margin-top: 12px;">
                          <span style="margin-right: 24px;">Teacher's Name and Signature:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; flex-grow: 1;"></div>
                      </div>
                  </div>
              </div>

              <div style="border: 6px solid black; padding: 24px; flex-grow: 1; margin-bottom: 24px;">
                  <div style="display: flex; height: 100%;">
                      <div style="width: 50%; padding-right: 24px; border-right: 3px solid black;">
                          <div style="font-size: 30px; font-weight: bold; text-align: center; margin-bottom: 24px;">BORROWED MATERIALS/ITEMS</div>
                          <div>
                              ${formData.items.map(item => `<div style="font-size: 27px; line-height: 1.3; margin-bottom: 6px; border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px;">${item.name}</div>`).join('')}
                          </div>
                      </div>
                      <div style="width: 50%; padding-left: 24px;">
                          <div style="font-size: 30px; font-weight: bold; text-align: center; margin-bottom: 24px;">DESCRIPTION/TITLE/SERIAL No.</div>
                          <div>
                              ${formData.items.map(item => `<div style="font-size: 27px; line-height: 1.3; margin-bottom: 6px; border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px;">${item.serialNumber || '-'}</div>`).join('')}
                          </div>
                      </div>
                  </div>
              </div>
              
              <div style="display: flex; margin-bottom: 24px; font-size: 30px;">
                  <div style="width: 50%; padding-right: 24px;">
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="width: 240px; font-weight: bold;">PURPOSE:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; font-size: 33px; flex-grow: 1;">Event/Activity</div>
                      </div>
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="width: 240px; font-weight: bold;">DATE OF USE:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; font-size: 33px; flex-grow: 1;">${formData.date}</div>
                      </div>
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="width: 240px; font-weight: bold;">TIME OF USE:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; font-size: 33px; flex-grow: 1;">${formData.startTime} - ${formData.endTime}</div>
                      </div>
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="width: 240px; font-weight: bold;">PLACE OR ROOM NO:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; font-size: 33px; flex-grow: 1;">${formData.roomLocation}</div>
                      </div>
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="width: 240px; font-weight: bold;">DUE DATE & TIME:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; font-size: 33px; flex-grow: 1;">${new Date(formData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} ${formData.endTime}</div>
                      </div>
                  </div>
                  <div style="width: 50%; border: 6px solid black; padding: 24px;">
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="width: 240px; font-weight: bold;">DATE RECEIVED:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; flex-grow: 1;"></div>
                      </div>
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="width: 240px; font-weight: bold;">RECEIVED BY:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; flex-grow: 1;"></div>
                      </div>
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="width: 240px; font-weight: bold;">I.D. NUMBER:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; flex-grow: 1;"></div>
                      </div>
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="width: 240px; font-weight: bold;">SIGNATURE:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; flex-grow: 1;"></div>
                      </div>
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="width: 240px; font-weight: bold;">RELEASED BY:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; flex-grow: 1;"></div>
                      </div>
                  </div>
              </div>
              
              <div style="margin-top: auto; padding-top: 18px; font-size: 30px;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 18px;">
                      <div style="width: 48%;">
                          <div style="display: flex; align-items: center; margin-bottom: 12px;">
                              <span style="margin-right: 24px;">Approved By:</span>
                              <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; flex-grow: 1;"></div>
                          </div>
                          <div style="font-size: 24px; font-weight: bold; text-align: center; margin-top: 6px;">IMS DIRECTOR</div>
                      </div>
                      <div style="width: 48%;">
                          <div style="display: flex; align-items: center; margin-bottom: 12px;">
                              <span style="margin-right: 24px;">DATE & TIME RETURNED:</span>
                              <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; flex-grow: 1;"></div>
                          </div>
                          <div style="text-align: right; margin-top: 12px; font-size: 27px; display: flex; align-items: center; justify-content: flex-end;">
                              RETURNED IN GOOD CONDITION: YES <span style="width: 36px; height: 36px; border: 3px solid black; display: inline-block; margin-left: 12px; margin-right: 24px;"></span> NO <span style="width: 36px; height: 36px; border: 3px solid black; display: inline-block; margin-left: 12px;"></span>
                          </div>
                      </div>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 18px;">
                      <div style="width: 48%;">
                          <div style="display: flex; align-items: center; margin-bottom: 12px;">
                              <span style="margin-right: 24px;">Booking Received By:</span>
                              <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; font-size: 33px; flex-grow: 1;">${formData.receivedBy || ''}</div>
                          </div>
                      </div>
                      <div style="width: 48%;">
                          <div style="display: flex; align-items: center; margin-bottom: 12px;">
                              <span style="margin-right: 24px;">Booking Finalized By:</span>
                              <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; flex-grow: 1;"></div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          <!-- Second Copy of the Form -->
          <div style="border: 6px solid black; padding: 36px; height: 48%; display: flex; flex-direction: column; margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 18px; border-bottom: 6px solid black; margin-bottom: 24px;">
                  <div>
                      <img src="/UC LOGO.jpg" alt="University of Cebu Logo" style="height: 120px; width: auto;">
                  </div>
                  <div style="font-size: 42px; font-weight: bold; text-align: center;">
                      INSTRUCTIONAL MEDIA SERVICES (IMS)
                  </div>
                  <div style="font-size: 48px; font-weight: bold; text-align: right;">
                      BORROWER'S FORM
                  </div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; font-size: 33px;">
                  <div style="width: 48%;">
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="margin-right: 24px;">Borrower's Name:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; font-size: 33px; flex-grow: 1;">${formData.borrowerName}</div>
                      </div>
                  </div>
                  <div style="width: 48%;">
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="margin-right: 24px;">Department:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; font-size: 33px; flex-grow: 1;">${formData.department}</div>
                      </div>
                      <div style="display: flex; align-items: center; margin-bottom: 12px; margin-top: 12px;">
                          <span style="margin-right: 24px;">Teacher's Name and Signature:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; flex-grow: 1;"></div>
                      </div>
                  </div>
              </div>

              <div style="border: 6px solid black; padding: 24px; flex-grow: 1; margin-bottom: 24px;">
                  <div style="display: flex; height: 100%;">
                      <div style="width: 50%; padding-right: 24px; border-right: 3px solid black;">
                          <div style="font-size: 30px; font-weight: bold; text-align: center; margin-bottom: 24px;">BORROWED MATERIALS/ITEMS</div>
                          <div>
                              ${formData.items.map(item => `<div style="font-size: 27px; line-height: 1.3; margin-bottom: 6px; border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px;">${item.name}</div>`).join('')}
                          </div>
                      </div>
                      <div style="width: 50%; padding-left: 24px;">
                          <div style="font-size: 30px; font-weight: bold; text-align: center; margin-bottom: 24px;">DESCRIPTION/TITLE/SERIAL No.</div>
                          <div>
                              ${formData.items.map(item => `<div style="font-size: 27px; line-height: 1.3; margin-bottom: 6px; border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px;">${item.serialNumber || '-'}</div>`).join('')}
                          </div>
                      </div>
                  </div>
              </div>
              
              <div style="display: flex; margin-bottom: 24px; font-size: 30px;">
                  <div style="width: 50%; padding-right: 24px;">
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="width: 240px; font-weight: bold;">PURPOSE:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; font-size: 33px; flex-grow: 1;">Event/Activity</div>
                      </div>
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="width: 240px; font-weight: bold;">DATE OF USE:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; font-size: 33px; flex-grow: 1;">${formData.date}</div>
                      </div>
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="width: 240px; font-weight: bold;">TIME OF USE:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; font-size: 33px; flex-grow: 1;">${formData.startTime} - ${formData.endTime}</div>
                      </div>
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="width: 240px; font-weight: bold;">PLACE OR ROOM NO:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; font-size: 33px; flex-grow: 1;">${formData.roomLocation}</div>
                      </div>
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="width: 240px; font-weight: bold;">DUE DATE & TIME:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; font-size: 33px; flex-grow: 1;">${new Date(formData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} ${formData.endTime}</div>
                      </div>
                  </div>
                  <div style="width: 50%; border: 6px solid black; padding: 24px;">
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="width: 240px; font-weight: bold;">DATE RECEIVED:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; flex-grow: 1;"></div>
                      </div>
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="width: 240px; font-weight: bold;">RECEIVED BY:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; flex-grow: 1;"></div>
                      </div>
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="width: 240px; font-weight: bold;">I.D. NUMBER:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; flex-grow: 1;"></div>
                      </div>
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="width: 240px; font-weight: bold;">SIGNATURE:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; flex-grow: 1;"></div>
                      </div>
                      <div style="display: flex; align-items: center; margin-bottom: 12px;">
                          <span style="width: 240px; font-weight: bold;">RELEASED BY:</span>
                          <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; flex-grow: 1;"></div>
                      </div>
                  </div>
              </div>
              
              <div style="margin-top: auto; padding-top: 18px; font-size: 30px;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 18px;">
                      <div style="width: 48%;">
                          <div style="display: flex; align-items: center; margin-bottom: 12px;">
                              <span style="margin-right: 24px;">Approved By:</span>
                              <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; flex-grow: 1;"></div>
                          </div>
                          <div style="font-size: 24px; font-weight: bold; text-align: center; margin-top: 6px;">IMS DIRECTOR</div>
                      </div>
                      <div style="width: 48%;">
                          <div style="display: flex; align-items: center; margin-bottom: 12px;">
                              <span style="margin-right: 24px;">DATE & TIME RETURNED:</span>
                              <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; flex-grow: 1;"></div>
                          </div>
                          <div style="text-align: right; margin-top: 12px; font-size: 27px; display: flex; align-items: center; justify-content: flex-end;">
                              RETURNED IN GOOD CONDITION: YES <span style="width: 36px; height: 36px; border: 3px solid black; display: inline-block; margin-left: 12px; margin-right: 24px;"></span> NO <span style="width: 36px; height: 36px; border: 3px solid black; display: inline-block; margin-left: 12px;"></span>
                          </div>
                      </div>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 18px;">
                      <div style="width: 48%;">
                          <div style="display: flex; align-items: center; margin-bottom: 12px;">
                              <span style="margin-right: 24px;">Booking Received By:</span>
                              <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; font-size: 33px; flex-grow: 1;">${formData.receivedBy || ''}</div>
                          </div>
                      </div>
                      <div style="width: 48%;">
                          <div style="display: flex; align-items: center; margin-bottom: 12px;">
                              <span style="margin-right: 24px;">Booking Finalized By:</span>
                              <div style="border-bottom: 3px solid black; padding-bottom: 12px; min-height: 48px; flex-grow: 1;"></div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    `;

    tempDiv.innerHTML = htmlContent;
    document.body.appendChild(tempDiv);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for logo to load

      const canvas = await html2canvas(tempDiv, {
        useCORS: true,
        allowTaint: true,
        background: 'transparent',
        width: 2448, // 8.5 inches * 288 DPI (3x higher resolution)
        height: 3744, // 13 inches * 288 DPI (3x higher resolution)
        logging: false
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: [8.5, 13]
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, 8.5, 13);

      const fileName = `${formData.department}_${new Date(formData.date).toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      document.body.removeChild(tempDiv);
    }
  };
  
  const getStatusColor = (status: ItemBorrowingStatus) => {
    switch (status) {
      case 'Reserved':
        return 'bg-yellow-100 text-yellow-800';
      case 'Confirmed':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const formatDate = (borrowing: ItemBorrowing) => {
    // Use selectedDates if available (scattered dates)
    if (borrowing.selectedDates && borrowing.selectedDates.length > 0) {
      const dates = borrowing.selectedDates.sort();
      if (dates.length === 1) {
        const d = new Date(dates[0]);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      }
      
      // Group dates by month/year
      const byMonth: Record<string, number[]> = {};
      dates.forEach(dateStr => {
        const d = new Date(dateStr);
        const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
        if (!byMonth[monthKey]) {
          byMonth[monthKey] = [];
        }
        byMonth[monthKey].push(d.getDate());
      });
      
      // Format: "Dec, 20, 23, 25, 2025"
      const parts: string[] = [];
      Object.keys(byMonth).sort().forEach(monthKey => {
        const [year, month] = monthKey.split('-');
        const monthName = new Date(parseInt(year), parseInt(month), 1).toLocaleDateString('en-US', { month: 'short' });
        const days = byMonth[monthKey].sort((a, b) => a - b);
        parts.push(`${monthName}, ${days.join(', ')}, ${year}`);
      });
      return parts.join('; ');
    }
    
    // Use startDate/endDate if available (date range)
    if (borrowing.startDate && borrowing.endDate) {
      const start = new Date(borrowing.startDate);
      const end = new Date(borrowing.endDate);
      
      if (borrowing.startDate === borrowing.endDate) {
        return start.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      } else {
        const startStr = start.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const endStr = end.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        return `${startStr} - ${endStr}`;
      }
    }
    
    // Fallback to legacy date field
    const d = new Date(borrowing.date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  const formatTime = (timeString: string) => {
    return timeString;
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
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Item Borrowings</h1>
              <p className="text-gray-600 mt-2">Manage all item borrowing requests</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <button
                onClick={() => setShowExportModal(true)}
                className="flex-1 md:flex-initial inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-sm font-medium"
              >
                <FiDownload className="mr-2" size={16} />
                Export
              </button>
              <Link
                href="/new-item-borrowing"
                className="flex-1 md:flex-initial inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm font-medium"
              >
                <FiPlus className="mr-2" size={16} />
                New Borrowing Request
              </Link>
            </div>
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
          
          {/* Search Bar - Always Visible */}
          <div className="bg-white shadow rounded-lg p-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by borrower, teacher, department, or item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm h-[38px]"
              />
            </div>
          </div>

          {/* Filters - Collapsible */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <FiFilter className="text-gray-400" size={18} />
                <h3 className="text-lg font-medium text-gray-900">Filters</h3>
              </div>
              <div className="flex items-center space-x-2">
                {(statusFilter !== 'All' || departmentFilter !== 'All' || dateRangeStart || dateRangeEnd) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchTerm('');
                      setStatusFilter('All');
                      setDepartmentFilter('All');
                      setDateRangeStart('');
                      setDateRangeEnd('');
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear all filters
                  </button>
                )}
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${filtersExpanded ? 'transform rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            
            {filtersExpanded && (
              <div className="px-4 pb-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as ItemBorrowingStatus | 'All')}
                      className="px-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm h-[38px]"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Reserved">Reserved</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  
                  {/* Department Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Department
                    </label>
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="px-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm h-[38px]"
                    >
                      <option value="All">All Departments</option>
                      {departmentOptions.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Date Range Filter */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <FiCalendar className="text-gray-400" size={16} />
                    <label className="text-sm font-medium text-gray-700">Filter by Date Range</label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="flex flex-col">
                      <label className="block text-xs font-medium text-gray-500 mb-1 invisible">
                        Button
                      </label>
                      <button
                        type="button"
                        onClick={handleToday}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 whitespace-nowrap h-[38px]"
                      >
                        Today
                      </button>
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={dateRangeStart}
                        onChange={(e) => setDateRangeStart(e.target.value)}
                        min={minDate}
                        max={maxDate}
                        className="px-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm h-[38px]"
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={dateRangeEnd}
                        onChange={(e) => setDateRangeEnd(e.target.value)}
                        min={dateRangeStart || minDate}
                        max={maxDate}
                        className="px-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm h-[38px]"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="block text-xs font-medium text-gray-500 mb-1 invisible">
                        Button
                      </label>
                      <button
                        type="button"
                        onClick={handleClearDateRange}
                        disabled={!dateRangeStart && !dateRangeEnd}
                        className={`px-3 py-2 text-sm border border-gray-300 rounded-md whitespace-nowrap h-[38px] ${
                          !dateRangeStart && !dateRangeEnd
                            ? 'text-gray-300 border-gray-200 cursor-not-allowed bg-gray-50'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  {(dateRangeStart || dateRangeEnd) && (
                    <p className="mt-2 text-xs text-gray-500">
                      Showing borrowings from{' '}
                      {dateRangeStart || 'start'} to {dateRangeEnd || 'end'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Borrowings Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                All Borrowings{' '}
                <span className="text-sm font-normal text-gray-500">
                  ({filteredBorrowings.length}{' '}
                  {filteredBorrowings.length === 1 ? 'result' : 'results'})
                </span>
              </h3>
            </div>
            
            {filteredBorrowings.length === 0 ? (
              <div className="text-center py-12 px-4">
                <FiClipboard className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {borrowings.length === 0 ? 'No borrowings' : 'No borrowings match your filters'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {borrowings.length === 0
                    ? 'Get started by creating a new borrowing request.'
                    : 'Try adjusting or clearing your filters to see more results.'}
                </p>
                {borrowings.length === 0 && (
                  <div className="mt-6">
                    <Link
                      href="/new-item-borrowing"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <FiPlus className="mr-2" size={16} />
                      Create Borrowing Request
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date & Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Borrower
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Items
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedBorrowings.map((borrowing) => (
                        <tr key={borrowing.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{formatDate(borrowing)}</div>
                              <div className="text-sm text-gray-500">
                                {formatTime(borrowing.startTime)} - {formatTime(borrowing.endTime)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{borrowing.borrowerName}</div>
                              <div className="text-sm text-gray-500">{borrowing.teacherAdviserName}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {borrowing.department}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {borrowing.items.map(item => item.name).join(', ')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {borrowing.items.length} item(s)
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(borrowing.status)}`}>
                              {borrowing.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleViewDetails(borrowing)}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                title="View Details"
                              >
                                <FiEye size={16} />
                              </button>
                              <button
                                onClick={() => handlePrintForm(borrowing)}
                                className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50"
                                title="Print Form"
                              >
                                <FiPrinter size={16} />
                              </button>
                              <Link
                                href={`/item-borrowings/edit/${borrowing.id}`}
                                className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                                title="Edit"
                              >
                                <FiEdit size={16} />
                              </Link>
                              <button
                                onClick={() => handleDeleteBorrowing(borrowing.id)}
                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                                title="Delete"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-200">
                  {paginatedBorrowings.map((borrowing) => (
                    <div
                      key={borrowing.id}
                      onClick={() => handleViewDetails(borrowing)}
                      className="p-4 hover:bg-gray-50 cursor-pointer active:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            {borrowing.borrowerName}
                          </div>
                          <div className="text-xs text-gray-500 mb-1">
                            {borrowing.department}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(borrowing)}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(borrowing);
                          }}
                          className="ml-4 text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50 flex-shrink-0"
                          title="View Details"
                        >
                          <FiEye size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{filteredBorrowings.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, filteredBorrowings.length)}</span> of <span className="font-medium">{filteredBorrowings.length}</span> borrowings
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiChevronLeft size={16} />
                    </button>
                    <span className="px-3 py-1 text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Borrowing Details Modal */}
        {showModal && selectedBorrowing && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black/50 backdrop-blur-sm" onClick={handleCloseModal}>
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedBorrowing)}</p>
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

              <div className="flex flex-wrap justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrintForm(selectedBorrowing);
                  }}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <FiPrinter className="mr-2" size={16} />
                  Print Form
                </button>
                <Link
                  href={`/item-borrowings/edit/${selectedBorrowing.id}`}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FiEdit className="mr-2" size={16} />
                  Edit
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseModal();
                    handleDeleteBorrowing(selectedBorrowing.id);
                  }}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <FiTrash2 className="mr-2" size={16} />
                  Delete
                </button>
                <button
                  onClick={handleCloseModal}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setShowExportModal(false)}>
            <div className="bg-white rounded-lg shadow-lg p-6" style={{ width: '90vw', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Export Item Borrowings</h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <ItemBorrowingExport />
            </div>
          </div>
        )}
      </AdminLayout>
    </ProtectedRoute>
  );
}
