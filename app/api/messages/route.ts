import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { z } from 'zod'

const messageSchema = z.object({
  text: z.string().min(1, 'Сообщение не может быть пустым'),
  receiverId: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    const user = await getUserFromToken(token || null)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }
    
    const receiverId = request.nextUrl.searchParams.get('receiverId')
    
    if (!receiverId) {
      return NextResponse.json({ messages: [] })
    }
    
    // Получаем сообщения между текущим пользователем и выбранным получателем
    // Сообщение должно быть: либо я отправил получателю, либо получатель отправил мне
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          // Я отправил сообщение получателю
          { senderId: user.id, receiverId: receiverId },
          // Получатель отправил сообщение мне
          { senderId: receiverId, receiverId: user.id }
        ]
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
      },
      orderBy: { createdAt: 'asc' },
      take: 100
    })
    
    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении сообщений' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    const user = await getUserFromToken(token || null)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { text, receiverId } = messageSchema.parse(body)
    
    // Проверяем, что receiverId указан
    if (!receiverId) {
      return NextResponse.json(
        { error: 'Не указан получатель сообщения' },
        { status: 400 }
      )
    }
    
    // Проверяем, что получатель существует
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    })
    
    if (!receiver) {
      return NextResponse.json(
        { error: 'Получатель не найден' },
        { status: 404 }
      )
    }
    
    // КРИТИЧЕСКАЯ ПРОВЕРКА: убеждаемся что не отправляем самому себе
    if (receiverId === user.id) {
      return NextResponse.json(
        { error: 'Нельзя отправить сообщение самому себе' },
        { status: 400 }
      )
    }
    
    console.log('📤 Creating message:', {
      senderId: user.id,
      senderPhone: user.phone,
      receiverId: receiverId,
      receiverPhone: receiver.phone,
      text: text.substring(0, 50)
    })
    
    const message = await prisma.message.create({
      data: {
        text,
        senderId: user.id,
        receiverId: receiverId
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
    
    // ФИНАЛЬНАЯ ПРОВЕРКА: убеждаемся что сообщение создано правильно
    if (message.receiverId !== receiverId) {
      console.error('❌ CRITICAL: Message created with wrong receiverId!', {
        expected: receiverId,
        actual: message.receiverId,
        messageId: message.id
      })
      return NextResponse.json(
        { error: 'Ошибка: сообщение создано с неверным получателем' },
        { status: 500 }
      )
    }
    
    console.log('✅ Message created successfully:', {
      messageId: message.id,
      to: message.receiver?.phone,
      receiverId: message.receiverId
    })
    
    return NextResponse.json({ message })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    console.error('Error creating message:', error)
    return NextResponse.json(
      { error: 'Ошибка при отправке сообщения' },
      { status: 500 }
    )
  }
}

