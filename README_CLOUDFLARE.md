# Инструкция по переносу на Cloudflare (для работы в РФ без VPN)

Чтобы ваш сайт открывался быстро и без VPN, мы перевели авторизацию на сторону сервера. Теперь вам нужно настроить «лицо» сайта через Cloudflare.

## Шаг 1: Экспорт проекта
1. В верхней панели AI Studio нажмите на иконку **Settings** (шестеренка) или три точки.
2. Выберите **Export to GitHub**. 
3. Подключите свой аккаунт GitHub и создайте новый репозиторий (например, `vera-plus-app`).

## Шаг 2: Настройка на Cloudflare Pages
1. Зайдите в панель [Cloudflare](https://dash.cloudflare.com/).
2. Перейдите в **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
3. Выберите ваш репозиторий из GitHub.
4. **Настройки сборки (Build settings):**
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
5. В разделе **Environment variables** добавьте следующие переменные (возьмите их из настроек AI Studio Secrets):
   - `GEMINI_API_KEY`: ваш ключ
   - `FIREBASE_SERVICE_ACCOUNT`: содержимое вашего сервис-аккаунта (JSON)
   - `YOOKASSA_SHOP_ID` и `YOOKASSA_SECRET_KEY` (если используете платежи)

## Шаг 3: Привязка домена (Proxy)
1. После деплоя на Cloudflare Pages, перейдите во вкладку **Custom Domains**.
2. Нажмите **Set up a custom domain** и введите свой домен (например, `faith-trener.ru`).
3. Cloudflare сам настроит DNS. Убедитесь, что стоит статус **Proxied** (оранжевое облако).

---

### Почему это важно для России?
* **Маскировка:** Запросы больше не идут напрямую к `googleapis.com`, а идут к вашему домену на Cloudflare.
* **Безопасность:** Ваши ключи Firebase Admin теперь спрятаны на сервере.
* **Скорость:** Контент раздается через ближайшие к пользователю сервера Cloudflare.

**Теперь вы можете зайти под администратором, создав аккаунт с кодом `MASTER_ADMIN` или именем `superadmin`.**
