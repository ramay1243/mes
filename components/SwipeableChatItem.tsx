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
  const contentRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef<number>(0)
  const startYRef = useRef<number>(0)
  const currentXRef = useRef<number>(0)
  const isDraggingRef = useRef<boolean>(false)
  const isHorizontalSwipeRef = useRef<boolean>(false)
  const hasSwipedRef = useRef<boolean>(false)

  const SWIPE_THRESHOLD = 60 // Минимальное расстояние для показа кнопки
  const DELETE_THRESHOLD = 100 // Расстояние для автоматического удаления
  const SWIPE_VELOCITY_THRESHOLD = 0.3 // Минимальная скорость для быстрого свайпа

  const startDrag = (clientX: number, clientY: number) => {
    if (disabled) return false
    startXRef.current = clientX
    startYRef.current = clientY
    currentXRef.current = clientX
    isDraggingRef.current = true
    isHorizontalSwipeRef.current = false
    hasSwipedRef.current = false
    return true
  }

  const updateDrag = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current || disabled) return
    
    const deltaX = startXRef.current - clientX
    const deltaY = Math.abs(startYRef.current - clientY)
    
    // Определяем, это горизонтальный или вертикальный свайп
    if (!isHorizontalSwipeRef.current) {
      if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > deltaY * 1.5) {
        // Горизонтальный свайп
        isHorizontalSwipeRef.current = true
      } else if (deltaY > 10) {
        // Вертикальный свайп - отменяем
        isDraggingRef.current = false
        setSwipeOffset(0)
        return
      }
    }
    
    // Если это горизонтальный свайп, обрабатываем его
    if (isHorizontalSwipeRef.current) {
      currentXRef.current = clientX
      hasSwipedRef.current = true
      
      // Разрешаем только свайп влево (положительное значение deltaX)
      if (deltaX > 0) {
        // Ограничиваем максимальный свайп
        const maxSwipe = 120
        const newOffset = Math.min(deltaX, maxSwipe)
        setSwipeOffset(newOffset)
      } else if (swipeOffset > 0 && deltaX < 0) {
        // Если свайпаем обратно вправо, уменьшаем offset
        const newOffset = Math.max(0, swipeOffset + deltaX)
        setSwipeOffset(newOffset)
      }
    }
  }

  const endDrag = () => {
    if (!isDraggingRef.current || disabled) {
      isDraggingRef.current = false
      isHorizontalSwipeRef.current = false
      return
    }
    
    isDraggingRef.current = false
    
    const finalOffset = swipeOffset
    const totalDiff = startXRef.current - currentXRef.current
    const timeDiff = Date.now() - (startXRef.current as any).timestamp || 0
    const velocity = Math.abs(totalDiff) / Math.max(timeDiff, 1)

    // Если свайп был очень маленьким (< 5px), считаем это кликом и сбрасываем
    if (Math.abs(totalDiff) < 5 || !isHorizontalSwipeRef.current) {
      setSwipeOffset(0)
      isHorizontalSwipeRef.current = false
      return
    }

    // Быстрый свайп или большой свайп = автоматическое удаление
    if (finalOffset >= DELETE_THRESHOLD || (finalOffset >= SWIPE_THRESHOLD && velocity > SWIPE_VELOCITY_THRESHOLD)) {
      handleDelete()
    } else if (finalOffset >= SWIPE_THRESHOLD) {
      // Показываем кнопку удаления
      setSwipeOffset(80)
      onSwipe?.()
    } else {
      // Возвращаем на место, если свайп был маленьким
      setSwipeOffset(0)
    }
    
    // Сбрасываем флаг свайпа через небольшую задержку, чтобы onClick не сработал
    setTimeout(() => {
      hasSwipedRef.current = false
    }, 100)
    
    isHorizontalSwipeRef.current = false
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    // Проверяем, что это не клик по кнопке или инпуту
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('textarea')) {
      return
    }
    
    const touch = e.touches[0]
    if (startDrag(touch.clientX, touch.clientY)) {
      // Сохраняем время начала для расчета скорости
      ;(startXRef.current as any).timestamp = Date.now()
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return
    
    const touch = e.touches[0]
    const deltaX = Math.abs(startXRef.current - touch.clientX)
    const deltaY = Math.abs(startYRef.current - touch.clientY)
    
    // Если это горизонтальный свайп, предотвращаем скролл
    if (isHorizontalSwipeRef.current || (deltaX > 10 && deltaX > deltaY * 1.5)) {
      e.preventDefault()
      e.stopPropagation()
      updateDrag(touch.clientX, touch.clientY)
    } else if (deltaY > 10) {
      // Вертикальный скролл - отменяем свайп
      isDraggingRef.current = false
      isHorizontalSwipeRef.current = false
      setSwipeOffset(0)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isDraggingRef.current && isHorizontalSwipeRef.current) {
      e.preventDefault()
    }
    endDrag()
  }

  const handleTouchCancel = () => {
    isDraggingRef.current = false
    isHorizontalSwipeRef.current = false
    hasSwipedRef.current = false
    setSwipeOffset(0)
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
    
    if (startDrag(e.clientX, e.clientY)) {
      ;(startXRef.current as any).timestamp = Date.now()
      e.preventDefault()
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      updateDrag(e.clientX, e.clientY)
      if (isHorizontalSwipeRef.current) {
        e.preventDefault()
      }
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
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSwipeOffset(0)
        isDraggingRef.current = false
        isHorizontalSwipeRef.current = false
      }
    }

    if (swipeOffset > 0) {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
        document.removeEventListener('touchstart', handleClickOutside)
      }
    }
  }, [swipeOffset])

  // Предотвращаем скролл при горизонтальном свайпе
  useEffect(() => {
    const handleTouchMoveGlobal = (e: TouchEvent) => {
      if (isDraggingRef.current && isHorizontalSwipeRef.current) {
        // Только если это касается нашего элемента
        const target = e.target as HTMLElement
        if (containerRef.current && containerRef.current.contains(target)) {
          e.preventDefault()
        }
      }
    }

    document.addEventListener('touchmove', handleTouchMoveGlobal, { passive: false })
    return () => {
      document.removeEventListener('touchmove', handleTouchMoveGlobal)
    }
  }, [])

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden"
      style={{
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y'
      }}
    >
      {/* Кнопка удаления (фон) */}
      <div 
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 z-10"
        style={{ 
          width: '90px',
          opacity: swipeOffset > 0 ? Math.min(1, swipeOffset / 80) : 0,
          transition: swipeOffset === 0 ? 'opacity 0.2s' : 'none',
          pointerEvents: swipeOffset > 0 ? 'auto' : 'none',
          boxShadow: swipeOffset > 0 ? 'inset -2px 0 10px rgba(0,0,0,0.1)' : 'none'
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            handleDelete()
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            e.preventDefault()
            handleDelete()
          }}
          className="text-white font-bold text-xl px-4 py-3 rounded-lg active:bg-red-700 active:scale-95 transition-all"
          aria-label="Удалить чат"
          style={{ 
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          🗑️
        </button>
      </div>

      {/* Контент */}
      <div
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={(e) => {
          // Предотвращаем клик, если был свайп
          if (hasSwipedRef.current || swipeOffset > 0) {
            e.stopPropagation()
            e.preventDefault()
          }
        }}
        className="relative bg-white select-none swipeable-content"
        style={{ 
          transform: isDeleting ? 'translateX(-100%)' : `translateX(-${swipeOffset}px)`,
          transition: isDeleting ? 'transform 0.2s ease-out' : (swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none'),
          touchAction: 'pan-x pan-y',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
          willChange: isDraggingRef.current ? 'transform' : 'auto'
        }}
      >
        {children}
      </div>
    </div>
  )
}
