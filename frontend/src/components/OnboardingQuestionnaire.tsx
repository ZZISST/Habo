import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading";
import { api } from "@/api/client";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Brain,
  Target,
  Shield,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

interface OnboardingQuestionnaireProps {
  onComplete: (result: AssessmentResult) => void;
  onSkip?: () => void;
}

export interface AssessmentResult {
  score: number;
  risk_tolerance: string;
  financial_experience: string;
  income_stability: string;
  recommendations: string;
  categories: Record<string, { score: number; level: string }>;
}

interface QuestionOption {
  value: string;
  text: string;
  weight: number;
}

interface Question {
  id: string;
  question: string;
  type: "single_choice" | "multiple_choice";
  options: QuestionOption[];
  category: string;
  icon: React.ReactNode;
}

const ASSESSMENT_QUESTIONS: Question[] = [
  {
    id: "income_source",
    question: "Каков ваш основной источник дохода?",
    type: "single_choice",
    options: [
      { value: "salary", text: "Постоянная зарплата", weight: 1.0 },
      { value: "freelance", text: "Фриланс/проектная работа", weight: 0.8 },
      { value: "business", text: "Собственный бизнес", weight: 0.6 },
      {
        value: "investments",
        text: "Инвестиции и дивиденды",
        weight: 0.4,
      },
      { value: "mixed", text: "Несколько источников", weight: 0.7 },
    ],
    category: "income_stability",
    icon: <Wallet className="h-6 w-6 text-green-500" />,
  },
  {
    id: "monthly_income",
    question: "Какой у вас примерный ежемесячный доход после налогов?",
    type: "single_choice",
    options: [
      { value: "under_50k", text: "До 50 000 руб.", weight: 0.3 },
      { value: "50k_100k", text: "50 000 – 100 000 руб.", weight: 0.5 },
      { value: "100k_200k", text: "100 000 – 200 000 руб.", weight: 0.7 },
      { value: "200k_500k", text: "200 000 – 500 000 руб.", weight: 0.9 },
      { value: "over_500k", text: "Свыше 500 000 руб.", weight: 1.0 },
    ],
    category: "financial_capacity",
    icon: <TrendingUp className="h-6 w-6 text-blue-500" />,
  },
  {
    id: "spending_tracking",
    question: "Как часто вы отслеживаете свои расходы?",
    type: "single_choice",
    options: [
      {
        value: "daily",
        text: "Каждый день записываю траты",
        weight: 1.0,
      },
      { value: "weekly", text: "Проверяю еженедельно", weight: 0.8 },
      { value: "monthly", text: "Анализирую раз в месяц", weight: 0.6 },
      { value: "rarely", text: "Редко слежу за тратами", weight: 0.3 },
      { value: "never", text: "Не отслеживаю", weight: 0.1 },
    ],
    category: "financial_discipline",
    icon: <Target className="h-6 w-6 text-purple-500" />,
  },
  {
    id: "emergency_fund",
    question: "Есть ли у вас финансовая подушка безопасности?",
    type: "single_choice",
    options: [
      {
        value: "6months_plus",
        text: "Да, на 6+ месяцев расходов",
        weight: 1.0,
      },
      {
        value: "3to6_months",
        text: "На 3–6 месяцев расходов",
        weight: 0.8,
      },
      {
        value: "1to3_months",
        text: "На 1–3 месяца расходов",
        weight: 0.6,
      },
      { value: "minimal", text: "Есть небольшая сумма", weight: 0.4 },
      {
        value: "none",
        text: "Нет подушки безопасности",
        weight: 0.1,
      },
    ],
    category: "financial_security",
    icon: <Shield className="h-6 w-6 text-yellow-500" />,
  },
  {
    id: "investment_experience",
    question: "Каков ваш опыт инвестирования?",
    type: "single_choice",
    options: [
      {
        value: "expert",
        text: "Активно инвестирую несколько лет",
        weight: 1.0,
      },
      { value: "intermediate", text: "Есть базовый опыт", weight: 0.7 },
      {
        value: "beginner",
        text: "Только начинаю изучать",
        weight: 0.4,
      },
      {
        value: "bank_only",
        text: "Только банковские депозиты",
        weight: 0.3,
      },
      { value: "none", text: "Не инвестирую", weight: 0.1 },
    ],
    category: "financial_experience",
    icon: <TrendingUp className="h-6 w-6 text-indigo-500" />,
  },
  {
    id: "risk_tolerance",
    question: "Как вы относитесь к финансовым рискам?",
    type: "single_choice",
    options: [
      {
        value: "high_risk",
        text: "Готов рисковать ради высокой доходности",
        weight: 1.0,
      },
      {
        value: "moderate_risk",
        text: "Умеренные риски приемлемы",
        weight: 0.7,
      },
      {
        value: "low_risk",
        text: "Предпочитаю минимальные риски",
        weight: 0.4,
      },
      { value: "no_risk", text: "Избегаю любых рисков", weight: 0.1 },
    ],
    category: "risk_tolerance",
    icon: <AlertTriangle className="h-6 w-6 text-orange-500" />,
  },
  {
    id: "financial_goals",
    question: "Какие у вас главные финансовые цели? (можно выбрать несколько)",
    type: "multiple_choice",
    options: [
      {
        value: "emergency_fund",
        text: "Создать подушку безопасности",
        weight: 0.8,
      },
      {
        value: "house_purchase",
        text: "Накопить на жилье",
        weight: 0.9,
      },
      {
        value: "retirement",
        text: "Подготовиться к пенсии",
        weight: 1.0,
      },
      {
        value: "education",
        text: "Оплатить образование (себе/детям)",
        weight: 0.7,
      },
      {
        value: "business",
        text: "Открыть свой бизнес",
        weight: 0.8,
      },
      { value: "travel", text: "Путешествовать", weight: 0.5 },
      {
        value: "luxury",
        text: "Покупка дорогих вещей",
        weight: 0.3,
      },
    ],
    category: "goals_priority",
    icon: <Target className="h-6 w-6 text-emerald-500" />,
  },
  {
    id: "spending_impulse",
    question: "Как часто вы совершаете спонтанные покупки?",
    type: "single_choice",
    options: [
      {
        value: "never",
        text: "Никогда — все покупки планирую",
        weight: 1.0,
      },
      { value: "rarely", text: "Очень редко", weight: 0.8 },
      {
        value: "sometimes",
        text: "Иногда покупаю что-то спонтанно",
        weight: 0.6,
      },
      { value: "often", text: "Довольно часто", weight: 0.3 },
      {
        value: "always",
        text: "Постоянно покупаю импульсивно",
        weight: 0.1,
      },
    ],
    category: "spending_habits",
    icon: <Sparkles className="h-6 w-6 text-pink-500" />,
  },
  {
    id: "budget_planning",
    question: "Планируете ли вы свой бюджет заранее?",
    type: "single_choice",
    options: [
      {
        value: "detailed",
        text: "Детально планирую на месяц вперёд",
        weight: 1.0,
      },
      {
        value: "general",
        text: "Делаю общий план расходов",
        weight: 0.7,
      },
      {
        value: "weekly",
        text: "Планирую только на неделю",
        weight: 0.5,
      },
      {
        value: "minimal",
        text: "Минимальное планирование",
        weight: 0.3,
      },
      { value: "none", text: "Не планирую бюджет", weight: 0.1 },
    ],
    category: "planning_skills",
    icon: <Brain className="h-6 w-6 text-cyan-500" />,
  },
  {
    id: "debt_situation",
    question: "Есть ли у вас долговые обязательства?",
    type: "single_choice",
    options: [
      { value: "no_debt", text: "Нет долгов", weight: 1.0 },
      {
        value: "mortgage_only",
        text: "Только ипотека",
        weight: 0.8,
      },
      {
        value: "manageable",
        text: "Есть долги, но контролируемые",
        weight: 0.6,
      },
      {
        value: "significant",
        text: "Значительная долговая нагрузка",
        weight: 0.3,
      },
      {
        value: "overwhelming",
        text: "Долги превышают доходы",
        weight: 0.1,
      },
    ],
    category: "debt_management",
    icon: <Shield className="h-6 w-6 text-red-500" />,
  },
];

const isDemoMode = () => {
  const token = localStorage.getItem("access_token");
  return token?.startsWith("demo_token_");
};

function calculateLocalScore(
  answers: Record<string, string | string[]>,
): AssessmentResult {
  const categoryWeights: Record<string, number> = {
    income_stability: 1.2,
    financial_capacity: 1.0,
    financial_discipline: 1.3,
    financial_security: 1.5,
    financial_experience: 0.8,
    risk_tolerance: 0.7,
    goals_priority: 0.9,
    spending_habits: 1.0,
    planning_skills: 1.1,
    debt_management: 1.4,
  };

  const categoryScores: Record<string, number> = {};

  for (const question of ASSESSMENT_QUESTIONS) {
    const answer = answers[question.id];
    if (!answer) continue;

    if (question.type === "single_choice") {
      const opt = question.options.find((o) => o.value === answer);
      if (opt) {
        categoryScores[question.category] = opt.weight;
      }
    } else if (question.type === "multiple_choice") {
      const selected = Array.isArray(answer) ? answer : [answer];
      const weights = selected
        .map((v) => question.options.find((o) => o.value === v)?.weight ?? 0)
        .filter((w) => w > 0);
      if (weights.length > 0) {
        categoryScores[question.category] =
          weights.reduce((a, b) => a + b, 0) / weights.length;
      }
    }
  }

  let weightedScore = 0;
  let totalWeight = 0;
  for (const [cat, score] of Object.entries(categoryScores)) {
    const w = categoryWeights[cat] ?? 1.0;
    weightedScore += score * w;
    totalWeight += w;
  }

  const overallScore =
    totalWeight > 0
      ? Math.round((weightedScore / totalWeight) * 100 * 10) / 10
      : 0;

  const getLevel = (s: number) =>
    s >= 0.8 ? "high" : s >= 0.5 ? "medium" : "low";

  const categories: Record<string, { score: number; level: string }> = {};
  for (const [cat, score] of Object.entries(categoryScores)) {
    categories[cat] = { score, level: getLevel(score) };
  }

  const riskTolerance = getLevel(categoryScores.risk_tolerance ?? 0.5);
  const financialExperience = getLevel(
    categoryScores.financial_experience ?? 0.3,
  );
  const incomeStability = getLevel(categoryScores.income_stability ?? 0.5);

  let recommendations = "";
  if (overallScore >= 80) {
    recommendations =
      "Вы отлично управляете финансами! Рассмотрите инвестирование и стратегическое планирование.";
  } else if (overallScore >= 60) {
    recommendations =
      "Хорошая финансовая основа. Сосредоточьтесь на создании подушки безопасности и оптимизации расходов.";
  } else if (overallScore >= 40) {
    recommendations =
      "Есть потенциал для улучшения. Начните с отслеживания расходов и создания бюджета по методу Кэкэйбо.";
  } else {
    recommendations =
      "Рекомендуем начать с основ: ведите записи всех трат в малой тетради Кэкэйбо и поставьте первую финансовую цель.";
  }

  return {
    score: overallScore,
    risk_tolerance: riskTolerance,
    financial_experience: financialExperience,
    income_stability: incomeStability,
    recommendations,
    categories,
  };
}

