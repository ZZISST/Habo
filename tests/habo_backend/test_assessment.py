import os
import sys

import pytest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from app.core.services.assessment_questions import (
    FINANCIAL_ASSESSMENT_QUESTIONS,
    calculate_assessment_score,
)

def _answer(question_id: str, answer) -> dict:
    return {"question_id": question_id, "answer": answer}


def _best_answer_for(question: dict) -> dict:
    """Return the answer with the highest weight for a given question dict."""
    if question["type"] == "multiple_choice":
        # Pick the single option with the highest weight wrapped in a list
        best_opt = max(question["options"], key=lambda o: o["weight"])
        return _answer(question["id"], [best_opt["value"]])
    best_opt = max(question["options"], key=lambda o: o["weight"])
    return _answer(question["id"], best_opt["value"])


def _worst_answer_for(question: dict) -> dict:
    """Return the answer with the lowest weight for a given question dict."""
    if question["type"] == "multiple_choice":
        worst_opt = min(question["options"], key=lambda o: o["weight"])
        return _answer(question["id"], [worst_opt["value"]])
    worst_opt = min(question["options"], key=lambda o: o["weight"])
    return _answer(question["id"], worst_opt["value"])


def _all_best_answers() -> list:
    return [_best_answer_for(q) for q in FINANCIAL_ASSESSMENT_QUESTIONS]


def _all_worst_answers() -> list:
    return [_worst_answer_for(q) for q in FINANCIAL_ASSESSMENT_QUESTIONS]

class TestQuestionsStructure:
    def test_questions_list_is_not_empty(self):
        assert len(FINANCIAL_ASSESSMENT_QUESTIONS) > 0

    def test_every_question_has_required_fields(self):
        for q in FINANCIAL_ASSESSMENT_QUESTIONS:
            assert "id" in q, f"Missing 'id' in question: {q}"
            assert "question" in q, f"Missing 'question' in question: {q}"
            assert "type" in q, f"Missing 'type' in question: {q}"
            assert "options" in q, f"Missing 'options' in question: {q}"
            assert "category" in q, f"Missing 'category' in question: {q}"

    def test_question_ids_are_unique(self):
        ids = [q["id"] for q in FINANCIAL_ASSESSMENT_QUESTIONS]
        assert len(ids) == len(set(ids)), "Duplicate question IDs found"

    def test_every_option_has_value_text_weight(self):
        for q in FINANCIAL_ASSESSMENT_QUESTIONS:
            for opt in q["options"]:
                assert "value" in opt
                assert "text" in opt
                assert "weight" in opt

    def test_all_weights_between_0_and_1(self):
        for q in FINANCIAL_ASSESSMENT_QUESTIONS:
            for opt in q["options"]:
                assert 0.0 <= opt["weight"] <= 1.0, (
                    f"Weight {opt['weight']} out of range in question '{q['id']}'"
                )

    def test_question_types_are_known(self):
        allowed = {"single_choice", "multiple_choice"}
        for q in FINANCIAL_ASSESSMENT_QUESTIONS:
            assert q["type"] in allowed, f"Unknown type '{q['type']}' in '{q['id']}'"

    def test_each_question_has_at_least_two_options(self):
        for q in FINANCIAL_ASSESSMENT_QUESTIONS:
            assert len(q["options"]) >= 2, (
                f"Question '{q['id']}' has fewer than 2 options"
            )

    def test_risk_tolerance_question_exists(self):
        cats = [q["category"] for q in FINANCIAL_ASSESSMENT_QUESTIONS]
        assert "risk_tolerance" in cats

    def test_income_stability_question_exists(self):
        cats = [q["category"] for q in FINANCIAL_ASSESSMENT_QUESTIONS]
        assert "income_stability" in cats

    def test_financial_experience_question_exists(self):
        cats = [q["category"] for q in FINANCIAL_ASSESSMENT_QUESTIONS]
        assert "financial_experience" in cats

