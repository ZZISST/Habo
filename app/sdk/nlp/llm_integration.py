import json
import logging
import re
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

import ollama

from app.api.schemas.finance import FinancialAssessmentAnswer
from app.core.cache import get_cache

logger = logging.getLogger(__name__)


class OllamaClient:
    """Клиент для работы с Ollama"""

    def __init__(self, host: str = "http://localhost:11434", model: str = "llama3.2"):
        self.host = host
        self.model = model
        self.client = ollama.Client(host=host)

    async def generate(
        self, prompt: str, system_prompt: Optional[str] = None
    ) -> Optional[str]:
        """Генерировать ответ от модели"""
        try:
            messages = []

            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})

            messages.append({"role": "user", "content": prompt})

            response = self.client.chat(
                model=self.model,
                messages=messages,
                options={"temperature": 0.3, "num_predict": 1500},
            )

            return response.get("message", {}).get("content", "").strip()

        except Exception as e:
            logger.error(f"Ошибка при генерации ответа Ollama: {e}")
            return None

    async def is_available(self) -> bool:
        """Проверить доступность Ollama"""
        try:
            models = self.client.list()
            model_list = models.get("models", [])
            # Ollama returns names like "llama3.2:latest" — match with or without tag
            for model in model_list:
                name = (
                    model.get("name", "")
                    if isinstance(model, dict)
                    else getattr(model, "model", "") or getattr(model, "name", "")
                )
                if not name:
                    continue
                # Strip :tag suffix for comparison
                base_name = name.split(":")[0]
                if base_name == self.model or name == self.model:
                    return True
            return False
        except Exception as e:
            logger.error(f"Ollama недоступна: {e}")
            return False

    def pull_model(self) -> bool:
        """Pull the model if it's not already available"""
        try:
            logger.info(
                f"Pulling Ollama model '{self.model}'... This may take a few minutes."
            )
            self.client.pull(self.model)
            logger.info(f"Model '{self.model}' pulled successfully.")
            return True
        except Exception as e:
            logger.error(f"Failed to pull Ollama model '{self.model}': {e}")
            return False


# Latin characters that have visually identical Cyrillic counterparts.
# Used to fix mixed-script words produced by Llama 3.2.
_LAT_TO_CYR: dict[str, str] = {
    "A": "А",
    "a": "а",
    "B": "В",
    "C": "С",
    "c": "с",
    "E": "Е",
    "e": "е",
    "H": "Н",
    "K": "К",
    "M": "М",
    "O": "О",
    "o": "о",
    "P": "Р",
    "p": "р",
    "T": "Т",
    "X": "Х",
    "x": "х",
    "y": "у",
    "Y": "У",
    "k": "к",
    "u": "и",  # fallback – not a visual twin but common in mixed words
    "i": "и",  # Latin 'i' → Cyrillic 'и' for mixed words like 'электронику'
}

# Regex: a "word" that contains at least one Cyrillic AND at least one Latin letter.
_MIXED_WORD_RE = re.compile(
    r"\b(\S*[а-яА-ЯёЁ]+\S*[a-zA-Z]+\S*|\S*[a-zA-Z]+\S*[а-яА-ЯёЁ]+\S*)\b"
)

# Regex: a purely-Latin word (2+ chars) surrounded by Cyrillic context.
# We look for Latin-only tokens that sit between Cyrillic characters (or start/end of string next to Cyrillic).
_PURE_LATIN_AMONG_CYRILLIC_RE = re.compile(
    r"(?<=[а-яА-ЯёЁ\s.,;:!?])\b([A-Za-z]{2,})\b(?=[а-яА-ЯёЁ\s.,;:!?])"
)

# Well-known abbreviations / proper nouns that should NOT be stripped.
_LATIN_WHITELIST: set[str] = {
    "AI",
    "API",
    "IT",
    "PR",
    "HR",
    "CEO",
    "CFO",
    "CTO",
    "ETF",
    "IPO",
    "FIRE",
    "GDP",
    "USD",
    "EUR",
    "VIP",
    "OK",
    "PIN",
    "ATM",
    "POS",
    "QR",
    "Telegram",
    "WhatsApp",
    "Excel",
    "Google",
    "Apple",
    "iPhone",
    "Android",
    "iOS",
    "Windows",
    "Linux",
    "Visa",
    "MasterCard",
    "PayPal",
}

