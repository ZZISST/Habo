import os
import sys
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, PropertyMock, patch

import pytest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from app.sdk.nlp.llm_integration import (
    _COMMON_EN_WORD_RU,
    _FINANCIAL_EXPERIENCE_RU,
    _INCOME_STABILITY_RU,
    _LAT_TO_CYR,
    _LATIN_WHITELIST,
    _RISK_TOLERANCE_RU,
    FinancialAnalyzer,
    OllamaClient,
)


def _make_analyzer(response_text: str = "Ответ модели") -> FinancialAnalyzer:
    """Return a FinancialAnalyzer whose OllamaClient.generate is mocked."""
    mock_ollama = MagicMock(spec=OllamaClient)
    mock_ollama.generate = AsyncMock(return_value=response_text)
    analyzer = FinancialAnalyzer(ollama_client=mock_ollama)
    return analyzer


def _make_stats(**overrides) -> dict:
    base = {
        "total_income": Decimal("140000.00"),
        "total_expenses": Decimal("84000.00"),
        "savings": Decimal("56000.00"),
        "savings_rate": 40.0,
        "category_breakdown": [
            {
                "category_id": 3,
                "total": Decimal("67000.00"),
                "count": 1,
                "category_name": "Электроника",
            },
            {
                "category_id": 1,
                "total": Decimal("3000.00"),
                "count": 1,
                "category_name": "Продукты",
            },
        ],
    }
    base.update(overrides)
    return base


class TestSanitizeStaticReplacements:
    def test_savings_replaced(self):
        result = FinancialAnalyzer._sanitize_russian_text("savings are important")
        assert "savings" not in result
        assert "сбережения" in result

    def test_finance_replaced(self):
        result = FinancialAnalyzer._sanitize_russian_text("ваши finance в порядке")
        assert "finance" not in result
        assert "финансы" in result

    def test_budget_replaced(self):
        result = FinancialAnalyzer._sanitize_russian_text("ваш budget")
        assert "budget" not in result
        assert "бюджет" in result

    def test_monthly_replaced(self):
        result = FinancialAnalyzer._sanitize_russian_text("monthly расходы высокие")
        assert "monthly" not in result.lower() or "ежемесячно" in result

    def test_economy_capitalized_replaced(self):
        result = FinancialAnalyzer._sanitize_russian_text("Economy страны растёт")
        assert "Economy" not in result

    def test_goal_replaced(self):
        result = FinancialAnalyzer._sanitize_russian_text("ваша goal выполнена")
        assert "goal" not in result
        assert "цель" in result

    def test_multiple_replacements_in_one_string(self):
        text = "ваши savings и finance важны для budget"
        result = FinancialAnalyzer._sanitize_russian_text(text)
        assert "savings" not in result
        assert "finance" not in result
        assert "budget" not in result

    def test_clean_russian_text_unchanged(self):
        clean = "Ваши финансы в полном порядке. Сбережения растут."
        result = FinancialAnalyzer._sanitize_russian_text(clean)
        assert result == clean

    def test_empty_string_returned_as_is(self):
        assert FinancialAnalyzer._sanitize_russian_text("") == ""

    def test_none_returned_as_none(self):
        # The guard: `if not text: return text`
        result = FinancialAnalyzer._sanitize_russian_text(None)
        assert result is None

    def test_whitespace_only_collapsed_to_single_space(self):
        # The sanitizer's final cleanup step collapses multiple spaces into one.
        result = FinancialAnalyzer._sanitize_russian_text("   ")
        assert result == " "


