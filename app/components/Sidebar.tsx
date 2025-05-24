'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FiHome, FiCalendar, FiPlusSquare, FiSettings, FiMapPin, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { getVenues } from '../firebase/services';
import { VenueType } from '../types';

interface SidebarProps {
  isOpen: boolean;
  closeSidebar: () => void;
}

export default function Sidebar({ isOpen, closeSidebar }: SidebarProps) {
  const pathname = usePathname();
  const [venues, setVenues] = useState<VenueType[]>([]);
  const [venuesExpanded, setVenuesExpanded] = useState(false);
  
  useEffect(() => {
    // Only fetch venues if we're on the venues page or a venue detail page
    if (pathname === '/venues' || pathname.startsWith('/venues/')) {
      const fetchVenues = async () => {
        try {
          const venuesData = await getVenues();
          setVenues(venuesData);
          // Auto-expand venues list when on venues page
          setVenuesExpanded(true);
        } catch (error) {
          console.error('Error fetching venues for sidebar:', error);
        }
      };
      
      fetchVenues();
    } else {
      setVenuesExpanded(false);
    }
  }, [pathname]);
  
  const isActive = (path: string) => {
    return pathname === path;
  };
  
  const isVenueDetailPage = pathname.startsWith('/venues/') && pathname !== '/venues';
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: <FiHome size={20} /> },
    { path: '/reservations', label: 'Reservations', icon: <FiCalendar size={20} /> },
    { path: '/new-reservation', label: 'New Reservation', icon: <FiPlusSquare size={20} /> },
    { path: '/venues', label: 'Venues', icon: <FiSettings size={20} /> },
  ];
  
  return (
    <aside className={`sidebar w-64 bg-gray-800 min-h-screen p-4 text-white fixed top-16 left-0 z-40 transform transition-transform duration-300 md:translate-x-0 ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      <div className="flex items-center justify-center h-16 border-b border-gray-700 mb-6">
        <h2 className="text-xl font-bold">Venue Reservation</h2>
      </div>
      <nav className="flex-1">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                href={item.path}
                onClick={() => closeSidebar()}
                aria-current={isActive(item.path) ? 'page' : undefined}
                className={`flex items-center p-3 rounded-lg transition-colors font-medium text-white hover:bg-gray-700 focus:bg-gray-700 focus:outline-none ${
                  isActive(item.path) ? 'bg-blue-600' : ''
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                <span>{item.label}</span>
                {item.path === '/venues' && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setVenuesExpanded(!venuesExpanded);
                    }}
                    className="ml-auto focus:outline-none"
                    aria-label={venuesExpanded ? "Collapse venues" : "Expand venues"}
                  >
                    {venuesExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                  </button>
                )}
              </Link>
              
              {/* Venue submenu */}
              {item.path === '/venues' && venuesExpanded && venues.length > 0 && (
                <ul className="mt-2 ml-6 space-y-1">
                  {venues.map(venue => (
                    <li key={venue.id}>
                      <Link
                        href={`/venues/${venue.id}`}
                        onClick={() => closeSidebar()}
                        className={`flex items-center p-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 ${
                          pathname === `/venues/${venue.id}` ? 'bg-gray-700 text-white' : ''
                        }`}
                      >
                        <FiMapPin size={14} className="mr-2" />
                        <span className="truncate">{venue.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
} 