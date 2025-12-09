'use client'

import { useState } from 'react'

interface DashboardTabsProps {
  personalContent: React.ReactNode
  teamContent: React.ReactNode
}

export default function DashboardTabs({ personalContent, teamContent }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'team'>('personal')

  return (
    <div>
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-4 px-6 font-medium text-sm focus:outline-none transition-colors ${
            activeTab === 'personal'
              ? 'border-b-2 border-indigo-500 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('personal')}
        >
          Personal Dashboard
        </button>
        <button
          className={`py-4 px-6 font-medium text-sm focus:outline-none transition-colors ${
            activeTab === 'team'
              ? 'border-b-2 border-indigo-500 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('team')}
        >
          Team Dashboard
        </button>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'personal' ? personalContent : teamContent}
      </div>
    </div>
  )
}
