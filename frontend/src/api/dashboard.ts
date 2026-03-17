import { api } from "./client";
import type {
  DashboardData,
  ExpenseByCategoryData,
  MonthlySpendingData,
} from "@/types";

const isDemoMode = () => {
  const token = localStorage.getItem("access_token");
  return token?.startsWith("demo_token_");
};

const getDemoDashboardData = (): DashboardData => ({
  total_balance: 32000,
  balance_change: 5.2,
  total_income: 150000,
  income_change: 2.1,
  total_expenses: 118000,
  expense_change: -3.5,
  expense_by_category: {
    Продукты: 45000,
    Транспорт: 18000,
    Развлечения: 25000,
    ЖКХ: 12000,
    Подписки: 5000,
    Здоровье: 8000,
    Остальное: 5000,
  },
  monthly_trend: [
    { month: "2026-01-01", income: 120000, expenses: 95000 },
    { month: "2026-02-01", income: 125000, expenses: 88000 },
    { month: "2026-03-01", income: 150000, expenses: 118000 },
  ],
  savings_rate: 21.3,
});

export const dashboardService = {
  // Получить данные дашборда
  getDashboard: async (period?: string): Promise<DashboardData> => {
    if (isDemoMode()) {
      return getDemoDashboardData();
    }

    try {
      const response = await api.get<any>("/finance/dashboard/quick-stats", {
        params: { period },
      });
      const data = response.data;

      // Transform quick-stats response to DashboardData format
      const currentMonth = data.current_month || {};
      const totalIncome = parseFloat(currentMonth.income) || 0;
      const totalExpenses = parseFloat(currentMonth.expenses) || 0;
      const savings = parseFloat(currentMonth.savings) || 0;
      const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

      // Parse expense_by_category from backend (already keyed by name)
      const expenseByCategory: Record<string, number> = {};
      if (
        data.expense_by_category &&
        typeof data.expense_by_category === "object"
      ) {
        for (const [key, val] of Object.entries(data.expense_by_category)) {
          expenseByCategory[key] = parseFloat(val as string) || 0;
        }
      }

      // Parse monthly_trend from backend
      const monthlyTrend = Array.isArray(data.monthly_trend)
        ? data.monthly_trend.map((t: any) => ({
            month: t.month,
            income: parseFloat(t.income) || 0,
            expenses: parseFloat(t.expenses) || 0,
          }))
        : [];

      return {
        total_balance: savings,
        balance_change: 0,
        total_income: totalIncome,
        income_change: 0,
        total_expenses: totalExpenses,
        expense_change: 0,
        expense_by_category: expenseByCategory,
        monthly_trend: monthlyTrend,
        savings_rate: savingsRate,
      };
    } catch (error) {
      // Return demo data on error
      return getDemoDashboardData();
    }
  },

  // Получить расходы по категориям
  getExpensesByCategory: async (
    start_date?: string,
    end_date?: string,
  ): Promise<ExpenseByCategoryData[]> => {
    if (isDemoMode()) {
      return [
        {
          category_name: "Продукты",
          category_type: "needs",
          total_amount: 45000,
          percentage_of_total: 38,
          transaction_count: 25,
          average_amount: 1800,
        },
        {
          category_name: "Транспорт",
          category_type: "needs",
          total_amount: 18000,
          percentage_of_total: 15,
          transaction_count: 12,
          average_amount: 1500,
        },
        {
          category_name: "Развлечения",
          category_type: "wants",
          total_amount: 25000,
          percentage_of_total: 21,
          transaction_count: 18,
          average_amount: 1389,
        },
        {
          category_name: "ЖКХ",
          category_type: "needs",
          total_amount: 12000,
          percentage_of_total: 10,
          transaction_count: 2,
          average_amount: 6000,
        },
        {
          category_name: "Подписки",
          category_type: "wants",
          total_amount: 5000,
          percentage_of_total: 4,
          transaction_count: 8,
          average_amount: 625,
        },
      ];
    }

    try {
      const response = await api.get<any>(
        "/finance/dashboard/spending-trends",
        {
          params: { start_date, end_date },
        },
      );
      return response.data.category_breakdown || [];
    } catch (error) {
      return [];
    }
  },

  // Получить месячную статистику
  getMonthlyStats: async (year?: number): Promise<MonthlySpendingData[]> => {
    if (isDemoMode()) {
      return [
        {
          month: "2026-01",
          expenses: 95000,
          income: 120000,
          savings: 25000,
          name: "Jan",
          value: 95000,
        },
        {
          month: "2026-02",
          expenses: 88000,
          income: 125000,
          savings: 37000,
          name: "Feb",
          value: 88000,
        },
        {
          month: "2026-03",
          expenses: 118000,
          income: 150000,
          savings: 32000,
          name: "Mar",
          value: 118000,
        },
      ];
    }

    try {
      const response = await api.get<any>(
        "/finance/dashboard/spending-trends",
        {
          params: { year },
        },
      );
      return response.data.weekly_data || [];
    } catch (error) {
      return [];
    }
  },

  // Получить финансовое здоровье
  getFinancialHealth: async () => {
    if (isDemoMode()) {
      return {
        health_score: 8.5,
        status: "good",
        recommendations: [
          "Отличная работа с бюджетом!",
          "Продолжайте откладывать деньги",
        ],
      };
    }

    try {
      const response = await api.get("/finance/dashboard/summary");
      return response.data;
    } catch (error) {
      return { health_score: 0, status: "unknown", recommendations: [] };
    }
  },

  // Получить тренды трат
  getSpendingTrends: async (months?: number) => {
    if (isDemoMode()) {
      return {
        trend: "decreasing",
        insights: ["Расходы снижаются", "Хорошая динамика"],
      };
    }

    try {
      const response = await api.get("/finance/dashboard/spending-trends", {
        params: { months },
      });
      return response.data;
    } catch (error) {
      return { trend: "stable", insights: [] };
    }
  },

  // Получить прогноз бюджета
  getBudgetForecast: async () => {
    if (isDemoMode()) {
      return {
        forecast: 118000,
        confidence: 0.85,
        trend: "stable",
      };
    }

    try {
      const response = await api.get("/finance/dashboard/summary");
      return response.data;
    } catch (error) {
      return { forecast: 0, confidence: 0, trend: "unknown" };
    }
  },
};
