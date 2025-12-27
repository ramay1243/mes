'use client'

import { useState } from 'react'

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

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false)
    const img = e.currentTarget
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    })
  }

  const handleImageError = () => {
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
          src={src}
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
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

