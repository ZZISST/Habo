# 🚀 Быстрый запуск HABO

## Предварительные требования

1. **Docker & Docker Compose** установлены
2. **Git** для клонирования репозитория
3. Минимум **8GB RAM** для комфортной работы с AI

## Шаг 1: Подготовка проекта

```bash
# Клонируйте репозиторий
git clone <your-repo-url>
cd habo

# Скопируйте файл конфигурации
cp .env.example .env

# [Опционально] Отредактируйте .env для своих нужд
nano .env
```

## Шаг 2: Запуск сервисов

```bash
# Запустите все сервисы
docker-compose up -d

# Проверьте что все сервисы запустились
docker-compose ps
```

Вы должны увидеть:
- ✅ `habo_app` - основное приложение
- ✅ `habo_db` - PostgreSQL база данных
- ✅ `habo_redis` - Redis для кэширования
- ✅ `habo_ollama` - Ollama для AI анализа

## Шаг 3: Настройка AI модели

```bash
# Подключитесь к контейнеру Ollama
docker exec -it habo_ollama ollama pull llama3.2

# Проверьте что модель загрузилась
docker exec -it habo_ollama ollama list
```

## Шаг 4: Инициализация данных

```bash
# Подождите пока база данных инициализируется (~30 секунд)
# Затем проверьте логи приложения
docker-compose logs habo_app

# Должны увидеть:
# ✅ Database initialized successfully
# ✅ Default categories initialized  
# ✅ Redis initialized successfully
# ✅ Ollama initialized successfully
```

## Шаг 5: Первый вход

Откройте браузер на http://localhost:8000/docs

### Создание администратора

По умолчанию создается администратор:
- **Логин**: `admin`
- **Пароль**: `admin123`
- **Email**: `admin@habo.com`

⚠️ **Обязательно смените пароль в продакшене!**

### Создание обычного пользователя

1. В Swagger UI перейдите к `/auth/register`
2. Создайте пользователя с вашими данными
3. Используйте `/auth/login` для получения токена

## Шаг 6: Быстрая настройка

### 1. Инициализируйте стандартные категории

```bash
POST /finance/budget/categories/init-defaults
Authorization: Bearer YOUR_TOKEN
```

Это создаст категории по системе Кэкэйбо:
- 🍎 **Потребности**: продукты, жилье, транспорт, здоровье
- 🎉 **Желания**: развлечения, одежда, электроника  
- 📚 **Культура**: образование, книги, культурные мероприятия
- ⚡ **Неожиданное**: экстренные расходы, подарки

### 2. Создайте первый бюджет

```bash
POST /finance/budget/budgets
{
  "category_id": 1,
  "amount": 30000.00,
  "period_start": "2026-02-01T00:00:00Z",
  "period_end": "2026-02-29T23:59:59Z"
}
```

### 3. Пройдите финансовый опрос

```bash
POST /finance/analysis/assessment
{
  "answers": [
    {
      "question_id": "income_source",
      "question_text": "Каков ваш основной источник дохода?",
      "answer": "salary",
      "weight": 1.0
    }
    // ... другие ответы
  ]
}
```

### 4. Добавьте первую транзакцию

```bash
POST /finance/transactions/
{
  "category_id": 1,
  "amount": 1500.00,
  "transaction_type": "expense",
  "notebook_type": "small",
  "description": "Продукты в супермаркете",
  "transaction_date": "2026-02-23T14:30:00Z",
  "is_planned": false
}
```

### 5. Создайте финансовую цель

```bash
POST /finance/analysis/goals
{
  "title": "Подушка безопасности",
  "description": "3 месяца расходов",
  "target_amount": 300000.00,
  "target_date": "2026-12-31T00:00:00Z",
  "priority": 5
}
```

## Шаг 7: Получите первый анализ

### Запросите AI анализ

```bash
POST /finance/analysis/ai-analysis
{
  "period_start": "2026-02-01T00:00:00Z",
  "period_end": "2026-02-23T23:59:59Z",
  "include_predictions": true,
  "include_recommendations": true,
  "analysis_depth": "standard"
}
```

### Посмотрите дашборд

```bash
GET /finance/dashboard/summary?period_days=30
```

### Получите обзор Кэкэйбо

```bash
GET /finance/dashboard/kakeibo-overview?period_months=1
```

## Полезные эндпоинты для начала

| Эндпоинт | Описание |
|----------|----------|
| `GET /finance/dashboard/quick-stats` | Быстрая статистика |
| `GET /finance/transactions/kakeibo/small` | Маленький блокнот |
| `GET /finance/transactions/kakeibo/big` | Большой блокнот |
| `GET /finance/analysis/goals` | Ваши цели |
| `GET /finance/budget/categories` | Все категории |
| `GET /finance/dashboard/recommendations` | AI рекомендации |

## Устранение проблем

### Ollama не работает

```bash
# Перезапустите Ollama
docker-compose restart habo_ollama

# Проверьте логи
docker-compose logs habo_ollama

# Загрузите модель заново
docker exec -it habo_ollama ollama pull llama3.2
```

### База данных не инициализируется

```bash
# Проверьте статус
docker-compose ps habo_db

# Посмотрите логи
docker-compose logs habo_db

# Пересоздайте базу
docker-compose down -v
docker-compose up -d
```

### Проблемы с памятью

```bash
# Уменьшите количество worker'ов
echo "WORKER_PROCESSES=2" >> .env

# Или используйте более легкую модель
echo "OLLAMA_MODEL=llama3.1:8b" >> .env

docker-compose restart
```

## Следующие шаги

1. 📊 **Изучите дашборд** - понимайте свои финансы
2. 📔 **Ведите блокноты** - записывайте ежедневные траты
3. 🎯 **Ставьте цели** - планируйте будущее
4. 🤖 **Используйте AI** - получайте персональные рекомендации
5. 📈 **Анализируйте тренды** - улучшайте финансовые привычки

## API Документация

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## Поддержка

Если что-то не работает:
1. Проверьте логи: `docker-compose logs`
2. Перезапустите сервисы: `docker-compose restart`
3. Создавайте issue в GitHub

Удачного управления финансами с HABO! 💰🇯🇵