class TestScoreReturnStructure:
    def test_returns_dict(self):
        result = calculate_assessment_score(_all_best_answers())
        assert isinstance(result, dict)

    def test_overall_score_present(self):
        result = calculate_assessment_score(_all_best_answers())
        assert "overall_score" in result

    def test_categories_present(self):
        result = calculate_assessment_score(_all_best_answers())
        assert "categories" in result

    def test_risk_tolerance_field_present(self):
        result = calculate_assessment_score(_all_best_answers())
        assert "risk_tolerance" in result

    def test_financial_experience_field_present(self):
        result = calculate_assessment_score(_all_best_answers())
        assert "financial_experience" in result

    def test_income_stability_field_present(self):
        result = calculate_assessment_score(_all_best_answers())
        assert "income_stability" in result

    def test_every_category_has_score_and_level(self):
        result = calculate_assessment_score(_all_best_answers())
        for cat_name, cat_data in result["categories"].items():
            assert "score" in cat_data, f"'score' missing for category '{cat_name}'"
            assert "level" in cat_data, f"'level' missing for category '{cat_name}'"

    def test_level_values_are_valid(self):
        valid_levels = {"low", "medium", "high"}
        result = calculate_assessment_score(_all_best_answers())
        for cat_name, cat_data in result["categories"].items():
            assert cat_data["level"] in valid_levels, (
                f"Invalid level '{cat_data['level']}' for '{cat_name}'"
            )
        assert result["risk_tolerance"] in valid_levels
        assert result["financial_experience"] in valid_levels
        assert result["income_stability"] in valid_levels

class TestScoreRanges:
    def test_overall_score_between_0_and_100(self):
        result = calculate_assessment_score(_all_best_answers())
        assert 0 <= result["overall_score"] <= 100

    def test_best_answers_produce_high_score(self):
        """All best answers should yield a score significantly above 50."""
        result = calculate_assessment_score(_all_best_answers())
        assert result["overall_score"] > 70, (
            f"Expected >70 for perfect answers, got {result['overall_score']}"
        )

    def test_worst_answers_produce_low_score(self):
        """All worst answers should yield a score significantly below 50."""
        result = calculate_assessment_score(_all_worst_answers())
        assert result["overall_score"] < 30, (
            f"Expected <30 for all-worst answers, got {result['overall_score']}"
        )

    def test_best_score_greater_than_worst_score(self):
        best = calculate_assessment_score(_all_best_answers())["overall_score"]
        worst = calculate_assessment_score(_all_worst_answers())["overall_score"]
        assert best > worst

    def test_empty_answers_returns_zero_score(self):
        result = calculate_assessment_score([])
        assert result["overall_score"] == 0.0

    def test_score_is_rounded_to_one_decimal(self):
        result = calculate_assessment_score(_all_best_answers())
        # Check that it's rounded to at most 1 decimal place
        assert result["overall_score"] == round(result["overall_score"], 1)

class TestLevelClassification:
    """
    The internal get_level() function uses:
        >= 0.8  → "high"
        >= 0.6  → "medium"
        else    → "low"
    We verify this via the derived top-level fields.
    """

    def test_risk_tolerance_high_when_best_risk_answer(self):
        # "high_risk" option has weight=1.0 → should map to "high"
        answers = [_answer("risk_tolerance", "high_risk")]
        result = calculate_assessment_score(answers)
        assert result["risk_tolerance"] == "high"

    def test_risk_tolerance_low_when_worst_risk_answer(self):
        # "no_risk" option has weight=0.1 → should map to "low"
        answers = [_answer("risk_tolerance", "no_risk")]
        result = calculate_assessment_score(answers)
        assert result["risk_tolerance"] == "low"

    def test_income_stability_high_when_salary_answer(self):
        # "salary" has weight=1.0 → income_stability "high"
        answers = [_answer("income_source", "salary")]
        result = calculate_assessment_score(answers)
        assert result["income_stability"] == "high"

    def test_income_stability_low_when_investments_answer(self):
        # "investments" has weight=0.4 → income_stability "low"
        answers = [_answer("income_source", "investments")]
        result = calculate_assessment_score(answers)
        assert result["income_stability"] == "low"

    def test_financial_experience_high_when_expert_answer(self):
        # "expert" has weight=1.0 → financial_experience "high"
        answers = [_answer("investment_experience", "expert")]
        result = calculate_assessment_score(answers)
        assert result["financial_experience"] == "high"

    def test_financial_experience_low_when_no_experience(self):
        # "none" has weight=0.1 → financial_experience "low"
        answers = [_answer("investment_experience", "none")]
        result = calculate_assessment_score(answers)
        assert result["financial_experience"] == "low"

    def test_medium_level_boundary(self):
        # "moderate_risk" has weight=0.7 → should be "medium" (0.6 <= 0.7 < 0.8)
        answers = [_answer("risk_tolerance", "moderate_risk")]
        result = calculate_assessment_score(answers)
        assert result["risk_tolerance"] == "medium"

