# Инструкция по подключению ЮKassa (YooKassa)

Для интеграции реальных платежей в ваше приложение "Вера +1", следуйте этой пошаговой инструкции.

## 1. Регистрация и получение ключей
1. Зарегистрируйтесь на сайте [ЮKassa](https://yookassa.ru/).
2. Пройдите процесс идентификации и подпишите договор.
3. В личном кабинете перейдите в раздел **Настройки** -> **Ключи API**.
4. Скопируйте `shopId` и `secretKey`.

## 2. Настройка Backend (Express)
Так как ваше приложение использует Full-stack архитектуру (Express + Vite), вам нужно добавить серверные роуты для обработки платежей.

### Установка зависимостей
```bash
npm install yookassa
```

### Пример реализации в `server.ts`
```typescript
import { YooCheckout } from 'yookassa';

const checkout = new YooCheckout({
    shopId: process.env.YOOKASSA_SHOP_ID,
    secretKey: process.env.YOOKASSA_SECRET_KEY
});

// Создание платежа
app.post('/api/payments/create', async (req, res) => {
    const { amount, description, metadata, return_url } = req.body;
    
    try {
        const payment = await checkout.createPayment({
            amount: {
                value: amount.toFixed(2),
                currency: 'RUB'
            },
            payment_method_data: {
                type: 'bank_card'
            },
            confirmation: {
                type: 'redirect',
                return_url: return_url
            },
            description: description,
            metadata: metadata, // Здесь можно передать userId и articleId
            capture: true
        });
        
        res.json({ confirmation_url: payment.confirmation.confirmation_url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Обработка Webhook (уведомление об успешной оплате)
app.post('/api/payments/webhook', async (req, res) => {
    const event = req.body;
    
    if (event.event === 'payment.succeeded') {
        const payment = event.object;
        const { userId, articleId, type } = payment.metadata;
        
        // ВАЖНО: Здесь вы должны обновить профиль пользователя в Firestore
        // Например, добавить articleId в массив purchasedArticles
        // Или обновить статус подписки
    }
    
    res.sendStatus(200);
});
```

## 3. Настройка Frontend
В `App.tsx` замените функции-заглушки `buyArticle` и `buySubscription` на вызовы вашего API.

```typescript
const buyArticle = async (articleId: string) => {
    const article = LIBRARY_ARTICLES.find(a => a.id === articleId);
    if (!article) return;

    const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            amount: article.price,
            description: `Покупка статьи: ${article.title}`,
            metadata: { userId: userProfile.uid, articleId, type: 'article' },
            return_url: window.location.href
        })
    });
    
    const { confirmation_url } = await response.json();
    window.location.href = confirmation_url; // Перенаправление на оплату
};
```

## 4. Безопасность
1. Никогда не храните `secretKey` на стороне клиента.
2. Используйте переменные окружения (`.env`) для хранения ключей.
3. Проверяйте подлинность уведомлений от ЮKassa (через IP-адреса или проверку подписи).

## 5. Тестирование
ЮKassa предоставляет тестовые ключи и номера карт для проверки интеграции без реальных списаний. Используйте их перед переходом в боевой режим.
