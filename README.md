

## 🌟 Особенности

### Основные функции
- 📊 **Управление бюджетом** - создание и отслеживание бюджетов по категориям
- 📔 **Блокноты Кэкэйбо** - ведение маленького (ежедневные траты) и большого (долгосрочные планы) блокнотов
- 🎯 **Финансовые цели** - постановка и отслеживание прогресса
- 🤖 **AI анализ** - персонализированные рекомендации через Ollama
- 📈 **Аналитика** - детальная статистика и инсайты
- 🔒 **Конфиденциальность** - настраиваемые согласия на обработку данных

### Категории по методу Кэкэйбо
1. **必要 (Hitsuyō) - Потребности**: еда, жилье, транспорт, здоровье
2. **欲望 (Yokubō) - Желания**: развлечения, одежда, электроника
3. **文化 (Bunka) - Культура**: образование, книги, культурные мероприятия
4. **予想外 (Yosōgai) - Неожиданное**: экстренные расходы, подарки

## 🚀 Быстрый старт

### Требования
- Python 3.11+
- PostgreSQL 13+
- Redis 6+
- Docker & Docker Compose (для простого запуска)
- Ollama (для AI функций)

### Запуск через Docker

1. **Клонируйте репозиторий**

2. **Создайте файл .env**
```bash
cp .env.example .env
```

Настройте переменные в `.env`:
```env
# Database


# Security
SECRET_KEY=your-very-long-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

3. **Запустите сервисы**
```bash
docker-compose up -d
```

4. **Установите модель Ollama**

ollama pull llama3.2
```

5. **Проверьте работу**
- API документация: http://localhost:8000/docs
- Redoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/health

### Ручная установка

1. **Создайте виртуальное окружение**
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows
```

2. **Установите зависимости**
```bash
pip install -r requirements.txt
```

3. **Настройте базу данных**

alembic upgrade head
```

4. **Запустите Redis**
```bash
# Linux/Mac с homebrew
brew services start redis

# Docker
docker run -d -p 6379:6379 redis:7-alpine
```

5. **Запустите Ollama**
```bash
# Установите Ollama: https://ollama.ai/
ollama pull llama3.2
ollama serve
```

6. **Запустите приложение**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 📚 API Документация

### Основные эндпоинты

#### Аутентификация
- `POST /auth/register` - Регистрация пользователя
- `POST /auth/login` - Вход в систему
- `GET /auth/me` - Профиль пользователя

#### Бюджет и категории
- `GET /finance/budget/categories` - Список категорий
- `POST /finance/budget/categories/init-defaults` - Создать стандартные категории
- `GET /finance/budget/budgets` - Бюджеты пользователя
- `POST /finance/budget/budgets` - Создать бюджет

#### Транзакции (Блокноты Кэкэйбо)
- `GET /finance/transactions/` - Список транзакций с фильтрацией
- `POST /finance/transactions/` - Создать транзакцию
- `GET /finance/transactions/kakeibo/{notebook_type}` - Данные блокнота
- `GET /finance/transactions/stats/summary` - Статистика транзакций

#### Анализ и цели
- `GET /finance/analysis/goals` - Финансовые цели
- `POST /finance/analysis/goals` - Создать цель
- `POST /finance/analysis/ai-analysis` - AI анализ финансов
- `POST /finance/analysis/assessment` - Финансовый опрос

#### Дашборд
- `GET /finance/dashboard/summary` - Общая сводка
- `GET /finance/dashboard/quick-stats` - Быстрая статистика
- `GET /finance/dashboard/kakeibo-overview` - Обзор Кэкэйбо
- `GET /finance/dashboard/recommendations` - Персональные рекомендации

### Схемы данных

Все схемы данных описаны в Pydantic моделях в `/app/api/schemas/finance.py`.

## 🏗️ Архитектура

