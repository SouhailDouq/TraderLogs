'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { UserMenu } from '@/components/UserMenu';

const workflowSteps = [
  { id: 'calendar', title: 'Calendar', path: '/', icon: '📅' },
  { id: 'deadlines', title: 'Deadlines', path: '/deadlines', icon: '⏰' },
  { id: 'premarket', title: 'Premarket', path: '/premarket-scanner', icon: '🌅' },
  { id: 'research', title: 'Research', path: '/trade-analyzer', icon: '📊' },
  { id: 'risk', title: 'Risk', path: '/risk-management', icon: '🛡️' },
  { id: 'monitor', title: 'Monitor', path: '/portfolio', icon: '👁️' },
  { id: 'review', title: 'Review', path: '/performance', icon: '📈' }
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  // Dark mode is now handled in layout.tsx - no need to force it here
  useEffect(() => {
    // Ensure dark mode persists on navigation
    if (!document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const navigateToStep = (path: string) => {
    router.push(path);
  };

  return (
    <nav className="border-b backdrop-blur-md transition-all duration-300 sticky top-0 z-50 bg-gray-900/95 border-gray-700 shadow-lg shadow-gray-900/20">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <button
              onClick={() => router.push('/')}
              className="text-xl font-bold transition-all duration-200 hover:scale-105 flex items-center gap-2 text-blue-400 hover:text-blue-300"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                TL
              </div>
              <span className="hidden sm:inline">TraderLogs</span>
            </button>
          </div>

          {/* Workflow Navigation */}
          <div className="hidden md:flex items-center space-x-2 overflow-x-auto px-4">
            {workflowSteps.map((step, index) => {
              const isActive = pathname === step.path;
              const isCompleted = workflowSteps.findIndex(s => s.path === pathname) > index;
              
              return (
                <div key={step.id} className="flex items-center flex-shrink-0">
                  <button
                    onClick={() => navigateToStep(step.path)}
                    className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap hover:scale-[1.02] active:scale-95 min-w-fit ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-md'
                        : isCompleted
                        ? 'text-green-400 hover:bg-green-900/20 bg-green-900/10'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700/70'
                    }`}
                    title={`Step ${index + 1}: ${step.title}`}
                  >
                    <span className="mr-2">{step.icon}</span>
                    <span className="hidden xl:inline">{step.title}</span>
                    <span className="xl:hidden font-semibold">{step.title.slice(0, 4)}</span>
                  </button>
                  
                  {index < workflowSteps.length - 1 && (
                    <div className={`mx-2 h-0.5 w-6 rounded-full flex-shrink-0 transition-colors duration-300 ${
                      isCompleted 
                        ? 'bg-green-500' 
                        : 'bg-gray-600'
                    }`}></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right side - Theme toggle, User Menu and Mobile Menu */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}

            {/* User Menu */}
            <UserMenu />

            {/* Mobile Menu - Enhanced dropdown for mobile */}
            <div className="md:hidden">
              <select
                value={pathname}
                onChange={(e) => navigateToStep(e.target.value)}
                className="text-sm border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-medium min-w-[120px] border-gray-600 bg-gray-700/80 text-gray-100 hover:bg-gray-700"
              >
                {workflowSteps.map((step, index) => (
                  <option key={step.id} value={step.path}>
                    {step.icon} {step.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
