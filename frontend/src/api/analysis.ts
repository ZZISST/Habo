import { api } from "./client";
import type {
  AnalysisRequest,
  AnalysisResponse,
  FinancialInsight,
} from "@/types";

const isDemoMode = () => {
  const token = localStorage.getItem("access_token");
  return token?.startsWith("demo_token_");
};

const getEmptyInsights = (): FinancialInsight[] => [];

interface Recommendation {
  id: number;
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  category: string;
  potentialSavings?: number;
}

const getEmptyRecommendations = (): Recommendation[] => [];

interface RiskAssessment {
  level: "low" | "medium" | "high";
  description: string;
  factors: string[];
}

/**
 * Normalize a single item from the backend recommendations array
 * into a FinancialInsight. The backend may return rule-based objects
 * with `insight_type`, `description`, `impact_level`, etc., or plain
 * strings, or AI-generated objects with different shapes.
 */
function normalizeToInsight(item: any, _index: number): FinancialInsight {
  if (typeof item === "string") {
    return {
      insight_type: "general",
      description: item,
      impact_level: "medium",
      suggested_action: undefined,
      data_points: {},
    };
  }
  // Rule-based format already matches FinancialInsight
  if (item.insight_type && item.description) {
    return {
      insight_type: item.insight_type,
      description: item.description,
      impact_level: item.impact_level || "medium",
      suggested_action: item.suggested_action,
      data_points: item.data_points || {},
    };
  }
  // Fallback – treat title/description as a generic insight
  return {
    insight_type: item.category || "general",
    description: item.title || item.description || "Рекомендация",
    impact_level: item.impact_level || item.impact || "medium",
    suggested_action: item.suggested_action || item.description || undefined,
    data_points: item.data_points || {},
  };
}

/**
 * Normalize a single item from the backend recommendations array
 * into a Recommendation card.
 */
function normalizeToRecommendation(item: any, index: number): Recommendation {
  if (typeof item === "string") {
    return {
      id: index + 1,
      title: item,
      description: item,
      impact: "medium",
      category: "general",
      potentialSavings: 0,
    };
  }
  // Rule-based insight object
  if (item.insight_type && item.description) {
    return {
      id: index + 1,
      title: item.description,
      description: item.suggested_action || item.description,
      impact: item.impact_level || "medium",
      category: item.insight_type || "general",
      potentialSavings: item.data_points?.potentialSavings || 0,
    };
  }
  return {
    id: item.id || index + 1,
    title: item.title || "Рекомендация",
    description: item.description || "",
    impact: (item.impact as "low" | "medium" | "high") || "medium",
    category: item.category || "general",
    potentialSavings: item.potentialSavings || 0,
  };
}

const getDemoInsights = (): FinancialInsight[] => [
  {
    insight_type: "spending_pattern",
    description:
      "Ваши расходы на развлечения выросли на 25% по сравнению с прошлым месяцем",
    impact_level: "medium",
    suggested_action: "Рассмотрите возможность установить лимит на развлечения",
    data_points: { current: 25000, previous: 20000, change: 25 },
  },
  {
    insight_type: "savings_opportunity",
    description: "Обнаружены повторяющиеся подписки на похожие сервисы",
    impact_level: "low",
    suggested_action:
      "Проверьте необходимость всех подписок и отмените неиспользуемые",
    data_points: {
      subscriptions: ["Netflix", "Кинопоиск", "IVI"],
      total: 1500,
    },
  },
  {
    insight_type: "budget_warning",
    description: "Бюджет на продукты использован на 85% — осталось 4500 ₽",
    impact_level: "high",
    suggested_action: "Скорректируйте план покупок до конца месяца",
    data_points: { budget: 30000, spent: 25500, remaining: 4500 },
  },
  {
    insight_type: "positive_trend",
    description:
      "Отличная работа! Вы сэкономили на 15% больше, чем в прошлом месяце",
    impact_level: "low",
    suggested_action:
      "Продолжайте в том же духе и рассмотрите инвестирование сбережений",
    data_points: { savings: 32000, previous_savings: 27800 },
  },
];

