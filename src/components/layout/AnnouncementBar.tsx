'use client'
import { useState } from 'react'
import { X } from 'lucide-react'

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(true)
  if (!visible) return null

  return (
    <div className="bg-[#1a1a1a] text-white text-xs md:text-sm py-2 px-4 relative">
      <div className="max-w-7xl mx-auto text-center">
        <span>
          🚚 FREE delivery on orders above{' '}
          <strong>50,000 RWF</strong>
          {' '}| Use code{' '}
          <strong className="text-yellow-400">
            BEAUTY20
          </strong>
          {' '}for 20% off! 🎉
        </span>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
      >
        <X size={14} />
      </button>
    </div>
  )
}
