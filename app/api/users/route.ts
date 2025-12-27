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
    
    const users = await prisma.user.findMany({
      where: {
        id: { not: user.id },
        ...(search ? {
          OR: [
            { phone: { contains: search } },
            { name: { contains: search } }
          ]
        } : {})
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
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении списка пользователей' },
      { status: 500 }
    )
  }
}

