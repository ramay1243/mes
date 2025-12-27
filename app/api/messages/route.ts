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
    
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: user.id },
          { receiverId: user.id }
        ],
        ...(receiverId ? {
          OR: [
            { senderId: user.id, receiverId },
            { senderId: receiverId, receiverId: user.id }
          ]
        } : {})
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
    
    const message = await prisma.message.create({
      data: {
        text,
        senderId: user.id,
        receiverId: receiverId || null
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

