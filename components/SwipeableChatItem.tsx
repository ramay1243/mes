'use client'

import { useState, useRef, useEffect } from 'react'

interface SwipeableChatItemProps {
  children: React.ReactNode
  onDelete: () => void
  onSwipe?: () => void
  disabled?: boolean
}

export default function SwipeableChatItem({ 
  children, 
  onDelete, 
  onSwipe,
  disabled = false 
}: SwipeableChatItemProps) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef<number>(0)
  const currentXRef = useRef<number>(0)
  const isDraggingRef = useRef<boolean>(false)

  const SWIPE_THRESHOLD = 80 // Минимальное расстояние для удаления
  const DELETE_THRESHOLD = 120 // Расстояние для автоматического удаления

  const startDrag = (clientX: number) => {
    if (disabled) return false
    startXRef.current = clientX
    currentXRef.current = clientX
    isDraggingRef.current = true
    return true
  }

  const updateDrag = (clientX: number) => {
    if (!isDraggingRef.current || disabled) return
    
    currentXRef.current = clientX
    const diff = startXRef.current - currentXRef.current
    
    // Разрешаем только свайп влево (положительное значение diff)
    // Минимальный свайп для начала движения - 5px (чтобы не мешать кликам)
    if (diff > 5) {
      // Ограничиваем максимальный свайп
      const maxSwipe = 120
      const newOffset = Math.min(diff, maxSwipe)
      setSwipeOffset(newOffset)
    } else if (swipeOffset > 0 && diff < -5) {
      // Если свайпаем обратно вправо, уменьшаем offset
      const newOffset = Math.max(0, swipeOffset + diff)
      setSwipeOffset(newOffset)
    }
  }

  const endDrag = () => {
    if (!isDraggingRef.current || disabled) {
      isDraggingRef.current = false
      return
    }
    
    isDraggingRef.current = false
    
    // Используем текущее значение из ref для более точного определения
    const finalOffset = swipeOffset
    const totalDiff = startXRef.current - currentXRef.current

    // Если свайп был очень маленьким (< 10px), считаем это кликом и сбрасываем
    if (Math.abs(totalDiff) < 10) {
      setSwipeOffset(0)
      return
    }

    if (finalOffset >= DELETE_THRESHOLD) {
      // Автоматическое удаление при большом свайпе
      handleDelete()
    } else if (finalOffset >= SWIPE_THRESHOLD) {
      // Показываем кнопку удаления
      setSwipeOffset(80)
      onSwipe?.()
    } else {
      // Возвращаем на место, если свайп был маленьким
      setSwipeOffset(0)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    // Проверяем, что это не клик по кнопке или инпуту
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('textarea')) {
      return
    }
    
    startDrag(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    updateDrag(e.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    endDrag()
  }

  // Поддержка мыши для десктопов (опционально, для тестирования)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Только если зажата левая кнопка мыши
    if (e.button !== 0) return
    
    // Проверяем, что это не клик по кнопке или инпуту
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('textarea')) {
      return
    }
    
    if (startDrag(e.clientX)) {
      e.preventDefault()
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      updateDrag(e.clientX)
      e.preventDefault()
    }
  }

  const handleMouseUp = () => {
    endDrag()
  }

  const handleDelete = () => {
    setIsDeleting(true)
    setTimeout(() => {
      onDelete()
      setSwipeOffset(0)
      setIsDeleting(false)
    }, 200)
  }

  // Сброс при клике вне элемента
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSwipeOffset(0)
      }
    }

    if (swipeOffset > 0) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [swipeOffset])

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden"
    >
      {/* Кнопка удаления (фон) */}
      <div 
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-red-500 z-10"
        style={{ 
          width: '80px',
          opacity: swipeOffset > 0 ? 1 : 0,
          transition: 'opacity 0.2s'
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDelete()
          }}
          className="text-white font-medium text-sm px-4 py-2 rounded active:bg-red-600"
          aria-label="Удалить чат"
        >
          🗑️
        </button>
      </div>

      {/* Контент */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // Сбрасываем при выходе курсора
        className="relative bg-white transition-transform duration-200 select-none"
        style={{ 
          transform: isDeleting ? 'translateX(-100%)' : `translateX(-${swipeOffset}px)`,
          touchAction: 'pan-y',
          userSelect: 'none'
        }}
      >
        {children}
      </div>
    </div>
  )
}

