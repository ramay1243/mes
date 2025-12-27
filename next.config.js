/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Отключаем кэширование для обновлений
  generateEtags: false,
  // Принудительное обновление на мобильных
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig

