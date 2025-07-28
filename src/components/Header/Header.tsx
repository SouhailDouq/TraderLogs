'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

const workflowSteps = [
  { id: 'calendar', title: 'Calendar', path: '/', icon: '📅' },
  { id: 'research', title: 'Research', path: '/trade-analyzer', icon: '📊' },
  { id: 'risk', title: 'Risk', path: '/risk-management', icon: '🛡️' },
  { id: 'execute', title: 'Execute', path: '/trade-entry', icon: '⚡' },
  { id: 'monitor', title: 'Monitor', path: '/portfolio', icon: '👁️' },
  { id: 'review', title: 'Review', path: '/performance', icon: '📈' }
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
    
    setIsDarkMode(shouldBeDark);
    applyTheme(shouldBeDark);
  }, []);

  const applyTheme = (isDark: boolean) => {
    const root = document.documentElement;
    
    if (isDark) {
      root.style.setProperty('--background', '#111827');
      root.style.setProperty('--foreground', '#f9fafb');
      root.classList.add('dark');
      document.body.style.backgroundColor = '#111827';
      document.body.style.color = '#f9fafb';
    } else {
      root.style.setProperty('--background', '#ffffff');
      root.style.setProperty('--foreground', '#171717');
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#f9fafb';
      document.body.style.color = '#111827';
    }
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    
    setIsDarkMode(newTheme);
    applyTheme(newTheme);
    
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    
    console.log('Theme toggled to:', newTheme ? 'dark' : 'light');
  };

  const navigateToStep = (path: string) => {
    router.push(path);
  };

  return (
    <nav className={`border-b transition-colors ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-600' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          {/* Logo */}
          <div className="flex items-center">
            <button
              onClick={() => router.push('/')}
              className={`text-xl font-semibold transition-colors ${
                isDarkMode
                  ? 'text-blue-400 hover:text-blue-300'
                  : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              TraderLogs
            </button>
          </div>

          {/* Workflow Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {workflowSteps.map((step, index) => {
              const isActive = pathname === step.path;
              const isCompleted = workflowSteps.findIndex(s => s.path === pathname) > index;
              
              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => navigateToStep(step.path)}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? isDarkMode
                          ? 'bg-blue-900 text-blue-300 border border-blue-700'
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                        : isCompleted
                        ? isDarkMode
                          ? 'text-green-400 hover:bg-green-900/20'
                          : 'text-green-600 hover:bg-green-50'
                        : isDarkMode
                        ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    title={`Step ${index + 1}: ${step.title}`}
                  >
                    <span className="mr-2">{step.icon}</span>
                    <span className="hidden lg:inline">{step.title}</span>
                    <span className="lg:hidden">{index + 1}</span>
                  </button>
                  
                  {index < workflowSteps.length - 1 && (
                    <div className={`mx-1 h-0.5 w-3 ${
                      isCompleted ? 'bg-green-400' : 'bg-gray-300'
                    }`}></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right side - Theme toggle and Mobile Menu */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>

            {/* Mobile Menu - Simple dropdown for mobile */}
            <div className="md:hidden">
              <select
                value={pathname}
                onChange={(e) => navigateToStep(e.target.value)}
                className={`text-sm border rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  isDarkMode
                    ? 'border-gray-600 bg-gray-700 text-gray-100'
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
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
