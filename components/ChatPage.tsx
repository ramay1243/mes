'use client'

import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import EmojiPicker from './EmojiPicker'

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

  useEffect(() => {
    // Обновляем сообщения каждые 2 секунды
    const interval = setInterval(() => {
      loadMessages()
    }, 2000)

    return () => clearInterval(interval)
  }, [selectedUser])

  useEffect(() => {
    loadMessages()
  }, [selectedUser])

  useEffect(() => {
    loadUsers()
  }, [userSearchQuery])

  // Загружаем пользователей при монтировании
  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
    if (!selectedUser) return // Не загружаем сообщения если никто не выбран
    
    try {
      const params = `?receiverId=${selectedUser.id}`
      const response = await axios.get(`/api/messages${params}`)
      // Фильтруем только сообщения между текущим пользователем и выбранным
      const filteredMessages = response.data.messages.filter((msg: Message) => 
        (msg.senderId === user.id && msg.receiverId === selectedUser.id) ||
        (msg.senderId === selectedUser.id && msg.receiverId === user.id)
      )
      setMessages(filteredMessages)
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const loadUsers = async () => {
    try {
      const params = userSearchQuery ? `?search=${encodeURIComponent(userSearchQuery)}` : ''
      const response = await axios.get(`/api/users${params}`)
      setUsers(response.data.users)
    } catch (error) {
      console.error('Error loading users:', error)
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
    if (!newMessage.trim() || !selectedUser) return

    const messageText = newMessage.trim()
    setNewMessage('')

    try {
      await axios.post('/api/messages', {
        text: messageText,
        receiverId: selectedUser.id
      })
      loadMessages()
      setShowEmojiPicker(false)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji)
    inputRef.current?.focus()
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex h-screen bg-[#e5ddd5] overflow-hidden">
      {/* Боковая панель с пользователями */}
      <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex w-full md:w-80 bg-white flex flex-col absolute md:relative z-40 h-full`}>
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
              placeholder="Поиск или новый чат"
              className="w-full px-4 py-2 pl-10 border-0 rounded-lg focus:ring-2 focus:ring-white focus:outline-none text-sm text-gray-900 bg-white bg-opacity-90"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
        </div>

        {/* Список чатов */}
        <div className="flex-1 overflow-y-auto bg-white">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((u) => (
              <div
                key={u.id}
                className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                  selectedUser?.id === u.id ? 'bg-[#f0f2f5]' : ''
                }`}
                onClick={() => {
                  setSelectedUser(u)
                  setShowSidebar(false) // Закрываем сайдбар на мобильных
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
            ))
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">
              {userSearchQuery ? 'Пользователи не найдены' : 'Нет других пользователей'}
            </div>
          )}
        </div>
      </div>

      {/* Область чата */}
      <div className={`flex-1 flex flex-col ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
        {selectedUser ? (
          <>
            {/* Заголовок чата */}
            <div className="bg-[#075e54] text-white p-3 flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(true)}
                className="md:hidden p-2 hover:bg-white hover:bg-opacity-10 rounded-full transition-colors"
                aria-label="Меню"
              >
                ☰
              </button>
              <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {(selectedUser.name || selectedUser.phone).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-white truncate">
                  {selectedUser.name || selectedUser.phone}
                </h2>
                <p className="text-sm text-gray-200 truncate">{selectedUser.phone}</p>
              </div>
            </div>

            {/* Сообщения */}
            <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-1 bg-[#e5ddd5] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj48cGF0aCBkPSJtIDAgMCBoIDQwIHYgNDAgaCAtNDAgeiIgZmlsbD0iI2U1ZGRkNSIvPjxwYXRoIGQ9Ik0gMCAwIEwgNDAgNDAgTSA0MCAwIEwgMCA0MCIgc3Ryb2tlPSIjZGRkZGRkIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')]">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <div className="text-4xl mb-2">💬</div>
                    <p>Нет сообщений</p>
                    <p className="text-sm mt-1">Начните общение!</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwn = message.senderId === user.id
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-1 md:gap-2 mb-1`}
                    >
                      {!isOwn && (
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#075e54] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {(message.sender.name || message.sender.phone).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] md:max-w-md px-3 py-1.5 md:px-4 md:py-2 rounded-lg shadow-sm ${
                          isOwn
                            ? 'bg-[#dcf8c6] text-gray-800 rounded-br-none'
                            : 'bg-white text-gray-800 rounded-bl-none'
                        }`}
                      >
                        <div className="break-words text-sm md:text-base leading-relaxed">{message.text}</div>
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
            <form onSubmit={sendMessage} className="bg-[#f0f2f5] p-2 md:p-4 relative">
              <div className="flex gap-2 items-end">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Введите сообщение"
                    className="w-full px-4 py-2 md:py-3 border-0 rounded-full focus:ring-2 focus:ring-[#075e54] focus:outline-none text-gray-900 bg-white text-sm md:text-base"
                    style={{ color: '#111827' }}
                    onFocus={() => setShowEmojiPicker(false)}
                  />
                  <div className="absolute right-2 bottom-2">
                    <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                  </div>
                </div>
                <button
                  type="submit"
                  className="p-2 md:p-3 bg-[#075e54] text-white rounded-full hover:bg-[#064e47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[44px] md:min-w-[50px]"
                  disabled={!newMessage.trim()}
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
          <div className="flex-1 flex items-center justify-center bg-[#e5ddd5]">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-lg font-medium mb-4">Выберите чат для начала общения</p>
              <button
                onClick={() => setShowSidebar(true)}
                className="md:hidden px-6 py-3 bg-[#075e54] text-white rounded-full font-medium hover:bg-[#064e47] transition-colors"
              >
                Открыть список чатов
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Overlay для мобильных */}
      {showSidebar && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setShowSidebar(false)}
        />
      )}
    </div>
  )
}

