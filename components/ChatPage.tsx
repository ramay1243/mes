'use client'

import { useEffect, useState, useRef } from 'react'
import axios from 'axios'

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
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    try {
      const params = selectedUser ? `?receiverId=${selectedUser.id}` : ''
      const response = await axios.get(`/api/messages${params}`)
      setMessages(response.data.messages)
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
    if (!newMessage.trim()) return

    const messageText = newMessage.trim()
    setNewMessage('')

    try {
      await axios.post('/api/messages', {
        text: messageText,
        receiverId: selectedUser?.id || null
      })
      loadMessages()
    } catch (error) {
      console.error('Error sending message:', error)
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
    <div className="flex h-screen bg-gray-100">
      {/* Боковая панель с пользователями */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Заголовок с профилем */}
        <div className="p-4 border-b border-gray-200">
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
                  className="font-semibold text-gray-800 cursor-pointer hover:text-blue-600"
                  onClick={() => setEditingName(true)}
                  title="Нажмите, чтобы изменить имя"
                >
                  {userName || user.phone}
                </h2>
                <p className="text-sm text-gray-500">{user.phone}</p>
              </div>
            )}
            <button
              onClick={onLogout}
              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
              placeholder="🔍 Поиск пользователей..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900 bg-white"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
        </div>

        {/* Список чатов */}
        <div className="flex-1 overflow-y-auto">
          <div
            className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 ${
              !selectedUser ? 'bg-blue-50 border-l-4 border-blue-500' : ''
            }`}
            onClick={() => setSelectedUser(null)}
          >
            <div className="font-medium text-gray-800">💬 Общий чат</div>
            <div className="text-sm text-gray-500">Все сообщения</div>
          </div>
          
          {filteredUsers.length > 0 ? (
            filteredUsers.map((u) => (
              <div
                key={u.id}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                  selectedUser?.id === u.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => setSelectedUser(u)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
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
      <div className="flex-1 flex flex-col">
        {/* Заголовок чата */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            {selectedUser && (
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                {(selectedUser.name || selectedUser.phone).charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="font-semibold text-gray-800">
                {selectedUser ? (selectedUser.name || selectedUser.phone) : '💬 Общий чат'}
              </h2>
              {selectedUser && (
                <p className="text-sm text-gray-500">{selectedUser.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Сообщения */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
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
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2`}
                >
                  {!isOwn && (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {(message.sender.name || message.sender.phone).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      isOwn
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                    }`}
                  >
                    {!isOwn && (
                      <div className={`text-xs font-medium mb-1 ${isOwn ? 'text-blue-100' : 'text-gray-600'}`}>
                        {message.sender.name || message.sender.phone}
                      </div>
                    )}
                    <div className="break-words">{message.text}</div>
                    <div className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                      {formatTime(message.createdAt)}
                    </div>
                  </div>
                  {isOwn && (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
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
        <form onSubmit={sendMessage} className="bg-white border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={selectedUser ? `Сообщение для ${selectedUser.name || selectedUser.phone}...` : "Сообщение в общий чат..."}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 bg-white"
              style={{ color: '#111827' }}
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
              disabled={!newMessage.trim()}
            >
              {newMessage.trim() ? '📤 Отправить' : 'Отправить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

