"""
Примерные вопросы для финансового опроса
"""

FINANCIAL_ASSESSMENT_QUESTIONS = [
    {
        "id": "income_source",
        "question": "Каков ваш основной источник дохода?",
        "type": "single_choice",
        "options": [
            {"value": "salary", "text": "Постоянная зарплата", "weight": 1.0},
            {"value": "freelance", "text": "Фриланс/проектная работа", "weight": 0.8},
            {"value": "business", "text": "Собственный бизнес", "weight": 0.6},
            {"value": "investments", "text": "Инвестиции и дивиденды", "weight": 0.4},
            {"value": "mixed", "text": "Несколько источников", "weight": 0.7}
        ],
        "category": "income_stability"
    },
    {
        "id": "monthly_income",
        "question": "Какой у вас примерный ежемесячный доход после налогов?",
        "type": "single_choice",
        "options": [
            {"value": "under_50k", "text": "До 50 000 руб.", "weight": 0.3},
            {"value": "50k_100k", "text": "50 000 - 100 000 руб.", "weight": 0.5},
            {"value": "100k_200k", "text": "100 000 - 200 000 руб.", "weight": 0.7},
            {"value": "200k_500k", "text": "200 000 - 500 000 руб.", "weight": 0.9},
            {"value": "over_500k", "text": "Свыше 500 000 руб.", "weight": 1.0}
        ],
        "category": "financial_capacity"
    },
    {
        "id": "spending_tracking",
        "question": "Как часто вы отслеживаете свои расходы?",
        "type": "single_choice",
        "options": [
            {"value": "daily", "text": "Каждый день записываю траты", "weight": 1.0},
            {"value": "weekly", "text": "Проверяю еженедельно", "weight": 0.8},
            {"value": "monthly", "text": "Анализирую раз в месяц", "weight": 0.6},
            {"value": "rarely", "text": "Редко слежу за тратами", "weight": 0.3},
            {"value": "never", "text": "Не отслеживаю", "weight": 0.1}
        ],
        "category": "financial_discipline"
    },
    {
        "id": "emergency_fund",
        "question": "Есть ли у вас финансовая подушка безопасности?",
        "type": "single_choice",
        "options": [
            {"value": "6months_plus", "text": "Да, на 6+ месяцев расходов", "weight": 1.0},
            {"value": "3to6_months", "text": "На 3-6 месяцев расходов", "weight": 0.8},
            {"value": "1to3_months", "text": "На 1-3 месяца расходов", "weight": 0.6},
            {"value": "minimal", "text": "Есть небольшая сумма", "weight": 0.4},
            {"value": "none", "text": "Нет подушки безопасности", "weight": 0.1}
        ],
        "category": "financial_security"
    },
    {
        "id": "investment_experience",
        "question": "Каков ваш опыт инвестирования?",
        "type": "single_choice",
        "options": [
            {"value": "expert", "text": "Активно инвестирую несколько лет", "weight": 1.0},
            {"value": "intermediate", "text": "Есть базовый опыт", "weight": 0.7},
            {"value": "beginner", "text": "Только начинаю изучать", "weight": 0.4},
            {"value": "bank_only", "text": "Только банковские депозиты", "weight": 0.3},
            {"value": "none", "text": "Не инвестирую", "weight": 0.1}
        ],
        "category": "financial_experience"
    },
    {
        "id": "risk_tolerance",
        "question": "Как вы относитесь к финансовым рискам?",
        "type": "single_choice", 
        "options": [
            {"value": "high_risk", "text": "Готов рисковать ради высокой доходности", "weight": 1.0},
            {"value": "moderate_risk", "text": "Умеренные риски приемлемы", "weight": 0.7},
            {"value": "low_risk", "text": "Предпочитаю минимальные риски", "weight": 0.4},
            {"value": "no_risk", "text": "Избегаю любых рисков", "weight": 0.1}
        ],
        "category": "risk_tolerance"
    },
    {
        "id": "financial_goals",
        "question": "Какие у вас главные финансовые цели? (можно выбрать несколько)",
        "type": "multiple_choice",
        "options": [
            {"value": "emergency_fund", "text": "Создать подушку безопасности", "weight": 0.8},
            {"value": "house_purchase", "text": "Накопить на жилье", "weight": 0.9},
            {"value": "retirement", "text": "Подготовиться к пенсии", "weight": 1.0},
            {"value": "education", "text": "Оплатить образование (себе/детям)", "weight": 0.7},
            {"value": "business", "text": "Открыть свой бизнес", "weight": 0.8},
            {"value": "travel", "text": "Путешествовать", "weight": 0.5},
            {"value": "luxury", "text": "Покупка дорогих вещей", "weight": 0.3}
        ],
        "category": "goals_priority"
    },
    {
        "id": "spending_impulse",
        "question": "Как часто вы совершаете спонтанные покупки?",
        "type": "single_choice",
        "options": [
            {"value": "never", "text": "Никогда - все покупки планирую", "weight": 1.0},
            {"value": "rarely", "text": "Очень редко", "weight": 0.8},
            {"value": "sometimes", "text": "Иногда покупаю что-то спонтанно", "weight": 0.6},
            {"value": "often", "text": "Довольно часто", "weight": 0.3},
            {"value": "always", "text": "Постоянно покупаю импульсивно", "weight": 0.1}
        ],
        "category": "spending_habits"
    },
    {
        "id": "budget_planning",
        "question": "Планируете ли вы свой бюджет заранее?",
        "type": "single_choice",
        "options": [
            {"value": "detailed", "text": "Детально планирую на месяц вперед", "weight": 1.0},
            {"value": "general", "text": "Делаю общий план расходов", "weight": 0.7},
            {"value": "weekly", "text": "Планирую только на неделю", "weight": 0.5},
            {"value": "minimal", "text": "Минимальное планирование", "weight": 0.3},
            {"value": "none", "text": "Не планирую бюджет", "weight": 0.1}
        ],
        "category": "planning_skills"
    },
    {
        "id": "debt_situation",
        "question": "Есть ли у вас долговые обязательства?",
        "type": "single_choice",
        "options": [
            {"value": "no_debt", "text": "Нет долгов", "weight": 1.0},
            {"value": "mortgage_only", "text": "Только ипотека", "weight": 0.8},
            {"value": "manageable", "text": "Есть долги, но контролируемые", "weight": 0.6},
            {"value": "significant", "text": "Значительная долговая нагрузка", "weight": 0.3},
            {"value": "overwhelming", "text": "Долги превышают доходы", "weight": 0.1}
        ],
        "category": "debt_management"
    }
]