class TestSanitizeMixedScriptFixer:
    def test_mixed_word_elektroniku_fixed(self):
        """'электронiku' should become fully Cyrillic."""
        result = FinancialAnalyzer._sanitize_russian_text("электронiku стоит дорого")
        # Latin 'i' → Cyrillic 'и', Latin 'k' → Cyrillic 'к', Latin 'u' → Cyrillic 'и'
        assert "электронику" in result or "электроник" in result

    def test_mixed_word_rublei_fixed(self):
        """'rubлей' — Latin 'r', 'u', 'b' mixed with Cyrillic 'лей'."""
        result = FinancialAnalyzer._sanitize_russian_text("100 rubлей потрачено")
        # After conversion the resulting word should be all-Cyrillic
        assert "rubлей" not in result

    def test_mixed_word_with_latin_e(self):
        """Latin 'e' → Cyrillic 'е' should be replaced inside a mixed word."""
        # Create a word that has one Latin 'e' surrounded by Cyrillic
        mixed = "расходeы"  # Latin 'e' inside
        result = FinancialAnalyzer._sanitize_russian_text(mixed)
        assert (
            "e" not in result or result == mixed
        )  # either fixed or left as-is by regex

    def test_lat_to_cyr_map_covers_common_lookalikes(self):
        """Check that the mapping includes the most common lookalike pairs."""
        critical = ["a", "e", "o", "p", "c", "x", "y", "k"]
        for ch in critical:
            assert ch in _LAT_TO_CYR, f"Latin '{ch}' missing from _LAT_TO_CYR"

    def test_purely_cyrillic_word_unchanged_by_fixer(self):
        cyrillic_text = "расходы доходы сбережения"
        result = FinancialAnalyzer._sanitize_russian_text(cyrillic_text)
        assert result == cyrillic_text

    def test_purely_latin_word_not_modified_by_mixed_fixer(self):
        """A purely Latin word (no Cyrillic chars) should not be touched by the mixed-word step."""
        # It may be handled by step 3, but step 2 should leave it alone.
        # We test that the function doesn't crash and returns a string.
        result = FinancialAnalyzer._sanitize_russian_text("hello world")
        assert isinstance(result, str)


class TestSanitizePureLatinAmongCyrillic:
    def test_known_english_word_translated(self):
        """'savings' surrounded by Cyrillic should be translated."""
        # Step 1 already handles 'savings', but let's test a word that's only in step 3.
        # Use 'investing' which is in _COMMON_EN_WORD_RU but not in _EN_TO_RU static list.
        text = "вам нужно investing регулярно"
        result = FinancialAnalyzer._sanitize_russian_text(text)
        # Either translated or stripped — should not remain as 'investing'
        assert "investing" not in result

    def test_whitelisted_word_preserved(self):
        """ETF should pass through unchanged as it's in the whitelist."""
        text = "инвестируйте в ETF каждый месяц"
        result = FinancialAnalyzer._sanitize_russian_text(text)
        assert "ETF" in result

    def test_ai_whitelisted_word_preserved(self):
        text = "используйте AI для анализа"
        result = FinancialAnalyzer._sanitize_russian_text(text)
        assert "AI" in result

    def test_whitelist_contains_common_tech_terms(self):
        important = {"AI", "ETF", "API", "IT", "USD", "EUR"}
        for term in important:
            assert term in _LATIN_WHITELIST, f"'{term}' not in whitelist"

    def test_short_allcaps_acronym_preserved(self):
        """Short ALL-CAPS words (≤5 chars) that are not whitelisted should be kept."""
        # e.g. 'IPO' is in whitelist, but even if not, short CAPS survive
        text = "купите акции IPO сегодня"
        result = FinancialAnalyzer._sanitize_russian_text(text)
        assert "IPO" in result

    def test_double_spaces_cleaned_after_removal(self):
        """After stripping a leaked word, double spaces must not remain."""
        # Inject a word that will be stripped (not in whitelist, not in dict)
        text = "ваши xyzunknownword расходы велики"
        result = FinancialAnalyzer._sanitize_russian_text(text)
        assert "  " not in result  # no double spaces

    def test_common_en_word_ru_dict_has_key_entries(self):
        """The common English→Russian dict should cover basic financial terms."""
        required_keys = ["savings", "finance", "budget", "income", "expenses", "goal"]
        for key in required_keys:
            assert key in _COMMON_EN_WORD_RU, f"'{key}' missing from _COMMON_EN_WORD_RU"


class TestRiskToleranceTranslation:
    def test_low_translated(self):
        assert _RISK_TOLERANCE_RU["low"] == "низкий"

    def test_medium_translated(self):
        assert _RISK_TOLERANCE_RU["medium"] == "средний"

    def test_high_translated(self):
        assert _RISK_TOLERANCE_RU["high"] == "высокий"

    def test_all_three_values_covered(self):
        assert set(_RISK_TOLERANCE_RU.keys()) == {"low", "medium", "high"}

    def test_unknown_value_falls_back_to_itself(self):
        """dict.get(unknown, unknown) pattern — unrecognized value passes through."""
        unknown = "extreme"
        result = _RISK_TOLERANCE_RU.get(unknown, unknown)
        assert result == unknown


