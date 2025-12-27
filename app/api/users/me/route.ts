import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { z } from 'zod'

const updateNameSchema = z.object({
  name: z.string().min(1).max(50).optional()
})

export async function PATCH(request: NextRequest) {
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
    const { name } = updateNameSchema.parse(body)
    
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { name: name || null },
      select: {
        id: true,
        phone: true,
        name: true,
        avatar: true
      }
    })
    
    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Ошибка при обновлении данных' },
      { status: 500 }
    )
  }
}

