import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { verifyToken } from './auth'
import { prisma } from './prisma'

let io: SocketIOServer | null = null

export function initializeSocket(server: HTTPServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  })

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.cookie?.split('auth-token=')[1]?.split(';')[0]
    
    if (!token) {
      return next(new Error('Authentication error'))
    }
    
    const payload = verifyToken(token)
    if (!payload) {
      return next(new Error('Invalid token'))
    }
    
    socket.data.userId = payload.userId
    next()
  })

  io.on('connection', async (socket) => {
    const userId = socket.data.userId
    
    // Присоединяем пользователя к комнате
    socket.join(`user:${userId}`)
    
    console.log(`User ${userId} connected`)
    
    // Отправка сообщения
    socket.on('send-message', async (data: { text: string; receiverId?: string }) => {
      try {
        const message = await prisma.message.create({
          data: {
            text: data.text,
            senderId: userId,
            receiverId: data.receiverId || null
          },
          include: {
            sender: {
              select: {
                id: true,
                phone: true,
                name: true,
                avatar: true
              }
            },
            receiver: {
              select: {
                id: true,
                phone: true,
                name: true,
                avatar: true
              }
            }
          }
        })
        
        // Отправляем сообщение отправителю
        socket.emit('new-message', message)
        
        // Отправляем сообщение получателю, если указан
        if (data.receiverId) {
          io?.to(`user:${data.receiverId}`).emit('new-message', message)
        } else {
          // Если получатель не указан, отправляем всем (общий чат)
          io?.emit('new-message', message)
        }
      } catch (error) {
        console.error('Error sending message:', error)
        socket.emit('error', { message: 'Ошибка при отправке сообщения' })
      }
    })
    
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`)
    })
  })

  return io
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized')
  }
  return io
}