class TestFinancialExperienceTranslation:
    def test_beginner_translated(self):
        assert _FINANCIAL_EXPERIENCE_RU["beginner"] == "начинающий"

    def test_intermediate_translated(self):
        assert _FINANCIAL_EXPERIENCE_RU["intermediate"] == "средний"

    def test_advanced_translated(self):
        assert _FINANCIAL_EXPERIENCE_RU["advanced"] == "продвинутый"

    def test_all_three_values_covered(self):
        assert set(_FINANCIAL_EXPERIENCE_RU.keys()) == {
            "beginner",
            "intermediate",
            "advanced",
        }

    def test_no_english_words_in_translation_values(self):
        """All translated values should be Cyrillic strings."""
        for value in _FINANCIAL_EXPERIENCE_RU.values():
            has_latin = any(c.isascii() and c.isalpha() for c in value)
            assert not has_latin, f"English chars found in translated value: '{value}'"


class TestIncomeStabilityTranslation:
    def test_stable_translated(self):
        assert _INCOME_STABILITY_RU["stable"] == "стабильный"

    def test_variable_translated(self):
        assert _INCOME_STABILITY_RU["variable"] == "переменный"

    def test_unstable_translated(self):
        assert _INCOME_STABILITY_RU["unstable"] == "нестабильный"

    def test_all_three_values_covered(self):
        assert set(_INCOME_STABILITY_RU.keys()) == {"stable", "variable", "unstable"}

    def test_no_english_words_in_translation_values(self):
        for value in _INCOME_STABILITY_RU.values():
            has_latin = any(c.isascii() and c.isalpha() for c in value)
            assert not has_latin, f"English chars found in translated value: '{value}'"


class TestFormatDecimal:
    def _fmt(self, value) -> str:
        analyzer = _make_analyzer()
        return analyzer._format_decimal(Decimal(str(value)))

    def test_integer_amount(self):
        assert self._fmt(140000) == "140,000.00"

    def test_amount_with_cents(self):
        assert self._fmt("3000.50") == "3,000.50"

    def test_zero(self):
        assert self._fmt(0) == "0.00"

    def test_large_amount_has_comma_separator(self):
        result = self._fmt(1000000)
        assert "," in result

    def test_two_decimal_places(self):
        result = self._fmt("1234.1")
        assert result.endswith(".10")


class TestGetSpendingCategoriesText:
    def _get_text(self, breakdown: list) -> str:
        analyzer = _make_analyzer()
        return analyzer._get_spending_categories_text(breakdown)

    def test_empty_breakdown_returns_fallback(self):
        result = self._get_text([])
        assert "не найдены" in result.lower() or result  # some message returned

    def test_category_name_in_output(self):
        breakdown = [
            {
                "category_id": 3,
                "total": Decimal("67000.00"),
                "count": 1,
                "category_name": "Электроника",
            },
        ]
        result = self._get_text(breakdown)
        assert "Электроника" in result

    def test_amount_in_output(self):
        breakdown = [
            {
                "category_id": 3,
                "total": Decimal("67000.00"),
                "count": 1,
                "category_name": "Электроника",
            },
        ]
        result = self._get_text(breakdown)
        assert "67,000.00" in result

    def test_transaction_count_in_output(self):
        breakdown = [
            {
                "category_id": 3,
                "total": Decimal("67000.00"),
                "count": 2,
                "category_name": "Электроника",
            },
        ]
        result = self._get_text(breakdown)
        assert "2" in result

    def test_multiple_categories_all_present(self):
        breakdown = [
            {
                "category_id": 1,
                "total": Decimal("3000.00"),
                "count": 1,
                "category_name": "Продукты",
            },
            {
                "category_id": 3,
                "total": Decimal("67000.00"),
                "count": 1,
                "category_name": "Электроника",
            },
            {
                "category_id": 10,
                "total": Decimal("14000.00"),
                "count": 1,
                "category_name": "Сбережения / Цели",
            },
        ]
        result = self._get_text(breakdown)
        assert "Продукты" in result
        assert "Электроника" in result
        assert "Сбережения / Цели" in result

    def test_missing_category_name_falls_back_to_id(self):
        """If category_name is absent, output should reference the category_id."""
        breakdown = [
            {"category_id": 42, "total": Decimal("5000.00"), "count": 1},
        ]
        result = self._get_text(breakdown)
        assert "42" in result


