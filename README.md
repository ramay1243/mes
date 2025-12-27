# Мессенджер

Простой мессенджер с авторизацией по номеру телефона.

## Возможности

- ✅ Авторизация по номеру телефона с SMS кодом
- ✅ Общий чат и личные сообщения
- ✅ Современный UI на Next.js и Tailwind CSS
- ✅ База данных SQLite (можно легко переключиться на PostgreSQL)
- ✅ Автоматическое обновление сообщений

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Создайте файл `.env` на основе `.env.example`:
```bash
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-change-this-in-production"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

3. Инициализируйте базу данных:
```bash
npm run db:generate
npm run db:push
```

4. Запустите сервер:
```bash
npm run dev
```

Приложение будет доступно по адресу http://localhost:3000

## Авторизация

В режиме разработки SMS коды выводятся в консоль сервера. Для продакшена настройте отправку SMS через:
- Twilio (раскомментируйте код в `lib/sms.ts`)
- Firebase Auth
- Другой SMS сервис

## Структура проекта

- `app/` - Next.js App Router страницы и API routes
- `components/` - React компоненты
- `lib/` - Утилиты и конфигурация
- `prisma/` - Схема базы данных

## API Endpoints

- `POST /api/auth/send-code` - Отправка кода подтверждения
- `POST /api/auth/verify-code` - Проверка кода и авторизация
- `GET /api/auth/me` - Получение текущего пользователя
- `POST /api/auth/logout` - Выход
- `GET /api/messages` - Получение сообщений
- `POST /api/messages` - Отправка сообщения
- `GET /api/users` - Список пользователей

## Дальнейшее развитие

- Добавить WebSocket (Socket.io) для real-time сообщений
- Добавить уведомления
- Добавить загрузку файлов и изображений
- Добавить голосовые сообщения

