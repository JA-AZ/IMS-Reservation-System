'use client';

import { FiMenu, FiBell, FiUser, FiLogOut } from 'react-icons/fi';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../firebase/services';
import { useRouter } from 'next/navigation';

type HeaderProps = {
  toggleSidebar: () => void;
};

export default function Header({ toggleSidebar }: HeaderProps) {
  const { user } = useAuth();
  const router = useRouter();
  
  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };
  
  return (
    <header className="bg-white shadow h-16 px-4 flex items-center justify-between fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center">
        <button 
          onClick={toggleSidebar}
          className="text-gray-700 hover:text-gray-900 mr-4 md:hidden focus:outline-none"
          aria-label="Toggle sidebar"
        >
          <FiMenu size={24} />
        </button>
        <div className="flex items-center">
          <Image 
            src="/UC-ROUND.png" 
            alt="UC Logo" 
            width={40} 
            height={40} 
            className="mr-3 rounded-md"
          />
          <h1 className="text-xl font-semibold text-gray-900 truncate">Instructional Media Services</h1>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <button className="text-gray-700 hover:text-gray-900 focus:outline-none" aria-label="Notifications">
          <FiBell size={20} />
        </button>
        
        {user && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                <FiUser size={16} />
              </div>
              <span className="text-gray-700 font-medium hidden md:inline">
                {user.email?.split('@')[0] || 'Admin'}
              </span>
            </div>
            
            <button 
              onClick={handleLogout}
              className="text-gray-700 hover:text-red-600 focus:outline-none flex items-center space-x-1"
              aria-label="Log out"
            >
              <FiLogOut size={18} />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
} 