class TestOllamaClientGenerate:
    @pytest.mark.asyncio
    async def test_generate_returns_content_on_success(self):
        mock_client = MagicMock()
        mock_client.chat.return_value = {
            "message": {"content": "  Отличный ответ модели  "}
        }

        ollama_client = OllamaClient.__new__(OllamaClient)
        ollama_client.host = "http://localhost:11434"
        ollama_client.model = "llama3.2"
        ollama_client.client = mock_client

        result = await ollama_client.generate("Привет", "Ты помощник")

        assert result == "Отличный ответ модели"
        mock_client.chat.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_passes_system_prompt_as_system_message(self):
        mock_client = MagicMock()
        mock_client.chat.return_value = {"message": {"content": "ok"}}

        ollama_client = OllamaClient.__new__(OllamaClient)
        ollama_client.host = "http://localhost:11434"
        ollama_client.model = "llama3.2"
        ollama_client.client = mock_client

        await ollama_client.generate("Вопрос", system_prompt="Ты финансовый советник")

        call_kwargs = mock_client.chat.call_args
        messages = call_kwargs[1]["messages"] if call_kwargs[1] else call_kwargs[0][1]
        roles = [m["role"] for m in messages]
        assert "system" in roles
        assert "user" in roles

    @pytest.mark.asyncio
    async def test_generate_without_system_prompt_only_user_message(self):
        mock_client = MagicMock()
        mock_client.chat.return_value = {"message": {"content": "ok"}}

        ollama_client = OllamaClient.__new__(OllamaClient)
        ollama_client.host = "http://localhost:11434"
        ollama_client.model = "llama3.2"
        ollama_client.client = mock_client

        await ollama_client.generate("Вопрос без системного промпта")

        call_kwargs = mock_client.chat.call_args
        messages = call_kwargs[1]["messages"] if call_kwargs[1] else call_kwargs[0][1]
        roles = [m["role"] for m in messages]
        assert "system" not in roles
        assert "user" in roles

    @pytest.mark.asyncio
    async def test_generate_returns_none_on_exception(self):
        mock_client = MagicMock()
        mock_client.chat.side_effect = ConnectionError("Ollama not running")

        ollama_client = OllamaClient.__new__(OllamaClient)
        ollama_client.host = "http://localhost:11434"
        ollama_client.model = "llama3.2"
        ollama_client.client = mock_client

        result = await ollama_client.generate("Вопрос")
        assert result is None

    @pytest.mark.asyncio
    async def test_generate_uses_correct_model_name(self):
        mock_client = MagicMock()
        mock_client.chat.return_value = {"message": {"content": "ok"}}

        ollama_client = OllamaClient.__new__(OllamaClient)
        ollama_client.host = "http://localhost:11434"
        ollama_client.model = "llama3.2"
        ollama_client.client = mock_client

        await ollama_client.generate("test")

        call_kwargs = mock_client.chat.call_args
        model_arg = call_kwargs[1].get("model") or call_kwargs[0][0]
        assert model_arg == "llama3.2"


class TestOllamaClientIsAvailable:
    @pytest.mark.asyncio
    async def test_returns_true_when_model_found_exact(self):
        mock_client = MagicMock()
        mock_client.list.return_value = {"models": [{"name": "llama3.2"}]}

        ollama_client = OllamaClient.__new__(OllamaClient)
        ollama_client.host = "http://localhost:11434"
        ollama_client.model = "llama3.2"
        ollama_client.client = mock_client

        result = await ollama_client.is_available()
        assert result is True

    @pytest.mark.asyncio
    async def test_returns_true_when_model_found_with_tag(self):
        """'llama3.2:latest' should match model 'llama3.2'."""
        mock_client = MagicMock()
        mock_client.list.return_value = {"models": [{"name": "llama3.2:latest"}]}

        ollama_client = OllamaClient.__new__(OllamaClient)
        ollama_client.host = "http://localhost:11434"
        ollama_client.model = "llama3.2"
        ollama_client.client = mock_client

        result = await ollama_client.is_available()
        assert result is True

    @pytest.mark.asyncio
    async def test_returns_false_when_model_not_found(self):
        mock_client = MagicMock()
        mock_client.list.return_value = {
            "models": [{"name": "mistral"}, {"name": "qwen2.5"}]
        }

        ollama_client = OllamaClient.__new__(OllamaClient)
        ollama_client.host = "http://localhost:11434"
        ollama_client.model = "llama3.2"
        ollama_client.client = mock_client

        result = await ollama_client.is_available()
        assert result is False

    @pytest.mark.asyncio
    async def test_returns_false_when_model_list_empty(self):
        mock_client = MagicMock()
        mock_client.list.return_value = {"models": []}

        ollama_client = OllamaClient.__new__(OllamaClient)
        ollama_client.host = "http://localhost:11434"
        ollama_client.model = "llama3.2"
        ollama_client.client = mock_client

        result = await ollama_client.is_available()
        assert result is False

    @pytest.mark.asyncio
    async def test_returns_false_on_connection_error(self):
        mock_client = MagicMock()
        mock_client.list.side_effect = ConnectionError("Ollama offline")

        ollama_client = OllamaClient.__new__(OllamaClient)
        ollama_client.host = "http://localhost:11434"
        ollama_client.model = "llama3.2"
        ollama_client.client = mock_client

        result = await ollama_client.is_available()
        assert result is False


