# Подробная инструкция по локальной сборке и Android

## 1. Подготовка папки проекта
Если вы скачали архив, распакуйте его. Откройте терминал (PowerShell или CMD) в этой папке.

## 2. Исправление package.json
Убедитесь, что блок scripts выглядит так:
```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "start": "tsx api/index.ts",
  "lint": "tsc --noEmit"
}
```

## 3. Команды для Android (Capacitor)
Выполняйте строго по очереди:

1. `npm install` — установка всех библиотек.
2. `npm install @capacitor/core @capacitor/cli @capacitor/android` — установка порта для мобилок.
3. `npm run build` — создание папки `dist` с готовым сайтом.
4. `npx cap init "Vera Plus" "com.vera.plus" --web-dir dist` — инициализация конфига.
5. `npx cap add android` — создание папки `android` для Android Studio.
6. `npx cap open android` — запуск Android Studio.

## 4. Проблема с API Ключом
Поскольку Gemini требует серверного ключа для безопасности, ваше мобильное приложение должно отправлять запросы на ваш сервер (Cloud Run или другой хостинг).

Если вы хотите, чтобы приложение работало **БЕЗ сервера** (напрямую с ключом), вам нужно:
1. В `src/services/gemini.ts` или месте вызова AI заменить URL `/api/chat` на прямой вызов SDK (но это небезопасно, ключ могут украсть из APK).
2. Настроить `VITE_GEMINI_API_KEY` в файле `.env` в корне проекта.

## 5. Firebase
Для работы Firebase в Android:
1. Зайдите в консоль Firebase.
2. Добавьте "Android App".
3. Скачайте файл `google-services.json`.
4. Положите его в папку `android/app/`.