class TestMultipleChoiceAveraging:
    def test_single_selection_uses_its_weight(self):
        # financial_goals: "retirement" has weight=1.0
        answers = [_answer("financial_goals", ["retirement"])]
        result = calculate_assessment_score(answers)
        cat_score = result["categories"]["goals_priority"]["score"]
        assert abs(cat_score - 1.0) < 0.001

    def test_two_selections_averaged(self):
        # "retirement" = 1.0, "travel" = 0.5 → avg = 0.75
        answers = [_answer("financial_goals", ["retirement", "travel"])]
        result = calculate_assessment_score(answers)
        cat_score = result["categories"]["goals_priority"]["score"]
        assert abs(cat_score - 0.75) < 0.001

    def test_all_options_selected_average(self):
        mc_question = next(
            q for q in FINANCIAL_ASSESSMENT_QUESTIONS if q["type"] == "multiple_choice"
        )
        all_values = [opt["value"] for opt in mc_question["options"]]
        expected_avg = sum(opt["weight"] for opt in mc_question["options"]) / len(
            mc_question["options"]
        )

        answers = [_answer(mc_question["id"], all_values)]
        result = calculate_assessment_score(answers)
        category = mc_question["category"]
        cat_score = result["categories"][category]["score"]
        assert abs(cat_score - expected_avg) < 0.001

class TestEdgeCases:
    def test_unknown_question_id_ignored(self):
        """An answer to a non-existent question should not raise an error."""
        answers = [_answer("nonexistent_question_id", "some_value")]
        result = calculate_assessment_score(answers)
        assert isinstance(result["overall_score"], float)

    def test_unknown_answer_value_ignored(self):
        """An answer whose value does not match any option should be silently skipped."""
        answers = [_answer("risk_tolerance", "ultra_risk_doesnt_exist")]
        result = calculate_assessment_score(answers)
        # risk_tolerance category score should remain at its default (0)
        assert result["categories"]["risk_tolerance"]["score"] == 0

    def test_partial_answers_still_return_valid_structure(self):
        """Only answering 3 out of 10 questions must not crash."""
        partial = [
            _answer("income_source", "salary"),
            _answer("emergency_fund", "6months_plus"),
            _answer("debt_situation", "no_debt"),
        ]
        result = calculate_assessment_score(partial)
        assert 0 <= result["overall_score"] <= 100
        assert "categories" in result

    def test_duplicate_answers_last_one_wins(self):
        """If the same question is answered twice the second answer is applied."""
        answers = [
            _answer("risk_tolerance", "high_risk"),  # weight 1.0
            _answer("risk_tolerance", "no_risk"),  # weight 0.1 — overwrites
        ]
        result = calculate_assessment_score(answers)
        # The category score should reflect the second answer (0.1 → "low")
        assert result["risk_tolerance"] == "low"

    def test_mixed_real_and_unknown_answers(self):
        """Mix of valid and garbage answers should process without error."""
        answers = [
            _answer("risk_tolerance", "moderate_risk"),
            _answer("GARBAGE_ID", "some_val"),
            _answer("income_source", "salary"),
        ]
        result = calculate_assessment_score(answers)
        assert result["income_stability"] == "high"
        assert result["risk_tolerance"] == "medium"