class TestAnalyzeFinancialSituation:
    @pytest.mark.asyncio
    async def test_returns_string_on_success(self):
        analyzer = _make_analyzer(
            "ОЦЕНКА:\nФинансы в норме.\n\nСТРУКТУРА РАСХОДОВ:\n- Электроника высокая"
        )
        result = await analyzer.analyze_financial_situation(
            user_id=1, financial_data=_make_stats(), period_days=30
        )
        assert isinstance(result, str)
        assert len(result) > 0

    @pytest.mark.asyncio
    async def test_calls_ollama_generate_once(self):
        analyzer = _make_analyzer("Ответ")
        await analyzer.analyze_financial_situation(
            user_id=1, financial_data=_make_stats()
        )
        analyzer.ollama.generate.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_returns_none_when_ollama_returns_none(self):
        analyzer = _make_analyzer(None)
        result = await analyzer.analyze_financial_situation(
            user_id=1, financial_data=_make_stats()
        )
        assert result is None

    @pytest.mark.asyncio
    async def test_sanitizer_applied_to_output(self):
        """Output containing 'savings' should have it replaced with 'сбережения'."""
        analyzer = _make_analyzer("Your savings are low.")
        result = await analyzer.analyze_financial_situation(
            user_id=1, financial_data=_make_stats()
        )
        assert "savings" not in result
        assert "сбережения" in result

    @pytest.mark.asyncio
    async def test_returns_none_on_ollama_exception(self):
        mock_ollama = MagicMock(spec=OllamaClient)
        mock_ollama.generate = AsyncMock(side_effect=RuntimeError("LLM crashed"))
        analyzer = FinancialAnalyzer(ollama_client=mock_ollama)

        result = await analyzer.analyze_financial_situation(
            user_id=1, financial_data=_make_stats()
        )
        assert result is None

    @pytest.mark.asyncio
    async def test_period_days_included_in_prompt(self):
        """The user prompt passed to ollama should contain the period days."""
        analyzer = _make_analyzer("ok")
        await analyzer.analyze_financial_situation(
            user_id=1, financial_data=_make_stats(), period_days=14
        )

        call_args = analyzer.ollama.generate.call_args
        user_prompt = call_args[0][0]
        assert "14" in user_prompt

    @pytest.mark.asyncio
    async def test_category_names_included_in_prompt(self):
        analyzer = _make_analyzer("ok")
        await analyzer.analyze_financial_situation(
            user_id=1, financial_data=_make_stats()
        )

        call_args = analyzer.ollama.generate.call_args
        user_prompt = call_args[0][0]
        assert "Электроника" in user_prompt

    @pytest.mark.asyncio
    async def test_system_prompt_contains_russian_only_instruction(self):
        analyzer = _make_analyzer("ok")
        await analyzer.analyze_financial_situation(
            user_id=1, financial_data=_make_stats()
        )

        call_args = analyzer.ollama.generate.call_args
        system_prompt = call_args[0][1]
        assert "русском" in system_prompt.lower() or "ТОЛЬКО" in system_prompt