const getDemoRecommendations = (): Recommendation[] => [
  {
    id: 1,
    title: "Оптимизируйте расходы на транспорт",
    description:
      "Рассмотрите покупку проездного на месяц — это сэкономит до 2000 ₽",
    impact: "medium",
    category: "transport",
    potentialSavings: 2000,
  },
  {
    id: 2,
    title: "Пересмотрите подписки",
    description:
      "У вас 3 подписки на стриминговые сервисы. Оставьте только используемые",
    impact: "low",
    category: "subscriptions",
    potentialSavings: 500,
  },
  {
    id: 3,
    title: "Создайте резервный фонд",
    description: "Рекомендуем откладывать 10% дохода на непредвиденные расходы",
    impact: "high",
    category: "savings",
    potentialSavings: 12000,
  },
  {
    id: 4,
    title: "Используйте кэшбэк",
    description:
      "С банковской картой с кэшбэком вы могли бы вернуть до 3000 ₽ в месяц",
    impact: "medium",
    category: "optimization",
    potentialSavings: 3000,
  },
];

const getDemoRiskAssessment = (): RiskAssessment => ({
  level: "medium",
  description:
    "Ваше финансовое состояние стабильно, но есть области для улучшения",
  factors: [
    "Отсутствует резервный фонд на 3-6 месяцев",
    "Высокая доля расходов на необязательные категории",
    "Нерегулярные накопления",
  ],
});

