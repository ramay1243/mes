// Утилиты для работы с Telegram WebView

export const isTelegramWebView = (): boolean => {
  if (typeof window === 'undefined') return false
  
  const userAgent = window.navigator.userAgent.toLowerCase()
  return userAgent.includes('telegram') || 
         userAgent.includes('webview') ||
         window.location.search.includes('tgWebApp')
}

export const initTelegramWebApp = () => {
  if (typeof window === 'undefined' || !isTelegramWebView()) return null

  // Проверяем наличие Telegram WebApp API
  if ((window as any).Telegram?.WebApp) {
    const tg = (window as any).Telegram.WebApp
    
    // Расширяем приложение на весь экран
    tg.expand()
    
    // Включаем закрытие клавиатуры при свайпе вниз
    tg.enableClosingConfirmation()
    
    // Настраиваем цвета
    tg.setHeaderColor('#075e54')
    tg.setBackgroundColor('#e5ddd5')
    
    // Включаем вибрацию (опционально)
    tg.HapticFeedback?.impactOccurred('light')
    
    return tg
  }
  
  return null
}

export const getTelegramViewportHeight = (): number => {
  if (typeof window === 'undefined') return window.innerHeight
  
  // В Telegram WebView используем визуальную высоту
  if (isTelegramWebView() && window.visualViewport) {
    return window.visualViewport.height
  }
  
  return window.innerHeight
}

