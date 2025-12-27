'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthPage from '@/components/AuthPage'
import ChatPage from '@/components/ChatPage'
import { initTelegramWebApp, isTelegramWebView } from '@/lib/telegram'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Инициализируем Telegram WebApp если открыто в Telegram
    if (isTelegramWebView()) {
      initTelegramWebApp()
      // Добавляем класс для Telegram WebView
      document.documentElement.classList.add('telegram-webview')
      document.body.classList.add('telegram-webview')
    }
    
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#e5ddd5]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">💬</div>
          <div className="text-xl text-gray-600">Загрузка...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage onAuthSuccess={checkAuth} />
  }

  return <ChatPage user={user} onLogout={handleLogout} />
}

