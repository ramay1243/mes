import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

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
    
    const search = request.nextUrl.searchParams.get('search')
    
    // Если есть поиск - показываем всех пользователей по поиску
    if (search) {
      const users = await prisma.user.findMany({
        where: {
          id: { not: user.id },
          OR: [
            { phone: { contains: search } },
            { name: { contains: search } }
          ]
        },
        select: {
          id: true,
          phone: true,
          name: true,
          avatar: true
        },
        take: 50
      })
      
      return NextResponse.json({ users })
    }
    
    // Если нет поиска - показываем только пользователей с перепиской
    // Получаем всех пользователей, с которыми есть сообщения
    const allMessages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: user.id },
          { receiverId: user.id }
        ]
      },
      select: {
        senderId: true,
        receiverId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // Собираем уникальные ID пользователей, с которыми есть переписка
    const chatUserIds = new Set<string>()
    const lastMessageTime: Record<string, Date> = {}
    
    allMessages.forEach(msg => {
      const otherUserId = msg.senderId === user.id ? msg.receiverId : msg.senderId
      if (otherUserId && otherUserId !== user.id) {
        chatUserIds.add(otherUserId)
        // Сохраняем время последнего сообщения для сортировки
        if (!lastMessageTime[otherUserId] || msg.createdAt > lastMessageTime[otherUserId]) {
          lastMessageTime[otherUserId] = msg.createdAt
        }
      }
    })
    
    if (chatUserIds.size === 0) {
      return NextResponse.json({ users: [] })
    }
    
    // Получаем пользователей с перепиской
    const usersWithMessages = await prisma.user.findMany({
      where: {
        id: { in: Array.from(chatUserIds) }
      },
      select: {
        id: true,
        phone: true,
        name: true,
        avatar: true
      }
    })
    
    // Сортируем по времени последнего сообщения
    usersWithMessages.sort((a, b) => {
      const timeA = lastMessageTime[a.id]?.getTime() || 0
      const timeB = lastMessageTime[b.id]?.getTime() || 0
      return timeB - timeA
    })
    
    return NextResponse.json({ users: usersWithMessages })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении списка пользователей' },
      { status: 500 }
    )
  }
}

