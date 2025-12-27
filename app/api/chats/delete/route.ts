import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    const user = await getUserFromToken(token || null)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const otherUserId = searchParams.get('userId')
    
    if (!otherUserId) {
      return NextResponse.json(
        { error: 'Не указан ID пользователя' },
        { status: 400 }
      )
    }
    
    // Проверяем, что не пытаемся удалить самого себя
    if (otherUserId === user.id) {
      return NextResponse.json(
        { error: 'Нельзя удалить чат с самим собой' },
        { status: 400 }
      )
    }
    
    // Удаляем все сообщения между текущим пользователем и выбранным
    const deletedMessages = await prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: user.id }
        ]
      }
    })
    
    console.log(`🗑️ Deleted chat with user ${otherUserId}: ${deletedMessages.count} messages`)
    
    return NextResponse.json({ 
      success: true,
      deletedCount: deletedMessages.count
    })
  } catch (error) {
    console.error('Error deleting chat:', error)
    return NextResponse.json(
      { error: 'Ошибка при удалении чата' },
      { status: 500 }
    )
  }
}

