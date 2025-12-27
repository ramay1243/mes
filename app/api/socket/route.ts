// Этот файл нужен для интеграции Socket.io с Next.js
// В продакшене лучше использовать отдельный сервер для Socket.io

export async function GET() {
  return new Response('Socket.io server', { status: 200 })
}

