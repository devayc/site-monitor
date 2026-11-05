# Site Monitor (Node.js)

Сервис для мониторинга доступности сайтов в реальном времени.

## Возможности

- Мониторинг HTTP-статусов сайтов в реальном времени
- Адаптивный веб-интерфейс (Bootstrap 5)
- Добавление / удаление сайтов
- Активация / деактивация мониторинга
- Настраиваемый ожидаемый статус и интервал проверки
- Уведомления на email при изменении статуса
- Поддержка запуска на VPS и локально
- Готовая структура для расширения (Bitrix24 и др.)

## Быстрый старт

### 1. Установка

```bash
cd site-monitor-node
npm install
```

### 2. Конфигурация

```bash
cp .env.example .env
# Отредактируйте .env — особенно SMTP для уведомлений
```

### 3. Запуск

```bash
npm start
# или для разработки с автоперезагрузкой:
npm run dev
```

Откройте в браузере: http://localhost:3000

## Запуск на VPS

1. Установите Node.js 18+
2. Скопируйте проект
3. `npm install --production`
4. Настройте `.env`
5. Используйте PM2 или systemd

### Пример с PM2

```bash
npm install -g pm2
pm2 start src/index.js --name site-monitor
pm2 save
pm2 startup
```

### Пример systemd

```ini
[Unit]
Description=Site Monitor
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/site-monitor-node
ExecStart=/usr/bin/node src/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## Настройка уведомлений

В `.env` укажите SMTP:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=app-password
SMTP_FROM=your@gmail.com
```

Для Gmail используйте App Password.

## Структура

```
site-monitor-node/
├── src/
│   ├── index.js          # Express сервер
│   ├── db.js             # SQLite
│   ├── monitor.js        # Проверка сайтов
│   └── notifications.js  # Email
├── public/               # HTML, CSS, JS
├── package.json
├── .env.example
└── README.md
```

## Расширение

- Bitrix24: добавить webhook в `notifications.js`
- Telegram / другие каналы — аналогично
- История проверок — добавить таблицу
- Аутентификация — добавить middleware
