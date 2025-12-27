'use client'

import { useState, useEffect, useRef } from 'react'

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
}

const EMOJI_CATEGORIES = {
  '😀': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'],
  '😢': ['😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴'],
  '👋': ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  '❤️': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎'],
  '👍': ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '🖕', '👇', '☝️', '👏', '🙌', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂'],
}

export default function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('😀')
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji)
  }

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-2xl hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
        aria-label="Открыть эмодзи"
      >
        😊
      </button>
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl w-80 h-80 flex flex-col z-50">
          {/* Заголовок */}
          <div className="flex items-center justify-between p-2 border-b border-gray-200">
            <div className="flex gap-1">
              {Object.keys(EMOJI_CATEGORIES).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category as keyof typeof EMOJI_CATEGORIES)}
                  className={`p-1 text-xl rounded ${activeCategory === category ? 'bg-gray-100' : ''}`}
                >
                  {category}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-500 hover:text-gray-700"
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>

          {/* Эмодзи */}
          <div className="flex-1 overflow-y-auto p-2 grid grid-cols-8 gap-1">
            {EMOJI_CATEGORIES[activeCategory].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                className="p-2 text-2xl hover:bg-gray-100 rounded transition-colors focus:outline-none"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

