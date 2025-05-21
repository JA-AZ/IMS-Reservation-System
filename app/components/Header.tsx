'use client';

import { FiMenu, FiBell, FiUser } from 'react-icons/fi';

type HeaderProps = {
  toggleSidebar: () => void;
};

export default function Header({ toggleSidebar }: HeaderProps) {
  return (
    <header className="bg-white shadow h-16 px-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center">
        <button 
          onClick={toggleSidebar}
          className="text-gray-700 hover:text-gray-900 mr-4 lg:hidden"
        >
          <FiMenu size={24} />
        </button>
        <h1 className="text-xl font-semibold text-gray-700">Venue Reservation System</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <button className="text-gray-700 hover:text-gray-900">
          <FiBell size={20} />
        </button>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
            <FiUser size={16} />
          </div>
          <span className="text-gray-700 font-medium hidden md:inline">Admin</span>
        </div>
      </div>
    </header>
  );
} 