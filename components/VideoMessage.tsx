'use client'

import { useState } from 'react'

interface VideoMessageProps {
  src: string
  isOwn?: boolean
}

export default function VideoMessage({ src, isOwn = false }: VideoMessageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-2xl mb-2">🎥</div>
          <div className="text-sm">Ошибка загрузки видео</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#075e54]"></div>
        </div>
      )}
      <video
        src={src}
        controls
        className="w-auto h-auto rounded-lg"
        style={{
          maxWidth: 'min(300px, 80vw)',
          maxHeight: '400px',
          display: 'block',
          borderRadius: '7.5px'
        }}
        onLoadedData={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false)
          setHasError(true)
        }}
        preload="metadata"
      >
        Ваш браузер не поддерживает видео.
      </video>
    </div>
  )
}