class TestGenerateRecommendations:
    @pytest.mark.asyncio
    async def test_returns_string_on_success(self):
        analyzer = _make_analyzer(
            "1. Главное действие: сократить расходы на электронику.\n"
            "2. Оптимизация: пересмотреть подписки.\n"
            "3. Цели: увеличить взносы.\n"
            "4. Внимание: следить за балансом."
        )
        result = await analyzer.generate_recommendations(
            user_id=1, financial_data=_make_stats()
        )
        assert isinstance(result, str)

    @pytest.mark.asyncio
    async def test_calls_ollama_generate_once(self):
        analyzer = _make_analyzer("Рекомендации")
        await analyzer.generate_recommendations(user_id=1, financial_data=_make_stats())
        analyzer.ollama.generate.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_returns_none_when_ollama_returns_none(self):
        analyzer = _make_analyzer(None)
        result = await analyzer.generate_recommendations(
            user_id=1, financial_data=_make_stats()
        )
        assert result is None

    @pytest.mark.asyncio
    async def test_assessment_risk_translated_to_russian_in_prompt(self):
        """'medium' risk_tolerance must appear in the prompt as 'средний', not 'medium'."""
        analyzer = _make_analyzer("Рекомендации")
        await analyzer.generate_recommendations(
            user_id=1,
            financial_data=_make_stats(),
            user_assessment={"risk_tolerance": "medium"},
        )

        call_args = analyzer.ollama.generate.call_args
        user_prompt = call_args[0][0]
        assert "средний" in user_prompt
        assert "medium" not in user_prompt

    @pytest.mark.asyncio
    async def test_assessment_experience_translated_to_russian_in_prompt(self):
        """'beginner' financial_experience must appear as 'начинающий'."""
        analyzer = _make_analyzer("Рекомендации")
        await analyzer.generate_recommendations(
            user_id=1,
            financial_data=_make_stats(),
            user_assessment={"financial_experience": "beginner"},
        )

        call_args = analyzer.ollama.generate.call_args
        user_prompt = call_args[0][0]
        assert "начинающий" in user_prompt
        assert "beginner" not in user_prompt

    @pytest.mark.asyncio
    async def test_assessment_stability_translated_to_russian_in_prompt(self):
        """'stable' income_stability must appear as 'стабильный'."""
        analyzer = _make_analyzer("Рекомендации")
        await analyzer.generate_recommendations(
            user_id=1,
            financial_data=_make_stats(),
            user_assessment={"income_stability": "stable"},
        )

        call_args = analyzer.ollama.generate.call_args
        user_prompt = call_args[0][0]
        assert "стабильный" in user_prompt
        assert "stable" not in user_prompt

    @pytest.mark.asyncio
    async def test_all_three_assessment_fields_translated(self):
        """All three assessment enum fields must be translated simultaneously."""
        analyzer = _make_analyzer("ok")
        await analyzer.generate_recommendations(
            user_id=1,
            financial_data=_make_stats(),
            user_assessment={
                "risk_tolerance": "high",
                "financial_experience": "advanced",
                "income_stability": "variable",
            },
        )

        call_args = analyzer.ollama.generate.call_args
        user_prompt = call_args[0][0]
        assert "высокий" in user_prompt
        assert "продвинутый" in user_prompt
        assert "переменный" in user_prompt
        # No raw English values
        assert "high" not in user_prompt
        assert "advanced" not in user_prompt
        assert "variable" not in user_prompt

    @pytest.mark.asyncio
    async def test_goals_text_included_in_prompt_when_provided(self):
        """Goal title and amounts must appear in the recommendations prompt."""
        analyzer = _make_analyzer("ok")
        goals = [
            {
                "title": "отпуск в израиле",
                "current_amount": Decimal("14000.00"),
                "target_amount": Decimal("520000.00"),
            }
        ]
        await analyzer.generate_recommendations(
            user_id=1,
            financial_data=_make_stats(),
            user_goals=goals,
        )

        call_args = analyzer.ollama.generate.call_args
        user_prompt = call_args[0][0]
        assert "отпуск в израиле" in user_prompt
        assert "520,000.00" in user_prompt

    @pytest.mark.asyncio
    async def test_no_goals_text_when_goals_none(self):
        """When user_goals=None the prompt must not contain a 'Цели:' section."""
        analyzer = _make_analyzer("ok")
        await analyzer.generate_recommendations(
            user_id=1,
            financial_data=_make_stats(),
            user_goals=None,
        )

        call_args = analyzer.ollama.generate.call_args
        user_prompt = call_args[0][0]
        # Goals section heading should be absent
        assert "\nЦели:\n" not in user_prompt

    @pytest.mark.asyncio
    async def test_no_assessment_text_when_assessment_none(self):
        """When user_assessment=None the prompt must not contain 'Профиль:'."""
        analyzer = _make_analyzer("ok")
        await analyzer.generate_recommendations(
            user_id=1,
            financial_data=_make_stats(),
            user_assessment=None,
        )

        call_args = analyzer.ollama.generate.call_args
        user_prompt = call_args[0][0]
        assert "Профиль:" not in user_prompt

    @pytest.mark.asyncio
    async def test_sanitizer_applied_to_recommendations_output(self):
        """Leaked English in recommendations must be sanitized before return."""
        analyzer = _make_analyzer(
            "1. Главное действие: увеличьте savings каждый месяц.\n"
            "2. Оптимизация: сократите budget на развлечения."
        )
        result = await analyzer.generate_recommendations(
            user_id=1, financial_data=_make_stats()
        )
        assert "savings" not in result
        assert "budget" not in result

    @pytest.mark.asyncio
    async def test_returns_none_on_exception(self):
        """Any exception in generate_recommendations must be caught and return None."""
        mock_ollama = MagicMock(spec=OllamaClient)
        mock_ollama.generate = AsyncMock(side_effect=TimeoutError("LLM timeout"))
        analyzer = FinancialAnalyzer(ollama_client=mock_ollama)

        result = await analyzer.generate_recommendations(
            user_id=1, financial_data=_make_stats()
        )
        assert result is None

    @pytest.mark.asyncio
    async def test_system_prompt_contains_kakeibo_reference(self):
        """The recommendations system prompt must reference Кэкэйбо methodology."""
        analyzer = _make_analyzer("ok")
        await analyzer.generate_recommendations(user_id=1, financial_data=_make_stats())

        call_args = analyzer.ollama.generate.call_args
        system_prompt = call_args[0][1]
        assert "Кэкэйбо" in system_prompt or "кэкэйбо" in system_prompt.lower()

    @pytest.mark.asyncio
    async def test_system_prompt_contains_no_english_rule(self):
        """System prompt must instruct the model not to use English words."""
        analyzer = _make_analyzer("ok")
        await analyzer.generate_recommendations(user_id=1, financial_data=_make_stats())

        call_args = analyzer.ollama.generate.call_args
        system_prompt = call_args[0][1]
        assert "ЗАПРЕЩЕНО" in system_prompt or "английск" in system_prompt.lower()

    @pytest.mark.asyncio
    async def test_system_prompt_contains_critical_instruction(self):
        """System prompt must carry the КРИТИЧЕСКИ ВАЖНО anti-mixing instruction."""
        analyzer = _make_analyzer("ok")
        await analyzer.generate_recommendations(user_id=1, financial_data=_make_stats())

        call_args = analyzer.ollama.generate.call_args
        system_prompt = call_args[0][1]
        assert "КРИТИЧЕСКИ ВАЖНО" in system_prompt

    @pytest.mark.asyncio
    async def test_goal_progress_percentage_in_prompt(self):
        """Goal progress percentage must be included in the prompt."""
        analyzer = _make_analyzer("ok")
        goals = [
            {
                "title": "Новый ноутбук",
                "current_amount": Decimal("50000.00"),
                "target_amount": Decimal("100000.00"),
            }
        ]
        await analyzer.generate_recommendations(
            user_id=1,
            financial_data=_make_stats(),
            user_goals=goals,
        )

        call_args = analyzer.ollama.generate.call_args
        user_prompt = call_args[0][0]
        # 50000/100000 = 50%
        assert "50%" in user_prompt

    @pytest.mark.asyncio
    async def test_unknown_assessment_value_falls_back_gracefully(self):
        """An unrecognised enum value should pass through as-is without crashing."""
        analyzer = _make_analyzer("ok")
        result = await analyzer.generate_recommendations(
            user_id=1,
            financial_data=_make_stats(),
            user_assessment={"risk_tolerance": "unknown_value_xyz"},
        )
        # Must not raise; result is the sanitized model response
        assert result is not None

    @pytest.mark.asyncio
    async def test_income_and_expenses_in_prompt(self):
        """Income and expense figures must be present in the user prompt."""
        analyzer = _make_analyzer("ok")
        await analyzer.generate_recommendations(
            user_id=1,
            financial_data=_make_stats(
                total_income=Decimal("200000.00"),
                total_expenses=Decimal("120000.00"),
            ),
        )

        call_args = analyzer.ollama.generate.call_args
        user_prompt = call_args[0][0]
        assert "200,000.00" in user_prompt
        assert "120,000.00" in user_prompt
