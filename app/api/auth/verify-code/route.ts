import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'
import { normalizePhone } from '@/lib/utils'
import { z } from 'zod'

const verifySchema = z.object({
  phone: z.string().min(10),
  code: z.string().length(6, 'Код должен состоять из 6 цифр')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, code } = verifySchema.parse(body)
    
    const normalizedPhone = normalizePhone(phone)
    
    // Ищем код
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        phone: normalizedPhone,
        code,
        used: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!verificationCode) {
      return NextResponse.json(
        { error: 'Неверный или истекший код' },
        { status: 400 }
      )
    }
    
    // Помечаем код как использованный
    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { used: true }
    })
    
    // Находим или создаем пользователя
    let user = await prisma.user.findUnique({
      where: { phone: normalizedPhone }
    })
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: normalizedPhone,
          name: `Пользователь ${normalizedPhone.slice(-4)}`
        }
      })
    }
    
    // Генерируем JWT токен
    const token = generateToken({
      userId: user.id,
      phone: user.phone
    })
    
    // Устанавливаем токен в cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name
      }
    })
    
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 дней
    })
    
    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    console.error('Error verifying code:', error)
    return NextResponse.json(
      { error: 'Ошибка при проверке кода' },
      { status: 500 }
    )
  }
}