# Translation maps for assessment enum values (English → Russian).
_RISK_TOLERANCE_RU: dict[str, str] = {
    "low": "низкий",
    "medium": "средний",
    "high": "высокий",
}
_FINANCIAL_EXPERIENCE_RU: dict[str, str] = {
    "beginner": "начинающий",
    "intermediate": "средний",
    "advanced": "продвинутый",
}
_INCOME_STABILITY_RU: dict[str, str] = {
    "stable": "стабильный",
    "variable": "переменный",
    "unstable": "нестабильный",
}

# Best-effort English→Russian dictionary for common leaked words that
# survive the mixed-word fixer (i.e. they appear as purely-Latin tokens).
_COMMON_EN_WORD_RU: dict[str, str] = {
    "savings": "сбережения",
    "finances": "финансы",
    "finance": "финансы",
    "financial": "финансовый",
    "budget": "бюджет",
    "economy": "экономия",
    "investment": "инвестиции",
    "investments": "инвестиции",
    "investing": "инвестирование",
    "income": "доход",
    "expenses": "расходы",
    "spending": "расходы",
    "monthly": "ежемесячно",
    "daily": "ежедневно",
    "weekly": "еженедельно",
    "total": "итого",
    "goal": "цель",
    "goals": "цели",
    "tracking": "отслеживание",
    "optimize": "оптимизировать",
    "reduce": "сократить",
    "increase": "увеличить",
    "decrease": "уменьшить",
    "priority": "приоритет",
    "priorities": "приоритеты",
    "stable": "стабильный",
    "unstable": "нестабильный",
    "beginner": "начинающий",
    "intermediate": "средний уровень",
    "advanced": "продвинутый",
    "emergency": "экстренный",
    "fund": "фонд",
    "subscription": "подписка",
    "subscriptions": "подписки",
    "category": "категория",
    "categories": "категории",
    "option": "вариант",
    "options": "варианты",
    "cash": "наличные",
    "flow": "поток",
    "rarely": "редко",
    "frequently": "часто",
    "essential": "необходимый",
    "opting": "выбирая",
    "track": "отслеживать",
}


