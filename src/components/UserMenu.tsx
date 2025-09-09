'use client'

import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function UserMenu() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)

  if (!session?.user) {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-sm bg-gray-700/70 rounded-lg px-3 py-2.5 hover:bg-gray-700 transition-all duration-200 hover:scale-105 active:scale-95"
      >
        {session.user.image && (
          <img
            src={session.user.image}
            alt={session.user.name || "User"}
            className="w-7 h-7 rounded-full ring-2 ring-blue-500/20"
          />
        )}
        <span className="hidden sm:block font-medium">
          {session.user.name || session.user.email}
        </span>
        <svg
          className={`w-4 h-4 transition-all duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-56 bg-gray-800/95 border border-gray-600/30 rounded-2xl shadow-xl backdrop-blur-md z-50 overflow-hidden">
          <div className="py-2">
            <div className="px-4 py-3 text-sm border-b border-gray-600/30">
              <div className="font-semibold text-white">{session.user.name}</div>
              <div className="text-gray-400 text-xs mt-1">{session.user.email}</div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              className="flex items-center w-full text-left px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-900/20 transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
