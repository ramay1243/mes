import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendVerificationCode } from '@/lib/sms'
import { generateVerificationCode, normalizePhone } from '@/lib/utils'
import { z } from 'zod'

const phoneSchema = z.object({
  phone: z.string().min(10, 'Номер телефона слишком короткий')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone } = phoneSchema.parse(body)
    
    const normalizedPhone = normalizePhone(phone)
    
    if (normalizedPhone.length < 10) {
      return NextResponse.json(
        { error: 'Неверный формат номера телефона' },
        { status: 400 }
      )
    }
    
    // Генерируем код
    const code = generateVerificationCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 минут
    
    // Удаляем старые коды для этого номера
    await prisma.verificationCode.deleteMany({
      where: {
        phone: normalizedPhone,
        OR: [
          { used: true },
          { expiresAt: { lt: new Date() } }
        ]
      }
    })
    
    // Сохраняем новый код
    await prisma.verificationCode.create({
      data: {
        phone: normalizedPhone,
        code,
        expiresAt
      }
    })
    
    // Отправляем SMS (в разработке просто логируем)
    await sendVerificationCode(normalizedPhone, code)
    
    return NextResponse.json({ 
      success: true,
      message: 'Код отправлен на ваш номер телефона'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    console.error('Error sending verification code:', error)
    return NextResponse.json(
      { error: 'Ошибка при отправке кода' },
      { status: 500 }
    )
  }
}