export function OnboardingQuestionnaire({
  onComplete,
  onSkip,
}: OnboardingQuestionnaireProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);

  const totalSteps = ASSESSMENT_QUESTIONS.length;
  const currentQuestion = ASSESSMENT_QUESTIONS[currentStep];
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const isCurrentAnswered = () => {
    const answer = answers[currentQuestion.id];
    if (!answer) return false;
    if (Array.isArray(answer)) return answer.length > 0;
    return answer !== "";
  };

  const handleSingleSelect = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleMultiSelect = (value: string) => {
    setAnswers((prev) => {
      const current = (prev[currentQuestion.id] as string[]) || [];
      if (current.includes(value)) {
        return {
          ...prev,
          [currentQuestion.id]: current.filter((v) => v !== value),
        };
      }
      return {
        ...prev,
        [currentQuestion.id]: [...current, value],
      };
    });
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Build the answers payload matching FinancialAssessmentAnswer schema
    const assessmentAnswers = ASSESSMENT_QUESTIONS.map((q) => {
      const answer = answers[q.id];
      const answerStr = Array.isArray(answer) ? answer.join(",") : answer || "";
      const option = q.options.find((o) => o.value === answerStr);
      return {
        question_id: q.id,
        question_text: q.question,
        answer: answerStr,
        weight: option?.weight ?? 1.0,
      };
    }).filter((a) => a.answer !== "");

    // Calculate local score first (always available, even if API fails)
    const localResult = calculateLocalScore(answers);

    if (!isDemoMode()) {
      try {
        const response = await api.post("/finance/analysis/assessment", {
          answers: assessmentAnswers,
        });
        // If the backend returns enriched data, merge it
        if (response.data) {
          const backendData = response.data;
          if (backendData.score) {
            localResult.score = backendData.score;
          }
          if (backendData.risk_tolerance) {
            localResult.risk_tolerance = backendData.risk_tolerance;
          }
          if (backendData.financial_experience) {
            localResult.financial_experience = backendData.financial_experience;
          }
          if (backendData.income_stability) {
            localResult.income_stability = backendData.income_stability;
          }
          if (backendData.recommendations) {
            localResult.recommendations = backendData.recommendations;
          }
        }
      } catch (error) {
        console.error("Error submitting assessment to backend:", error);
        // Continue with local result — the user still gets their score
      }
    }

    setResult(localResult);
    setShowResult(true);
    setIsSubmitting(false);
  };

  const handleFinish = () => {
    if (result) {
      onComplete(result);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-blue-100";
    if (score >= 40) return "bg-yellow-100";
    return "bg-red-100";
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case "high":
        return "Высокий";
      case "medium":
        return "Средний";
      case "low":
        return "Низкий";
      default:
        return level;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "high":
        return "bg-green-100 text-green-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "low":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const categoryLabels: Record<string, string> = {
    income_stability: "Стабильность дохода",
    financial_capacity: "Финансовые возможности",
    financial_discipline: "Финансовая дисциплина",
    financial_security: "Финансовая безопасность",
    financial_experience: "Финансовый опыт",
    risk_tolerance: "Толерантность к рискам",
    goals_priority: "Приоритеты целей",
    spending_habits: "Привычки трат",
    planning_skills: "Навыки планирования",
    debt_management: "Управление долгами",
  };

  // ─── Results Screen ───────────────────────────────────────────
  if (showResult && result) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <Card className="w-full max-w-2xl p-8 my-8">
          <div className="text-center mb-8">
            <div
              className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${getScoreBg(result.score)} mb-4`}
            >
              <span
                className={`text-3xl font-bold ${getScoreColor(result.score)}`}
              >
                {result.score}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Ваш финансовый профиль
            </h2>
            <p className="text-gray-600">
              На основе ваших ответов мы подготовили персональные рекомендации
            </p>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Риск-профиль</p>
              <Badge className={getLevelColor(result.risk_tolerance)}>
                {getLevelLabel(result.risk_tolerance)}
              </Badge>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Фин. опыт</p>
              <Badge className={getLevelColor(result.financial_experience)}>
                {getLevelLabel(result.financial_experience)}
              </Badge>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Стабильность</p>
              <Badge className={getLevelColor(result.income_stability)}>
                {getLevelLabel(result.income_stability)}
              </Badge>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Детальная оценка по категориям
            </h3>
            <div className="space-y-3">
              {Object.entries(result.categories).map(([cat, data]) => (
                <div
                  key={cat}
                  className="grid items-center gap-3"
                  style={{ gridTemplateColumns: "180px 1fr 80px" }}
                >
                  <span className="text-sm text-gray-600">
                    {categoryLabels[cat] || cat}
                  </span>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        data.level === "high"
                          ? "bg-green-500"
                          : data.level === "medium"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{
                        width: `${Math.max(data.score * 100, 5)}%`,
                      }}
                    />
                  </div>
                  <Badge
                    className={`text-xs justify-center ${getLevelColor(data.level)}`}
                  >
                    {getLevelLabel(data.level)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">
                  Рекомендации для вас
                </h4>
                <p className="text-sm text-blue-800">
                  {result.recommendations}
                </p>
              </div>
            </div>
          </div>

          <Button onClick={handleFinish} className="w-full" size="lg">
            <CheckCircle className="h-5 w-5 mr-2" />
            Начать работу с Habo
          </Button>
        </Card>
      </div>
    );
  }

  // ─── Question Screen ──────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Финансовый опрос
            </h2>
            <span className="text-sm text-gray-500">
              {currentStep + 1} из {totalSteps}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Метод Кэкэйбо — ваш путь к осознанному управлению финансами
          </p>
        </div>

        {/* Question */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            {currentQuestion.icon}
            <h3 className="text-lg font-semibold text-gray-900">
              {currentQuestion.question}
            </h3>
          </div>

          {currentQuestion.type === "multiple_choice" && (
            <p className="text-sm text-gray-500 -mt-3">
              Можно выбрать несколько вариантов
            </p>
          )}

          <div className="space-y-2">
            {currentQuestion.options.map((option) => {
              const isSelected =
                currentQuestion.type === "multiple_choice"
                  ? ((answers[currentQuestion.id] as string[]) || []).includes(
                      option.value,
                    )
                  : answers[currentQuestion.id] === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() =>
                    currentQuestion.type === "multiple_choice"
                      ? handleMultiSelect(option.value)
                      : handleSingleSelect(option.value)
                  }
                  className={`w-full flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all text-left ${
                    isSelected
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-5 h-5 ${
                      currentQuestion.type === "multiple_choice"
                        ? "rounded"
                        : "rounded-full"
                    } border-2 flex items-center justify-center ${
                      isSelected
                        ? "border-blue-600 bg-blue-600"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <CheckCircle className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span className="text-gray-900">{option.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between gap-4 mt-8 pt-6 border-t border-gray-200">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Назад
            </Button>
            {onSkip && (
              <Button
                variant="ghost"
                onClick={onSkip}
                className="text-gray-400"
              >
                Пропустить
              </Button>
            )}
          </div>

          <Button
            onClick={handleNext}
            disabled={!isCurrentAnswered() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Анализируем...
              </>
            ) : currentStep === totalSteps - 1 ? (
              <>
                <CheckCircle className="h-4 w-4 mr-1" />
                Завершить
              </>
            ) : (
              <>
                Далее
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
