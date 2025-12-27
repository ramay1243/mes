import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getUserFromToken } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

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

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не найден' },
        { status: 400 }
      )
    }

    // Проверяем тип файла
    const fileType = file.type
    const isImage = fileType.startsWith('image/')
    const isVideo = fileType.startsWith('video/')

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Поддерживаются только изображения и видео' },
        { status: 400 }
      )
    }

    // Проверяем размер файла (максимум 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Файл слишком большой. Максимальный размер: 50MB' },
        { status: 400 }
      )
    }

    // Генерируем уникальное имя файла
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop() || 'bin'
    const fileName = `uploads/${timestamp}-${randomStr}.${fileExtension}`

    let fileUrl: string

    // Проверяем, есть ли токен для Vercel Blob (продакшен)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Используем Vercel Blob Storage
      const blob = await put(fileName, file, {
        access: 'public',
        contentType: file.type,
      })
      fileUrl = blob.url
    } else {
      // Локальная разработка - сохраняем в public/uploads
      const uploadsDir = join(process.cwd(), 'public', 'uploads')
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
      }

      const localFileName = `${timestamp}-${randomStr}.${fileExtension}`
      const filePath = join(uploadsDir, localFileName)

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      fileUrl = `/uploads/${localFileName}`
    }

    return NextResponse.json({
      url: fileUrl,
      type: isImage ? 'image' : 'video',
      size: file.size,
      name: file.name
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Ошибка при загрузке файла' },
      { status: 500 }
    )
  }
}
