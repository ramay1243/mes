// Простая заглушка для отправки SMS
// В продакшене можно использовать Twilio, Firebase, или другой сервис

export async function sendVerificationCode(phone: string, code: string) {
  // В режиме разработки просто логируем код
  console.log(`📱 SMS код для ${phone}: ${code}`)
  
  // Для продакшена можно использовать Twilio:
  /*
  const twilio = require('twilio')
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  )
  
  await client.messages.create({
    body: `Ваш код подтверждения: ${code}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone
  })
  */
  
  return true
}