export const analysisService = {
  // Запустить AI анализ финансов
  requestAnalysis: async (data: AnalysisRequest): Promise<AnalysisResponse> => {
    if (isDemoMode()) {
      return {
        analysis_id: "demo_" + Date.now(),
        period_start: data.period_start,
        period_end: data.period_end,
        insights: [
          "Ваши расходы на развлечения выросли на 25% по сравнению с прошлым месяцем",
          "Обнаружены повторяющиеся подписки на похожие сервисы",
        ],
        recommendations: ["Отличная работа!", "Продолжайте откладывать деньги"],
        risk_assessment: "low",
        confidence_score: 0.95,
        generated_at: new Date().toISOString(),
      };
    }

    try {
      const response = await api.post<AnalysisResponse>(
        "/finance/analysis/ai-analysis",
        {
          period_start: data.period_start,
          period_end: data.period_end,
          include_recommendations: true,
        },
      );
      return response.data;
    } catch (error) {
      return {
        analysis_id: "",
        period_start: data.period_start,
        period_end: data.period_end,
        insights: [],
        recommendations: [],
        risk_assessment: "unknown",
        confidence_score: 0,
        generated_at: new Date().toISOString(),
      };
    }
  },

  // Получить все анализы пользователя
  getAnalysis: async (): Promise<AnalysisResponse> => {
    if (isDemoMode()) {
      return {
        analysis_id: "demo",
        period_start: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        period_end: new Date().toISOString(),
        insights: [
          "Ваши расходы на развлечения выросли на 25% по сравнению с прошлым месяцем",
          "Обнаружены повторяющиеся подписки на похожие сервисы",
        ],
        recommendations: ["Отличная работа!"],
        risk_assessment: "low",
        confidence_score: 0.85,
        generated_at: new Date().toISOString(),
      };
    }

    try {
      const response = await api.get<AnalysisResponse>(
        "/finance/analysis/analyses/latest",
      );
      return response.data;
    } catch (error) {
      return {
        analysis_id: "",
        period_start: "",
        period_end: "",
        insights: [],
        recommendations: [],
        risk_assessment: "unknown",
        confidence_score: 0,
        generated_at: new Date().toISOString(),
      };
    }
  },

  // Получить инсайты — always returns FinancialInsight[]
  getInsights: async (_limit?: number): Promise<FinancialInsight[]> => {
    if (isDemoMode()) {
      return getDemoInsights();
    }

    try {
      const response = await api.get<any>(
        "/finance/dashboard/recommendations",
        {
          params: { limit: _limit },
        },
      );
      // Extract the array from whichever shape the backend returns
      let items: any[] = [];
      if (Array.isArray(response.data)) {
        items = response.data;
      } else if (
        response.data?.recommendations &&
        Array.isArray(response.data.recommendations)
      ) {
        items = response.data.recommendations;
      }
      return items.map(normalizeToInsight);
    } catch (error: any) {
      // 503 means AI unavailable — not a fatal error, just no data yet
      if (error?.response?.status === 503) {
        console.warn("AI recommendations service unavailable");
      } else {
        console.error("Error fetching insights:", error);
      }
      return getEmptyInsights();
    }
  },

  // Получить рекомендации — always returns Recommendation[]
  getRecommendations: async (
    _category_type?: string,
  ): Promise<Recommendation[]> => {
    if (isDemoMode()) {
      return getDemoRecommendations();
    }

    try {
      const response = await api.get("/finance/dashboard/recommendations", {
        params: { category_type: _category_type },
      });
      // Extract the array from whichever shape the backend returns
      let items: any[] = [];
      if (Array.isArray(response.data)) {
        items = response.data;
      } else if (
        response.data?.recommendations &&
        Array.isArray(response.data.recommendations)
      ) {
        items = response.data.recommendations;
      }
      return items.map(normalizeToRecommendation);
    } catch (error: any) {
      if (error?.response?.status === 503) {
        console.warn("AI recommendations service unavailable");
      } else {
        console.error("Error fetching recommendations:", error);
      }
      return getEmptyRecommendations();
    }
  },

  // Получить оценку рисков — always returns RiskAssessment | null
  getRiskAnalysis: async (): Promise<RiskAssessment | null> => {
    if (isDemoMode()) {
      return getDemoRiskAssessment();
    }

    try {
      const response = await api.get("/finance/dashboard/quick-stats");
      const data = response.data;

      // If the response directly has a risk level field, use it
      if (data?.level) {
        return {
          level: data.level,
          description: data.description || "Ваше финансовое состояние в норме",
          factors: data.factors || [],
        };
      }

      // Otherwise, derive a basic risk assessment from financial data
      const currentMonth = data?.current_month;
      if (currentMonth) {
        const income = parseFloat(currentMonth.income) || 0;
        const expenses = parseFloat(currentMonth.expenses) || 0;
        const savingsRate =
          income > 0 ? ((income - expenses) / income) * 100 : 0;

        const factors: string[] = [];
        let level: "low" | "medium" | "high" = "low";

        if (savingsRate < 0) {
          level = "high";
          factors.push("Расходы превышают доходы в этом месяце");
        } else if (savingsRate < 10) {
          level = "medium";
          factors.push("Норма сбережений ниже 10%");
        }

        if (expenses > 0 && income === 0) {
          level = "high";
          factors.push("Не зафиксировано доходов за текущий месяц");
        }

        if (factors.length === 0) {
          factors.push("Финансовые показатели в пределах нормы");
        }

        const descriptions: Record<string, string> = {
          low: "Ваше финансовое состояние стабильно",
          medium: "Есть области для улучшения в управлении финансами",
          high: "Требуется внимание к вашему финансовому положению",
        };

        return {
          level,
          description: descriptions[level],
          factors,
        };
      }

      return null;
    } catch (error) {
      console.error("Error fetching risk analysis:", error);
      return null;
    }
  },

  // Получить персонализированные советы
  getPersonalizedAdvice: async () => {
    if (isDemoMode()) {
      return {
        advice: [
          "Продолжайте откладывать деньги",
          "Контролируйте расходы на развлечения",
        ],
      };
    }

    try {
      const response = await api.get("/finance/dashboard/spending-trends");
      return response.data;
    } catch (error) {
      return { advice: [] };
    }
  },

  // Запрос на глубокий анализ (через AI анализ)
  requestDeepAnalysis: async (period_months: number = 6) => {
    if (isDemoMode()) {
      // Simulate a brief delay for demo realism
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const demoInsights = getDemoInsights();
      const demoRecs = getDemoRecommendations();

      return {
        status: "completed",
        situation_analysis:
          "ОЦЕНКА:\nВаши финансы в хорошем состоянии. Норма сбережений выше среднего.\n\n" +
          "СТРУКТУРА РАСХОДОВ:\n" +
          "- Продукты: основная категория расходов (35%)\n" +
          "- Развлечения: выросли на 25% по сравнению с прошлым месяцем\n" +
          "- Транспорт: стабильные расходы в пределах нормы\n\n" +
          "РЕКОМЕНДАЦИИ:\n" +
          "- Установите лимит на развлечения для контроля роста расходов\n" +
          "- Проверьте подписки на стриминговые сервисы — возможна экономия\n" +
          "- Рассмотрите создание резервного фонда на 3-6 месяцев",
        recommendations: demoRecs.map((r) => ({
          insight_type: r.category,
          description: r.title,
          impact_level: r.impact,
          suggested_action: r.description,
          data_points: { potentialSavings: r.potentialSavings },
        })),
        deep_insights: demoInsights,
        trends: ["declining", "stable"],
        source: "demo",
        summary:
          "Ваши финансы в хорошем состоянии! Продолжайте вести учёт по методу Кэкэйбо.",
      };
    }

    try {
      const end_date = new Date();
      const start_date = new Date();
      start_date.setMonth(start_date.getMonth() - period_months);

      const response = await api.post("/finance/analysis/ai-analysis", {
        period_start: start_date.toISOString(),
        period_end: end_date.toISOString(),
        include_recommendations: true,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
