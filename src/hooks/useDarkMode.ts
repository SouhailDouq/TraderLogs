'use client';

import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to true since we force dark mode

  useEffect(() => {
    // Always set to dark mode - app is designed for dark mode only
    setIsDarkMode(true);
    
    // Ensure dark class is always present
    if (!document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.add('dark');
    }
    
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };
    
    // Listen for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  return isDarkMode;
}
