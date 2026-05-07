# Инструкции по переносу приложения в Android Studio

Это веб-приложение на React можно превратить в мобильное приложение для Android с помощью **Capacitor**. Ниже приведен пошаговый план.

## 1. Подготовка окружения
У вас должны быть установлены:
- **Node.js** (версия 18+)
- **Android Studio**
- **Java JDK 17**

## 2. Установка Capacitor
В корне вашего проекта выполните команды:

```bash
# Установка необходимых пакетов
npm install @capacitor/core @capacitor/cli @capacitor/android

# Инициализация Capacitor
npx cap init "Vera Plus" "com.vera.plus" --web-dir dist
```

## 3. Сборка проекта
Вам нужно собрать веб-версию приложения:

```bash
npm run build
```

## 4. Добавление Android платформы
Выполните команду для создания папки `android`:

```bash
npx cap add android
```

## 5. Открытие в Android Studio
Теперь вы можете открыть проект в Android Studio для дальнейшей настройки и сборки APK:

```bash
npx cap open android
```

## 6. Синхронизация изменений
Каждый раз, когда вы меняете код на React, вам нужно:
1. Собрать веб-версию: `npm run build`
2. Синхронизировать с Android: `npx cap sync android`

## Важные замечания для Gemini и Firebase
1. **API Ключи:** Убедитесь, что ваши ключи Gemini и Firebase прописаны в `Gemini API key` и `VITE_FIREBASE_API_KEY` в коде или переменных окружения.
2. **CORS:** В Android приложении запросы идут с `http://localhost`, поэтому ваш сервер должен разрешать такие запросы.
3. **Безопасность:** Не забудьте настроить ограничения по IP/домену для ваших ключей в Google Cloud Console перед публикацией.

## Как получить APK?
1. В Android Studio выберите **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
2. После завершения студия покажет уведомление со ссылкой "locate", где лежит готовый файл `.apk`.
