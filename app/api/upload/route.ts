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
      try {
        // Используем Vercel Blob Storage
        const blob = await put(fileName, file, {
          access: 'public',
          contentType: file.type,
        })
        fileUrl = blob.url
        console.log('✅ File uploaded to Vercel Blob:', fileUrl)
      } catch (blobError: any) {
        console.error('❌ Vercel Blob upload error:', blobError)
        throw new Error(`Ошибка загрузки в Vercel Blob: ${blobError?.message || 'Неизвестная ошибка'}`)
      }
    } else {
      // Локальная разработка - сохраняем в public/uploads
      try {
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
        console.log('✅ File saved locally:', fileUrl)
      } catch (localError: any) {
        console.error('❌ Local file save error:', localError)
        throw new Error(`Ошибка сохранения файла: ${localError?.message || 'Неизвестная ошибка'}`)
      }
    }

    if (!fileUrl) {
      throw new Error('Не удалось получить URL загруженного файла')
    }

    console.log('📤 Upload successful:', {
      url: fileUrl,
      type: isImage ? 'image' : 'video',
      size: file.size,
      name: file.name
    })

    return NextResponse.json({
      url: fileUrl,
      type: isImage ? 'image' : 'video',
      size: file.size,
      name: file.name
    })
  } catch (error: any) {
    console.error('Error uploading file:', {
      error,
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    })
    
    let errorMessage = 'Ошибка при загрузке файла'
    
    if (error?.message?.includes('BLOB_READ_WRITE_TOKEN')) {
      errorMessage = 'Ошибка конфигурации хранилища. Проверьте настройки Vercel Blob.'
    } else if (error?.message?.includes('ENOENT')) {
      errorMessage = 'Ошибка создания директории для файлов'
    } else if (error?.message?.includes('EACCES')) {
      errorMessage = 'Нет доступа для записи файла'
    } else if (error?.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