def calculate_assessment_score(answers: list) -> dict:
    """
    Вычислить оценку финансового состояния на основе ответов
    """
    categories_scores = {
        "income_stability": 0,
        "financial_capacity": 0,
        "financial_discipline": 0,
        "financial_security": 0,
        "financial_experience": 0,
        "risk_tolerance": 0,
        "goals_priority": 0,
        "spending_habits": 0,
        "planning_skills": 0,
        "debt_management": 0
    }
    
    category_weights = {
        "income_stability": 1.2,
        "financial_security": 1.5,
        "financial_discipline": 1.3,
        "debt_management": 1.4,
        "planning_skills": 1.1,
        "financial_experience": 0.8,
        "risk_tolerance": 0.7,
        "spending_habits": 1.0,
        "goals_priority": 0.9,
        "financial_capacity": 1.0
    }
    
    # Найти соответствующие вопросы и вычислить оценки
    for answer in answers:
        question_id = answer.get("question_id")
        answer_value = answer.get("answer")
        
        # Найти вопрос
        question = next((q for q in FINANCIAL_ASSESSMENT_QUESTIONS if q["id"] == question_id), None)
        if not question:
            continue
            
        category = question["category"]
        
        # Найти вес ответа
        if question["type"] == "single_choice":
            option = next((opt for opt in question["options"] if opt["value"] == answer_value), None)
            if option:
                categories_scores[category] = option["weight"]
        elif question["type"] == "multiple_choice":
            # Для множественного выбора берем среднее
            selected_values = answer_value if isinstance(answer_value, list) else [answer_value]
            weights = []
            for value in selected_values:
                option = next((opt for opt in question["options"] if opt["value"] == value), None)
                if option:
                    weights.append(option["weight"])
            if weights:
                categories_scores[category] = sum(weights) / len(weights)
    
    # Вычислить итоговую оценку
    weighted_score = 0
    total_weight = 0
    
    for category, score in categories_scores.items():
        weight = category_weights.get(category, 1.0)
        weighted_score += score * weight
        total_weight += weight
    
    final_score = (weighted_score / total_weight) * 100 if total_weight > 0 else 0
    
    # Определить уровни по категориям
    def get_level(score):
        if score >= 0.8:
            return "high"
        elif score >= 0.6:
            return "medium"
        else:
            return "low"
    
    return {
        "overall_score": round(final_score, 1),
        "categories": {
            category: {
                "score": score,
                "level": get_level(score)
            } for category, score in categories_scores.items()
        },
        "risk_tolerance": get_level(categories_scores.get("risk_tolerance", 0)),
        "financial_experience": get_level(categories_scores.get("financial_experience", 0)),
        "income_stability": get_level(categories_scores.get("income_stability", 0))
    }