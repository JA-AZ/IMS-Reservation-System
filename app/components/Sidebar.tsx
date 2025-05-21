'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiHome, FiCalendar, FiPlusSquare, FiSettings } from 'react-icons/fi';

export default function Sidebar() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path;
  };
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: <FiHome size={20} /> },
    { path: '/reservations', label: 'Reservations', icon: <FiCalendar size={20} /> },
    { path: '/new-reservation', label: 'New Reservation', icon: <FiPlusSquare size={20} /> },
    { path: '/venues', label: 'Venues', icon: <FiSettings size={20} /> },
  ];
  
  return (
    <div className="w-64 bg-gray-800 h-screen p-4 text-white fixed">
      <div className="flex items-center justify-center h-16 border-b border-gray-700 mb-6">
        <h2 className="text-xl font-bold">Venue Reservation</h2>
      </div>
      
      <nav>
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                href={item.path}
                className={`flex items-center p-3 rounded-lg hover:bg-gray-700 transition-colors ${
                  isActive(item.path) ? 'bg-blue-600' : ''
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
} 