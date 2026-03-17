import { api } from "./client";
import type { FinancialGoal, FinancialGoalCreate } from "@/types";

const isDemoMode = () => {
  const token = localStorage.getItem("access_token");
  return token?.startsWith("demo_token_");
};

const getDemoGoals = (): FinancialGoal[] => [
  {
    id: 1,
    title: "Отпуск в Турции",
    description: "Накопить на семейный отпуск",
    target_amount: 200000,
    current_amount: 120000,
    target_date: "2026-08-01",
    user_id: 0,
    is_achieved: false,
    progress_percentage: 60,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    title: "Резервный фонд",
    description: "Финансовая подушка на 6 месяцев",
    target_amount: 600000,
    current_amount: 350000,
    target_date: "2026-12-31",
    user_id: 0,
    is_achieved: false,
    progress_percentage: 58.3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    title: "Новый ноутбук",
    description: "MacBook Pro для работы",
    target_amount: 150000,
    current_amount: 150000,
    target_date: "2026-03-01",
    user_id: 0,
    is_achieved: true,
    progress_percentage: 100,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    title: "Курс английского",
    description: "Оплата годового курса",
    target_amount: 80000,
    current_amount: 25000,
    target_date: "2026-09-01",
    user_id: 0,
    is_achieved: false,
    progress_percentage: 31.25,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// In-memory store for demo mode so mutations persist during the session
let demoGoalsStore: FinancialGoal[] | null = null;

function getDemoStore(): FinancialGoal[] {
  if (!demoGoalsStore) {
    demoGoalsStore = getDemoGoals();
  }
  return demoGoalsStore;
}

export const goalService = {
  // Получить все финансовые цели пользователя
  getGoals: async (): Promise<FinancialGoal[]> => {
    if (isDemoMode()) {
      return [...getDemoStore()];
    }

    try {
      const response = await api.get<FinancialGoal[]>(
        "/finance/analysis/goals",
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching goals:", error);
      return [];
    }
  },

  // Создать новую финансовую цель
  createGoal: async (data: FinancialGoalCreate): Promise<FinancialGoal> => {
    if (isDemoMode()) {
      const store = getDemoStore();
      const newGoal: FinancialGoal = {
        id: Math.floor(Math.random() * 100000),
        title: data.title,
        description: data.description,
        target_amount: data.target_amount,
        current_amount: 0,
        target_date: data.target_date,
        category_id: data.category_id,
        user_id: 0,
        is_achieved: false,
        progress_percentage: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.push(newGoal);
      return newGoal;
    }

    // Ensure target_date is a full ISO datetime string (backend expects datetime, not date)
    const payload = {
      ...data,
      target_date: data.target_date.includes("T")
        ? data.target_date
        : `${data.target_date}T23:59:59`,
    };

    const response = await api.post<FinancialGoal>(
      "/finance/analysis/goals",
      payload,
    );
    return response.data;
  },

  // Обновить финансовую цель
  updateGoal: async (
    id: number,
    data: Partial<FinancialGoalCreate>,
  ): Promise<FinancialGoal> => {
    if (isDemoMode()) {
      const store = getDemoStore();
      const index = store.findIndex((g) => g.id === id);
      if (index !== -1) {
        const goal = store[index];
        const updated: FinancialGoal = {
          ...goal,
          ...data,
          target_amount: data.target_amount ?? goal.target_amount,
          progress_percentage:
            goal.target_amount > 0
              ? (goal.current_amount /
                  (data.target_amount ?? goal.target_amount)) *
                100
              : 0,
          is_achieved:
            goal.current_amount >= (data.target_amount ?? goal.target_amount),
          updated_at: new Date().toISOString(),
        };
        store[index] = updated;
        return updated;
      }
      return {} as FinancialGoal;
    }

    const response = await api.put<FinancialGoal>(
      `/finance/analysis/goals/${id}`,
      data,
    );
    return response.data;
  },

  // Удалить финансовую цель
  deleteGoal: async (id: number): Promise<void> => {
    if (isDemoMode()) {
      const store = getDemoStore();
      const index = store.findIndex((g) => g.id === id);
      if (index !== -1) {
        store.splice(index, 1);
      }
      return;
    }

    await api.delete(`/finance/analysis/goals/${id}`);
  },

  // Получить финансовую цель по ID
  getGoal: async (id: number): Promise<FinancialGoal> => {
    if (isDemoMode()) {
      const store = getDemoStore();
      const goal = store.find((g) => g.id === id);
      return goal || ({} as FinancialGoal);
    }

    const response = await api.get<FinancialGoal>(
      `/finance/analysis/goals/${id}`,
    );
    return response.data;
  },

  // Обновить прогресс по цели
  updateGoalProgress: async (
    id: number,
    amount: number,
  ): Promise<FinancialGoal> => {
    if (isDemoMode()) {
      const store = getDemoStore();
      const index = store.findIndex((g) => g.id === id);
      if (index !== -1) {
        const goal = store[index];
        const newCurrent = goal.current_amount + amount;
        const updated: FinancialGoal = {
          ...goal,
          current_amount: newCurrent,
          progress_percentage:
            goal.target_amount > 0
              ? Math.min((newCurrent / goal.target_amount) * 100, 100)
              : 0,
          is_achieved: newCurrent >= goal.target_amount,
          updated_at: new Date().toISOString(),
        };
        store[index] = updated;
        return updated;
      }
      return {} as FinancialGoal;
    }

    const response = await api.post<FinancialGoal>(
      `/finance/analysis/goals/${id}/progress`,
      { amount },
    );
    return response.data;
  },

  // Получить статистику по целям
  getGoalsProgress: async () => {
    if (isDemoMode()) {
      const store = getDemoStore();
      const totalTarget = store.reduce((sum, g) => sum + g.target_amount, 0);
      const totalCurrent = store.reduce((sum, g) => sum + g.current_amount, 0);
      return {
        total_goals: store.length,
        achieved_goals: store.filter((g) => g.is_achieved).length,
        active_goals: store.filter((g) => !g.is_achieved).length,
        total_target: totalTarget,
        total_current: totalCurrent,
        overall_progress:
          totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0,
      };
    }

    try {
      const response = await api.get("/finance/analysis/goals/progress");
      return response.data;
    } catch (error) {
      console.error("Error fetching goals progress:", error);
      return {
        total_goals: 0,
        achieved_goals: 0,
        active_goals: 0,
        total_target: 0,
        total_current: 0,
        overall_progress: 0,
      };
    }
  },
};
