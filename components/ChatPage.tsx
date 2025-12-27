'use client'

import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import EmojiPicker from './EmojiPicker'
import SwipeableChatItem from './SwipeableChatItem'

interface User {
  id: string
  phone: string
  name: string | null
  avatar: string | null
}

interface Message {
  id: string
  text: string
  senderId: string
  receiverId: string | null
  createdAt: string
  sender: User
  receiver: User | null
}

interface ChatPageProps {
  user: User
  onLogout: () => void
}

export default function ChatPage({ user, onLogout }: ChatPageProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [userName, setUserName] = useState(user.name || '')
  const [showSidebar, setShowSidebar] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const selectedUserRef = useRef<User | null>(null)
  
  // Синхронизируем ref с state
  useEffect(() => {
    selectedUserRef.current = selectedUser
  }, [selectedUser])

  useEffect(() => {
    // Обновляем сообщения каждые 2 секунды
    const interval = setInterval(() => {
      loadMessages()
    }, 2000)

    return () => clearInterval(interval)
  }, [selectedUser])

  useEffect(() => {
    if (selectedUser) {
      loadMessages()
    }
  }, [selectedUser])

  useEffect(() => {
    loadUsers()
  }, [userSearchQuery])

  // Загружаем пользователей при монтировании
  useEffect(() => {
    loadUsers()
  }, [])

  // На мобильных показываем список чатов если никто не выбран
  useEffect(() => {
    if (typeof window !== 'undefined' && !selectedUser && users.length > 0 && window.innerWidth < 768) {
      setShowSidebar(true)
    }
  }, [selectedUser, users])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
    if (!selectedUser) {
      setMessages([])
      return
    }
    
    try {
      const params = `?receiverId=${selectedUser.id}`
      console.log('Loading messages for chat with:', {
        currentUser: user.id,
        selectedUser: selectedUser.id,
        params
      })
      
      const response = await axios.get(`/api/messages${params}`)
      const loadedMessages = response.data.messages || []
      
      console.log('Loaded messages:', {
        count: loadedMessages.length,
        messages: loadedMessages.map((m: Message) => ({
          id: m.id,
          from: m.senderId,
          to: m.receiverId,
          text: m.text.substring(0, 20)
        }))
      })
      
      setMessages(loadedMessages)
    } catch (error) {
      console.error('Error loading messages:', error)
      setMessages([])
    }
  }

  const loadUsers = async () => {
    try {
      // Если есть поиск - ищем всех пользователей
      // Если нет поиска - показываем только тех, с кем есть переписка
      const params = userSearchQuery ? `?search=${encodeURIComponent(userSearchQuery)}` : ''
      const response = await axios.get(`/api/users${params}`)
      setUsers(response.data.users || [])
    } catch (error) {
      console.error('Error loading users:', error)
      setUsers([]) // Устанавливаем пустой массив при ошибке
    }
  }

  const updateUserName = async () => {
    try {
      await axios.patch('/api/users/me', { name: userName })
      setEditingName(false)
      // Обновляем данные пользователя
      const response = await axios.get('/api/auth/me')
      if (response.data.user) {
        setUserName(response.data.user.name || '')
      }
    } catch (error) {
      console.error('Error updating name:', error)
    }
  }

  // Фильтруем пользователей по поисковому запросу
  const filteredUsers = users.filter(u => {
    if (!userSearchQuery) return true
    const query = userSearchQuery.toLowerCase()
    return (
      u.phone.toLowerCase().includes(query) ||
      (u.name && u.name.toLowerCase().includes(query))
    )
  })

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim()) {
      return
    }
    
    // ИСПОЛЬЗУЕМ REF для гарантии что selectedUser не изменится
    const currentSelectedUser = selectedUserRef.current
    
    if (!currentSelectedUser) {
      console.error('❌ Cannot send: no selected user in ref')
      alert('Ошибка: не выбран получатель сообщения')
      return
    }

    const messageText = newMessage.trim()
    const targetUserId = currentSelectedUser.id
    
    // Проверка ID
    if (!targetUserId || targetUserId === user.id) {
      console.error('❌ Invalid target user:', { 
        targetUserId, 
        currentUserId: user.id, 
        selectedUser: currentSelectedUser 
      })
      alert('Ошибка: неверный получатель сообщения')
      return
    }
    
    // Дополнительная проверка что selectedUser в state совпадает с ref
    if (selectedUser?.id !== targetUserId) {
      console.warn('⚠️ Warning: selectedUser state differs from ref', {
        stateId: selectedUser?.id,
        refId: targetUserId
      })
      // Используем ref, так как он более надежен
    }
    
    console.log('✅ Sending message:', {
      from: { id: user.id, name: user.name || user.phone },
      to: { id: targetUserId, name: currentSelectedUser.name || currentSelectedUser.phone },
      text: messageText.substring(0, 50)
    })
    
    setNewMessage('')

    try {
      const response = await axios.post('/api/messages', {
        text: messageText,
        receiverId: targetUserId
      })
      
      const sentMessage = response.data.message
      
      // КРИТИЧЕСКАЯ ПРОВЕРКА: проверяем что сообщение отправлено правильному получателю
      if (sentMessage.receiverId !== targetUserId) {
        console.error('❌ CRITICAL ERROR: Message sent to wrong receiver!', {
          expected: targetUserId,
          expectedName: currentSelectedUser.name || currentSelectedUser.phone,
          actual: sentMessage.receiverId,
          actualName: sentMessage.receiver?.name || sentMessage.receiver?.phone,
          message: sentMessage
        })
        alert(`ОШИБКА: Сообщение отправлено не тому получателю!\nОжидалось: ${currentSelectedUser.name || currentSelectedUser.phone}\nПолучено: ${sentMessage.receiver?.name || sentMessage.receiver?.phone}`)
        setNewMessage(messageText) // Возвращаем текст
        return
      }
      
      console.log('✅ Message sent successfully to:', {
        receiverId: sentMessage.receiverId,
        receiverName: sentMessage.receiver?.name || sentMessage.receiver?.phone
      })
      
      // Обновляем сообщения после отправки
      await loadMessages()
      setShowEmojiPicker(false)
    } catch (error: any) {
      console.error('❌ Error sending message:', error)
      const errorMsg = error?.response?.data?.error || error?.message || 'Неизвестная ошибка'
      alert(`Ошибка отправки: ${errorMsg}`)
      // Возвращаем текст сообщения обратно в поле ввода
      setNewMessage(messageText)
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji)
    inputRef.current?.focus()
  }

  const handleDeleteChat = async (userId: string) => {
    if (!confirm('Удалить все сообщения с этим пользователем?')) {
      return
    }

    try {
      await axios.delete(`/api/chats/delete?userId=${userId}`)
      
      // Если удаляемый чат был выбран - сбрасываем выбор
      if (selectedUser?.id === userId) {
        setSelectedUser(null)
        setMessages([])
      }
      
      // Обновляем список пользователей
      await loadUsers()
      
      console.log('✅ Chat deleted successfully')
    } catch (error: any) {
      console.error('Error deleting chat:', error)
      alert(`Ошибка при удалении чата: ${error?.response?.data?.error || error?.message}`)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex h-screen bg-[#e5ddd5] overflow-hidden relative w-full">
      {/* Боковая панель с пользователями */}
      <div className={`${showSidebar || (!selectedUser && typeof window !== 'undefined' && window.innerWidth < 768) ? 'flex' : 'hidden'} md:flex w-full md:w-80 bg-white flex flex-col fixed md:relative z-40 h-full shadow-xl md:shadow-none inset-0 md:inset-auto`}>
        {/* Заголовок с профилем */}
        <div className="p-3 bg-[#075e54] text-white">
          <div className="flex items-center justify-between mb-3">
            {editingName ? (
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onBlur={updateUserName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') updateUserName()
                    if (e.key === 'Escape') {
                      setEditingName(false)
                      setUserName(user.name || '')
                    }
                  }}
                  className="flex-1 px-2 py-1 border border-blue-300 rounded text-sm text-gray-900 bg-white"
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex-1">
                <h2 
                  className="font-semibold text-white cursor-pointer hover:text-gray-200"
                  onClick={() => setEditingName(true)}
                  title="Нажмите, чтобы изменить имя"
                >
                  {userName || user.phone}
                </h2>
                <p className="text-sm text-gray-200">{user.phone}</p>
              </div>
            )}
            <button
              onClick={onLogout}
              className="px-3 py-1 text-sm text-white hover:bg-red-600 rounded-lg transition-colors"
              title="Выйти"
            >
              Выйти
            </button>
          </div>
          
          {/* Поиск пользователей */}
          <div className="relative">
            <input
              type="text"
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              placeholder={userSearchQuery ? "Поиск..." : "Поиск пользователей"}
              className="w-full px-4 py-2 pl-10 border-0 rounded-lg focus:ring-2 focus:ring-white focus:outline-none text-sm text-gray-900 bg-white bg-opacity-90"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            {userSearchQuery && (
              <button
                onClick={() => setUserSearchQuery('')}
                className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"
                aria-label="Очистить поиск"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Список чатов */}
        <div className="flex-1 overflow-y-auto bg-white">
          {filteredUsers.length > 0 ? (
            <>
              {!userSearchQuery && (
                <div className="p-3 text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                  Чаты ({filteredUsers.length})
                </div>
              )}
              {userSearchQuery && (
                <div className="p-3 text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                  Результаты поиска ({filteredUsers.length})
                </div>
              )}
              {filteredUsers.map((u) => (
                <SwipeableChatItem
                  key={u.id}
                  onDelete={() => handleDeleteChat(u.id)}
                  disabled={userSearchQuery.length > 0} // Отключаем свайп во время поиска
                >
                  <div
                    className={`p-3 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-100 ${
                      selectedUser?.id === u.id ? 'bg-[#f0f2f5]' : ''
                    }`}
                    onClick={() => {
                      console.log('✅ User selected:', { id: u.id, name: u.name || u.phone })
                      setSelectedUser(u)
                      setShowSidebar(false) // Закрываем сайдбар на мобильных
                      setUserSearchQuery('') // Очищаем поиск после выбора
                      setMessages([]) // Очищаем сообщения при смене пользователя
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#075e54] flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                        {(u.name || u.phone).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 truncate">
                          {u.name || u.phone}
                        </div>
                        <div className="text-sm text-gray-500 truncate">{u.phone}</div>
                      </div>
                    </div>
                  </div>
                </SwipeableChatItem>
              ))}
            </>
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">
              {userSearchQuery ? (
                <div>
                  <p className="mb-2">Пользователи не найдены</p>
                  <button
                    onClick={() => setUserSearchQuery('')}
                    className="text-[#075e54] hover:underline"
                  >
                    Очистить поиск
                  </button>
                </div>
              ) : (
                <div className="py-8">
                  <div className="text-4xl mb-3">💬</div>
                  <p className="mb-2 font-medium">Нет чатов</p>
                  <p className="text-xs text-gray-400 mb-4">
                    Начните общение с кем-то, и чат появится здесь
                  </p>
                  <p className="text-xs text-gray-400">
                    Используйте поиск, чтобы найти пользователей
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Область чата */}
      <div className={`flex-1 flex flex-col ${!selectedUser ? 'hidden md:flex' : 'flex'} min-w-0 w-full`}>
        {selectedUser ? (
          <>
            {/* Заголовок чата */}
            <div className="bg-[#075e54] text-white p-2 md:p-3 flex items-center gap-2 md:gap-3">
              <button
                onClick={() => {
                  setShowSidebar(true)
                  setSelectedUser(null) // Сбрасываем выбранного пользователя на мобильных
                }}
                className="md:hidden p-2 hover:bg-white hover:bg-opacity-10 rounded-full transition-colors flex-shrink-0"
                aria-label="Меню"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {(selectedUser.name || selectedUser.phone).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-white truncate text-sm md:text-base">
                  {selectedUser.name || selectedUser.phone}
                </h2>
                <p className="text-xs md:text-sm text-gray-200 truncate">{selectedUser.phone}</p>
              </div>
            </div>

            {/* Сообщения */}
            <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-1 bg-[#e5ddd5] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj48cGF0aCBkPSJtIDAgMCBoIDQwIHYgNDAgaCAtNDAgeiIgZmlsbD0iI2U1ZGRkNSIvPjxwYXRoIGQ9Ik0gMCAwIEwgNDAgNDAgTSA0MCAwIEwgMCA0MCIgc3Ryb2tlPSIjZGRkZGRkIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')] min-h-0 pb-safe">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 px-4">
                  <div className="text-center">
                    <div className="text-4xl mb-2">💬</div>
                    <p className="text-base md:text-lg font-medium">Нет сообщений</p>
                    <p className="text-sm mt-1 text-gray-400">Начните общение!</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwn = message.senderId === user.id
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-1 md:gap-2 mb-1 px-1`}
                    >
                      {!isOwn && (
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#075e54] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {(message.sender.name || message.sender.phone).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] sm:max-w-[75%] md:max-w-md px-3 py-1.5 md:px-4 md:py-2 rounded-lg shadow-sm ${
                          isOwn
                            ? 'bg-[#dcf8c6] text-gray-800 rounded-br-none'
                            : 'bg-white text-gray-800 rounded-bl-none'
                        }`}
                      >
                        <div className="break-words text-sm md:text-base leading-relaxed whitespace-pre-wrap">{message.text}</div>
                        <div className={`text-xs mt-0.5 ${isOwn ? 'text-gray-500' : 'text-gray-400'} text-right`}>
                          {formatTime(message.createdAt)}
                        </div>
                      </div>
                      {isOwn && (
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#075e54] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {(user.name || user.phone).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Форма отправки сообщения */}
            <form onSubmit={sendMessage} className="bg-[#f0f2f5] p-2 md:p-4 relative border-t border-gray-200 safe-area-inset-bottom">
              <div className="flex gap-2 items-end">
                <div className="relative flex-1 min-w-0">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={selectedUser ? `Сообщение для ${selectedUser.name || selectedUser.phone}` : "Введите сообщение"}
                    className="w-full px-4 py-2.5 md:py-3 pr-12 border-0 rounded-full focus:ring-2 focus:ring-[#075e54] focus:outline-none text-gray-900 bg-white text-sm md:text-base"
                    style={{ color: '#111827' }}
                    onFocus={() => setShowEmojiPicker(false)}
                  />
                  <div className="absolute right-2 bottom-2">
                    <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                  </div>
                </div>
                <button
                  type="submit"
                  className="p-2.5 md:p-3 bg-[#075e54] text-white rounded-full hover:bg-[#064e47] active:bg-[#053d37] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[44px] md:min-w-[50px] flex-shrink-0"
                  disabled={!newMessage.trim() || !selectedUser}
                  aria-label="Отправить"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#e5ddd5] min-h-screen md:min-h-0">
            <div className="text-center text-gray-500 px-4 max-w-sm">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-lg font-medium mb-2">Выберите чат</p>
              <p className="text-sm text-gray-400 mb-4">
                {users.length === 0 
                  ? 'Используйте поиск, чтобы найти пользователей и начать общение'
                  : 'Выберите чат из списка или найдите пользователя через поиск'
                }
              </p>
              <button
                onClick={() => {
                  setShowSidebar(true)
                  inputRef.current?.focus()
                }}
                className="md:hidden px-6 py-3 bg-[#075e54] text-white rounded-full font-medium hover:bg-[#064e47] active:bg-[#053d37] transition-colors mt-4"
              >
                {users.length > 0 ? 'Открыть чаты' : 'Найти пользователей'}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Overlay для мобильных */}
      {showSidebar && typeof window !== 'undefined' && window.innerWidth < 768 && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => {
            setShowSidebar(false)
            if (!selectedUser) {
              // Если никто не выбран, возвращаемся к списку
              setShowSidebar(true)
            }
          }}
        />
      )}
    </div>
  )
}