class FinancialAnalyzer:
    """AI анализатор финансовых данных"""

    # Common English words/fragments that Llama 3.2 leaks into Russian text,
    # mapped to their Russian replacements.
    _EN_TO_RU: list[tuple[str, str]] = [
        # Words the model mixes in most often
        ("emergency_fund", "резервный фонд"),
        ("emergency fund", "резервный фонд"),
        ("savings", "сбережения"),
        ("finance", "финансы"),
        ("finances", "финансы"),
        ("financial", "финансовый"),
        ("budget", "бюджет"),
        ("Economy", "Экономия"),
        ("economy", "экономия"),
        ("Economичные", "экономичные"),
        ("Economичн", "экономичн"),
        ("Economic", "экономическ"),
        ("economic", "экономическ"),
        ("opting", "выбирая"),
        ("option", "вариант"),
        ("options", "варианты"),
        ("rarely", "редко"),
        ("frequently", "часто"),
        ("spending", "расходы"),
        ("income", "доход"),
        ("expenses", "расходы"),
        ("investment", "инвестиции"),
        ("investments", "инвестиции"),
        ("category", "категория"),
        ("categories", "категории"),
        ("subscription", "подписка"),
        ("subscriptions", "подписки"),
        ("сберegoательные", "сберегательные"),
        ("сберegoательн", "сберегательн"),
        ("kategorий", "категорий"),
        ("kategori", "категори"),
        ("produkты", "продукты"),
        ("produk", "продук"),
        # Mixed Cyrillic+Latin fragments
        ("неessentialных", "необязательных"),
        ("неessential", "необязательн"),
        ("non-essential", "необязательный"),
        ("essential", "необходимый"),
        ("Essential", "Необходимый"),
        ("monthly", "ежемесячно"),
        ("Monthly", "Ежемесячно"),
        ("daily", "ежедневно"),
        ("weekly", "еженедельно"),
        ("total", "итого"),
        ("Total", "Итого"),
        ("cash flow", "денежный поток"),
        ("cashflow", "денежный поток"),
        ("goal", "цель"),
        ("goals", "цели"),
        ("track", "отслеживать"),
        ("tracking", "отслеживание"),
        ("optimize", "оптимизировать"),
        ("reduce", "сократить"),
        ("increase", "увеличить"),
        ("decrease", "уменьшить"),
        ("priority", "приоритет"),
        ("priorities", "приоритеты"),
        ("stable", "стабильный"),
        ("unstable", "нестабильный"),
        ("beginner", "начинающий"),
        ("intermediate", "средний уровень"),
        ("advanced", "продвинутый"),
    ]

    def __init__(self, ollama_client: OllamaClient):
        self.ollama = ollama_client
        self.cache = get_cache()

    @staticmethod
    def _sanitize_russian_text(text: str) -> str:
        """Post-process AI output: replace leaked English fragments with Russian.

        Pipeline:
        1. Static phrase-level replacements (_EN_TO_RU).
        2. Regex pass: fix mixed Cyrillic+Latin words by converting Latin
           look-alike characters to their Cyrillic equivalents.
        3. Regex pass: strip (or translate) purely-Latin words that are
           surrounded by Cyrillic text — likely leaked English.
        """
        if not text:
            return text

        result = text

        # --- Step 1: static replacements (longest-match-first is ensured by
        #     the order the list is authored in, which puts longer phrases
        #     before shorter substrings). ---
        for en, ru in FinancialAnalyzer._EN_TO_RU:
            result = result.replace(en, ru)

        # --- Step 2: fix mixed-script words ---
        def _fix_mixed_word(match: re.Match) -> str:
            word = match.group(0)
            # Only act if the word really contains BOTH scripts.
            has_cyr = bool(re.search(r"[а-яА-ЯёЁ]", word))
            has_lat = bool(re.search(r"[a-zA-Z]", word))
            if not (has_cyr and has_lat):
                return word
            # Replace each Latin char with its Cyrillic look-alike (if one exists).
            chars = list(word)
            for i, ch in enumerate(chars):
                if ch in _LAT_TO_CYR:
                    chars[i] = _LAT_TO_CYR[ch]
            return "".join(chars)

        result = _MIXED_WORD_RE.sub(_fix_mixed_word, result)

        # --- Step 3: remove / translate purely-Latin words among Cyrillic ---
        def _replace_pure_latin(match: re.Match) -> str:
            word = match.group(1)
            # Keep whitelisted abbreviations and proper nouns.
            if word in _LATIN_WHITELIST:
                return word
            # Try to translate via our common-word dictionary (case-insensitive).
            lower = word.lower()
            if lower in _COMMON_EN_WORD_RU:
                return _COMMON_EN_WORD_RU[lower]
            # If the word is ALL-CAPS and short, it might be an acronym — keep.
            if word.isupper() and len(word) <= 5:
                return word
            # Otherwise strip the leaked English word entirely.
            return ""

        result = _PURE_LATIN_AMONG_CYRILLIC_RE.sub(_replace_pure_latin, result)

        # Clean up double spaces that may result from removals.
        result = re.sub(r"  +", " ", result)

        return result

    def _format_decimal(self, value: Decimal) -> str:
        """Форматировать Decimal для отображения"""
        return f"{value:,.2f}"

    def _get_spending_categories_text(self, category_breakdown: List[Dict]) -> str:
        """Форматировать разбивку по категориям для AI"""
        if not category_breakdown:
            return "Данные по категориям не найдены."

        lines = ["Разбивка расходов по категориям:"]
        for item in category_breakdown:
            cat_name = item.get("category_name") or f"Категория {item['category_id']}"
            lines.append(
                f"- {cat_name}: {self._format_decimal(item['total'])} руб. ({item['count']} транзакций)"
            )

        return "\n".join(lines)

    async def analyze_financial_situation(
        self, user_id: int, financial_data: Dict[str, Any], period_days: int = 30
    ) -> Optional[str]:
        """Анализ финансовой ситуации пользователя.

        NOTE: caching is now handled by the caller (run_ai_analysis)
        via a data-fingerprint key, so we do NOT cache here.
        """

        try:
            total_income = financial_data.get("total_income", Decimal("0"))
            total_expenses = financial_data.get("total_expenses", Decimal("0"))
            savings_rate = financial_data.get("savings_rate", 0)
            category_breakdown = financial_data.get("category_breakdown", [])

            system_prompt = """Ты — финансовый консультант. Пиши ТОЛЬКО на русском языке.

СТРОГИЕ ПРАВИЛА:
1. ЗАПРЕЩЕНО использовать английские слова. Вместо "economy" пиши "экономия", вместо "finance" — "финансы", вместо "opting" — "выбирая" и т.д.
2. Используй ТОЛЬКО те названия категорий, которые указаны в данных пользователя. Никогда не пиши "категория ID" или "category".
3. Каждый пункт — максимум 2 предложения.
4. Общий объём ответа — не более 200 слов.
5. НЕ повторяй числа из данных дословно — делай выводы и давай оценку.

КРИТИЧЕСКИ ВАЖНО: Никогда не смешивай кириллицу и латиницу в одном слове. Каждое слово должно быть написано ПОЛНОСТЬЮ на кириллице.

ФОРМАТ ОТВЕТА (строго соблюдай):

ОЦЕНКА:
Одно предложение с общей оценкой финансового состояния.

СТРУКТУРА РАСХОДОВ:
- Пункт 1 о главной категории расходов
- Пункт 2 о второй категории
- Пункт 3 (если есть)

РЕКОМЕНДАЦИИ:
- Конкретный совет 1 с суммой или процентом
- Конкретный совет 2
- Конкретный совет 3"""

            user_prompt = f"""Финансовые данные за {period_days} дней:
Доходы: {self._format_decimal(total_income)} руб.
Расходы: {self._format_decimal(total_expenses)} руб.
Сбережения: {self._format_decimal(total_income - total_expenses)} руб.
Норма сбережений: {savings_rate:.1f}%

{self._get_spending_categories_text(category_breakdown)}

Проанализируй и ответь строго по формату выше, только на русском языке."""

            analysis = await self.ollama.generate(user_prompt, system_prompt)

            return self._sanitize_russian_text(analysis) if analysis else analysis

        except Exception as e:
            logger.error(f"Ошибка анализа финансовой ситуации: {e}")
            return None

    async def generate_recommendations(
        self,
        user_id: int,
        financial_data: Dict[str, Any],
        user_goals: Optional[List[Dict]] = None,
        user_assessment: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """Генерация персональных рекомендаций.

        NOTE: caching is now handled by the caller (run_ai_analysis)
        via a data-fingerprint key, so we do NOT cache here.
        """

        try:
            system_prompt = """Ты — финансовый консультант по методу Кэкэйбо. Пиши ТОЛЬКО на русском языке.

СТРОГИЕ ПРАВИЛА:
1. ЗАПРЕЩЕНО использовать английские слова. Все слова только на русском.
2. Используй названия категорий из данных пользователя, не пиши "ID" или "category".
3. Дай ровно 4 рекомендации.
4. Каждая рекомендация — 1-2 предложения, не больше.
5. Общий объём — не более 120 слов.
6. Указывай конкретные суммы и проценты.

КРИТИЧЕСКИ ВАЖНО: Никогда не смешивай кириллицу и латиницу в одном слове. Каждое слово должно быть написано ПОЛНОСТЬЮ на кириллице.

ФОРМАТ (строго):
1. Главное действие: [конкретный совет]
2. Оптимизация: [как сократить расходы]
3. Цели: [совет по целям и сбережениям]
4. Внимание: [на что обратить внимание]"""

            goals_text = ""
            if user_goals:
                goals_text = "\nЦели:\n"
                for goal in user_goals:
                    progress = (
                        (goal["current_amount"] / goal["target_amount"] * 100)
                        if goal["target_amount"] > 0
                        else 0
                    )
                    goals_text += f"- {goal['title']}: {self._format_decimal(goal['current_amount'])}/{self._format_decimal(goal['target_amount'])} руб. ({progress:.0f}%)\n"

            assessment_text = ""
            if user_assessment:
                parts = []
                if user_assessment.get("risk_tolerance"):
                    risk_val = user_assessment["risk_tolerance"]
                    risk_ru = _RISK_TOLERANCE_RU.get(risk_val, risk_val)
                    parts.append(f"риск: {risk_ru}")
                if user_assessment.get("financial_experience"):
                    exp_val = user_assessment["financial_experience"]
                    exp_ru = _FINANCIAL_EXPERIENCE_RU.get(exp_val, exp_val)
                    parts.append(f"опыт: {exp_ru}")
                if user_assessment.get("income_stability"):
                    stab_val = user_assessment["income_stability"]
                    stab_ru = _INCOME_STABILITY_RU.get(stab_val, stab_val)
                    parts.append(f"стабильность дохода: {stab_ru}")
                if parts:
                    assessment_text = "\nПрофиль: " + ", ".join(parts)

            user_prompt = f"""Данные:
Доходы: {self._format_decimal(financial_data.get("total_income", 0))} руб.
Расходы: {self._format_decimal(financial_data.get("total_expenses", 0))} руб.
Норма сбережений: {financial_data.get("savings_rate", 0):.1f}%

{self._get_spending_categories_text(financial_data.get("category_breakdown", []))}
{goals_text}{assessment_text}

Дай ровно 4 рекомендации по формату. Пиши ТОЛЬКО на русском, без единого английского слова."""

            recommendations = await self.ollama.generate(user_prompt, system_prompt)

            return (
                self._sanitize_russian_text(recommendations)
                if recommendations
                else recommendations
            )

        except Exception as e:
            logger.error(f"Ошибка генерации рекомендаций: {e}")
            return None

    async def analyze_assessment(
        self, answers: List[FinancialAssessmentAnswer]
    ) -> Tuple[Dict[str, Any], str]:
        """Анализ результатов финансового опроса"""

        try:
            system_prompt = """Ты — эксперт по финансовой психологии. Отвечай ТОЛЬКО на русском языке.

Проанализируй ответы пользователя и определи его финансовый профиль.

КРИТИЧЕСКИ ВАЖНО: Никогда не смешивай кириллицу и латиницу в одном слове. Каждое слово должно быть написано ПОЛНОСТЬЮ на кириллице.

Ответ верни СТРОГО в формате JSON (без пояснений, только JSON):
{
  "risk_tolerance": "low" или "medium" или "high",
  "financial_experience": "beginner" или "intermediate" или "advanced",
  "income_stability": "stable" или "unstable" или "variable",
  "spending_habits": "краткое описание на русском, 1 предложение",
  "recommendations": "2-3 конкретных совета на русском языке, без английских слов",
  "score": число от 1 до 100
}

ВАЖНО: текст в полях spending_habits и recommendations должен быть ТОЛЬКО на русском языке."""

            # Формируем текст с ответами
            answers_text = "Ответы пользователя на финансовый опрос:\n"
            for i, answer in enumerate(answers, 1):
                answers_text += (
                    f"{i}. {answer.question_text}\nОтвет: {answer.answer}\n\n"
                )

            response = await self.ollama.generate(answers_text, system_prompt)

            if not response:
                return {}, "Не удалось проанализировать ответы"

            # Sanitize English leaks before parsing
            response = self._sanitize_russian_text(response)

            # Парсим JSON ответ
            try:
                # The LLM sometimes wraps JSON in markdown code fences
                cleaned = response.strip()
                if cleaned.startswith("```"):
                    # Remove ```json ... ``` wrapper
                    cleaned = cleaned.split("\n", 1)[-1]  # drop first line
                    if cleaned.endswith("```"):
                        cleaned = cleaned[: -len("```")]
                    cleaned = cleaned.strip()

                analysis_result = json.loads(cleaned)

                # Ensure recommendations is ALWAYS a string (DB column is VARCHAR).
                # The LLM may return a list of strings instead of a single string.
                recommendations = analysis_result.get("recommendations", "")
                if isinstance(recommendations, list):
                    recommendations = "; ".join(str(r) for r in recommendations if r)
                elif not isinstance(recommendations, str):
                    recommendations = str(recommendations)

                # Ensure spending_habits is also a string and sanitized
                spending_habits = analysis_result.get("spending_habits", "")
                if isinstance(spending_habits, list):
                    spending_habits = "; ".join(str(s) for s in spending_habits if s)
                analysis_result["spending_habits"] = self._sanitize_russian_text(
                    str(spending_habits) if spending_habits else ""
                )

                # Ensure score is an int
                score = analysis_result.get("score")
                if score is not None:
                    try:
                        analysis_result["score"] = int(float(str(score)))
                    except (ValueError, TypeError):
                        analysis_result["score"] = 50

                # Sanitize recommendations text
                recommendations = self._sanitize_russian_text(recommendations)

                # Store the cleaned string back so callers always get str
                analysis_result["recommendations"] = recommendations

                return analysis_result, recommendations
            except json.JSONDecodeError:
                # Если не получилось распарсить JSON, возвращаем базовый результат
                return {
                    "risk_tolerance": "medium",
                    "financial_experience": "beginner",
                    "income_stability": "stable",
                    "score": 50,
                }, response

        except Exception as e:
            logger.error(f"Ошибка анализа опроса: {e}")
            return {}, "Произошла ошибка при анализе ответов"

    async def generate_kakeibo_insights(
        self,
        user_id: int,
        small_notebook_data: Dict[str, Any],
        big_notebook_data: Dict[str, Any],
        period: str = "месяц",
    ) -> Optional[str]:
        """Генерация инсайтов по блокнотам Кэкэйбо"""

        try:
            system_prompt = """
Ты - мастер японского метода Кэкэйбо. Проанализируй данные из маленького и большого блокнотов пользователя.

Маленький блокнот (小さな手帳) - ежедневные планы и траты
Большой блокнот (大きな手帳) - долгосрочные цели и анализ

Дай инсайты:
1. 📋 Анализ выполнения ежедневных планов
2. 🎯 Прогресс по долгосрочным целям
3. 💡 Паттерны в тратах
4. 🔮 Прогноз и рекомендации

Отвечай в духе японской мудрости - кратко, ёмко и практично.
"""

            user_prompt = f"""
Анализ блокнотов Кэкэйбо за {period}:

📔 МАЛЕНЬКИЙ БЛОКНОТ (ежедневные траты):
• Запланировано: {self._format_decimal(small_notebook_data.get("total_planned", 0))} руб.
• Потрачено: {self._format_decimal(small_notebook_data.get("total_actual", 0))} руб.
• Отклонение: {self._format_decimal(small_notebook_data.get("variance", 0))} руб.
• Транзакций: {len(small_notebook_data.get("transactions", []))}

📘 БОЛЬШОЙ БЛОКНОТ (долгосрочные цели):
• Запланировано: {self._format_decimal(big_notebook_data.get("total_planned", 0))} руб.
• Потрачено: {self._format_decimal(big_notebook_data.get("total_actual", 0))} руб.
• Отклонение: {self._format_decimal(big_notebook_data.get("variance", 0))} руб.
• Транзакций: {len(big_notebook_data.get("transactions", []))}

Дай анализ соответствия принципам Кэкэйбо и практические советы.
"""

            insights = await self.ollama.generate(user_prompt, system_prompt)

            if insights and self.cache:
                await self.cache.cache_ai_analysis(
                    user_id, f"kakeibo_insights_{period}", insights, ttl=1800
                )

            return insights

        except Exception as e:
            logger.error(f"Ошибка генерации инсайтов Кэкэйбо: {e}")
            return None


# Глобальный экземпляр
ollama_client: Optional[OllamaClient] = None
financial_analyzer: Optional[FinancialAnalyzer] = None


def get_ollama_client() -> Optional[OllamaClient]:
    """Получить клиент Ollama"""
    return ollama_client


def get_financial_analyzer() -> Optional[FinancialAnalyzer]:
    """Получить анализатор финансов"""
    return financial_analyzer


async def init_ollama(host: str = "http://localhost:11434", model: str = "llama3.2"):
    """Инициализировать Ollama"""
    global ollama_client, financial_analyzer

    ollama_client = OllamaClient(host, model)

    # Проверяем доступность
    if await ollama_client.is_available():
        financial_analyzer = FinancialAnalyzer(ollama_client)
        logger.info(f"Ollama успешно инициализирован с моделью {model}")
    else:
        # Model not found — try to pull it automatically
        logger.info(f"Модель {model} не найдена в Ollama, пробуем скачать...")
        try:
            pulled = ollama_client.pull_model()
            if pulled and await ollama_client.is_available():
                financial_analyzer = FinancialAnalyzer(ollama_client)
                logger.info(
                    f"Ollama успешно инициализирован с моделью {model} (auto-pulled)"
                )
            else:
                logger.warning(f"Ollama: не удалось загрузить модель {model}")
        except Exception as e:
            logger.warning(f"Ollama: ошибка при загрузке модели {model}: {e}")


async def close_ollama():
    """Закрыть соединение с Ollama"""
    global ollama_client, financial_analyzer

    ollama_client = None
    financial_analyzer = None

    logger.info("Ollama соединение закрыто")
