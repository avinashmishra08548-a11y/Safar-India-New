import React from 'react';
import { Car, User, Phone, BookOpen, Clock, Shield } from 'lucide-react';
import { CustomerUser } from '../types';

interface HeaderProps {
  currentUser: CustomerUser | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onNavigateTab: (tab: 'booking' | 'rides' | 'routes' | 'faq') => void;
  activeNavTab: string;
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenLogin,
  onLogout,
  onNavigateTab,
  activeNavTab,
  onOpenAdmin
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          
          {/* Zone 1: Single Brand Wordmark */}
          <button 
            onClick={() => onNavigateTab('booking')}
            className="flex items-center gap-2.5 text-left text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-base sm:text-lg text-white block">
                SAFAR INDIA <span className="text-amber-400">CABS</span>
              </span>
            </div>
          </button>

          {/* Zone 2: 4-5 Clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <button
              onClick={() => onNavigateTab('booking')}
              className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 ${activeNavTab === 'booking' ? 'text-amber-400 font-semibold' : ''}`}
            >
              Book Cab
            </button>
            <button
              onClick={() => onNavigateTab('routes')}
              className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 ${activeNavTab === 'routes' ? 'text-amber-400 font-semibold' : ''}`}
            >
              Popular Routes
            </button>
            <button
              onClick={() => onNavigateTab('rides')}
              className={`flex items-center gap-1.5 hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 ${activeNavTab === 'rides' ? 'text-amber-400 font-semibold' : ''}`}
            >
              <Clock className="w-4 h-4" />
              <span>My Rides & Bills</span>
            </button>
            <button
              onClick={() => onNavigateTab('faq')}
              className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 ${activeNavTab === 'faq' ? 'text-amber-400 font-semibold' : ''}`}
            >
              Fare Rules & FAQ
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action Area */}
          <div className="flex items-center gap-3 shrink-0">
            <a 
              href="tel:+917710080992" 
              className="hidden lg:flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl hover:text-white hover:border-slate-700 transition"
            >
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium">+91 77100 80992</span>
            </a>

            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-amber-400 bg-slate-900 hover:bg-slate-800 border border-amber-400/30 rounded-xl transition-colors shadow-sm whitespace-nowrap shrink-0"
                title="Owner & Dispatch Dashboard"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Owner Portal</span>
                <span className="sm:hidden">Admin</span>
              </button>
            )}

            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                <div className="text-right">
                  <div className="text-xs font-semibold text-white leading-tight">{currentUser.name}</div>
                  <div className="text-[10px] text-amber-400 leading-tight">{currentUser.phone}</div>
                </div>
                <button
                  onClick={onLogout}
                  className="text-xs text-slate-400 hover:text-red-400 p-1 transition"
                  title="Logout"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors shadow-sm whitespace-nowrap shrink-0"
              >
                <User className="w-3.5 h-3.5" />
                <span>Customer Login</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
