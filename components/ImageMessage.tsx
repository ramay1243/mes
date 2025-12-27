'use client'

import { useState, useEffect, useRef } from 'react'

interface ImageMessageProps {
  src: string
  alt?: string
  isOwn?: boolean
}

export default function ImageMessage({ src, alt = 'Фото', isOwn = false }: ImageMessageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Нормализуем URL (если относительный, делаем абсолютным)
  const imageUrl = src?.startsWith('http') ? src : (src?.startsWith('/') ? src : `/${src}`)
  
  useEffect(() => {
    if (src) {
      console.log('🖼️ ImageMessage src:', src, 'normalized:', imageUrl)
    }
  }, [src, imageUrl])

  // Проверяем, загружено ли изображение уже (из кэша) и устанавливаем таймаут
  useEffect(() => {
    // Сбрасываем состояние при изменении src
    setIsLoading(true)
    setImageError(false)
    setImageDimensions(null)

    // Очищаем предыдущий таймаут
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    // Проверяем кэш после того, как элемент отрендерится
    const checkCache = () => {
      if (imgRef.current) {
        const img = imgRef.current
        
        // Если изображение уже загружено (из кэша)
        if (img.complete && img.naturalHeight !== 0) {
          setIsLoading(false)
          setImageDimensions({
            width: img.naturalWidth,
            height: img.naturalHeight
          })
          return true
        }
      }
      return false
    }

    // Проверяем несколько раз с небольшими интервалами
    const checkInterval = setInterval(() => {
      if (checkCache()) {
        clearInterval(checkInterval)
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
      }
    }, 50)

    // Останавливаем проверку через 500ms (достаточно для проверки кэша)
    const stopCheckTimeout = setTimeout(() => {
      clearInterval(checkInterval)
    }, 500)

    // Таймаут на случай, если изображение не загрузится за 10 секунд
    timeoutRef.current = setTimeout(() => {
      setIsLoading((prev) => {
        if (prev) {
          console.warn('Image loading timeout:', src)
          setImageError(true)
          return false
        }
        return prev
      })
    }, 10000)

    return () => {
      clearInterval(checkInterval)
      clearTimeout(stopCheckTimeout)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [src])

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsLoading(false)
    const img = e.currentTarget
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    })
  }

  const handleImageError = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsLoading(false)
    setImageError(true)
  }

  if (imageError) {
    return (
      <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-2xl mb-2">📷</div>
          <div className="text-sm">Ошибка загрузки</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="relative group inline-block">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center z-10 min-w-[200px] min-h-[150px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#075e54]"></div>
          </div>
        )}
        <img
          ref={imgRef}
          src={imageUrl}
          alt={alt}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`rounded-lg cursor-pointer transition-all duration-200 hover:opacity-90 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            maxWidth: 'min(300px, 80vw)',
            maxHeight: '400px',
            minWidth: '150px',
            minHeight: '150px',
            width: 'auto',
            height: 'auto',
            display: 'block',
            borderRadius: '7.5px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            objectFit: 'contain'
          }}
          onClick={() => setShowFullscreen(true)}
          loading="lazy"
          decoding="async"
        />
        {/* Иконка увеличения при наведении (только на десктопе) */}
        <div className="hidden md:block absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 rounded-full p-1.5 pointer-events-none">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </div>
      </div>

      {/* Модальное окно для полноэкранного просмотра */}
      {showFullscreen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-[200] flex items-center justify-center p-4"
          onClick={() => setShowFullscreen(false)}
        >
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
            aria-label="Закрыть"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={imageUrl}
            alt={alt}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