```
app/
├── main.py                 # Главное приложение FastAPI
├── api/
│   ├── routers/           # API роуты
│   │   ├── auth.py        # Аутентификация
│   │   ├── budget.py      # Бюджет и категории
│   │   ├── transactions.py # Транзакции
│   │   ├── analysis.py    # Анализ и цели
│   │   └── dashboard.py   # Дашборд
│   └── schemas/           # Pydantic схемы
├── core/
│   ├── db/               # Модели и CRUD
│   │   ├── models/       # SQLAlchemy модели
│   │   └── crud/         # CRUD операции
│   ├── services/         # Бизнес-логика
│   ├── settings/         # Конфигурация
│   └── cache.py          # Redis кэширование
└── sdk/
    └── nlp/              # Интеграция с Ollama
```

## 🔧 Настройка

### Переменные окружения


DEBUG=false

# База данных


# Безопасность
SECRET_KEY=your-super-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Redis для кэширования
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=""

# Ollama для AI
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_TIMEOUT=60
```

### Кэширование

Система использует Redis для кэширования:
- Финансовых сводок пользователей (TTL: 10 минут)
- Результатов AI анализа (TTL: 1-2 часа)  
- Статистики транзакций (TTL: 30 минут)
- Данных блокнотов Кэкэйбо (TTL: 15 минут)

### AI Анализ

Поддерживаются различные модели Ollama:
- `llama3.2` (рекомендуется)
- `llama3.1`
- `mistral`
- `codellama`

Для качественного анализа рекомендуется минимум 8GB RAM.

## 📱 Использование

### Начало работы

1. **Регистрируйтесь** в системе
2. **Пройдите финансовый опрос** для персонализации
3. **Настройте категории** и создайте бюджеты
4. **Начните вести блокноты** - записывайте ежедневные траты в маленький блокнот, планируйте в большом

- Ежедневные планы трат
- Фактические расходы дня
- Быстрые заметки

**Большой блокнот (大きな手帳)**:
- Долгосрочные финансовые цели
- Анализ месячных трендов 
- Стратегическое планирование

### AI Помощник

AI анализирует ваши финансы и дает рекомендации по:
- Оптимизации бюджета
- Достижению целей
- Выявлению трендов трат
- Улучшению финансовых привычек

## 🛠️ Разработка

### Настройка окружения разработчика

```bash
# Установка pre-commit hooks
pip install pre-commit
pre-commit install

# Запуск тестов
pytest

# Форматирование кода
black app/
isort app/

# Проверка типов
mypy app/
```

### Миграции базы данных

```bash
# Создать новую миграцию
alembic revision --autogenerate -m "Description"

# Применить миграции
alembic upgrade head

# Откатить миграцию
alembic downgrade -1
```

### Добавление новых функций

1. Создайте модели в `/app/core/db/models/`
2. Добавьте CRUD операции в `/app/core/db/crud/`
3. Создайте Pydantic схемы в `/app/api/schemas/`
4. Реализуйте API роуты в `/app/api/routers/`
5. Добавьте бизнес-логику в `/app/core/services/`

## 🔒 Безопасность

- **JWT токены** для аутентификации
- **Bcrypt хэширование** паролей
- **Валидация данных** через Pydantic
- **Согласие на обработку данных** с отзывом
- **Шифрование чувствительной информации**

## 📊 Мониторинг

### Health checks
- `GET /health` - Статус API
- `GET /health/db` - Состояние базы данных
- `GET /health/redis` - Состояние Redis
- `GET /health/ollama` - Состояние Ollama

### Логирование

Логи записываются в структурированном формате и включают:
- HTTP запросы/ответы
- Ошибки базы данных
- AI операции
- Превышения бюджетов

## 🚀 Деплой в продакшен

### Docker в продакшене


docker-compose -f docker-compose.prod.yml up -d
```

### Переменные окружения для продакшена

```env
ENVIRONMENT=production

```

### Рекомендации по безопасности
- Используйте HTTPS
- Настройте файрволл
- Регулярно обновляйте зависимости
- Мониторьте логи безопасности
- Делайте бэкапы базы данных

## 📄 Лицензия

MIT License - подробности в файле `LICENSE`.

## 🤝 Вклад в проект

1. Fork проекта
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request



## 🙏 Благодарности

- Японскому методу Кэкэйбо за вдохновение
- Сообществу FastAPI
- Команде Ollama за AI возможности
- Всем контрибьюторам проекта