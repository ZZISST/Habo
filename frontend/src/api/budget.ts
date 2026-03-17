import { api } from './client';
import type {
  Budget,
  BudgetCreate,
  BudgetSummary
} from '@/types';

const isDemoMode = () => {
  const token = localStorage.getItem('access_token');
  return token?.startsWith('demo_token_');
};

const getDemoBudgets = (): Budget[] => [
  {
    id: 1,
    category_id: 1,
    category: { id: 1, name: 'Продукты', category_type: 'needs', user_id: 0, created_at: new Date().toISOString() },
    amount: 30000,
    spent: 22000,
    remaining: 8000,
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    user_id: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    category_id: 2,
    category: { id: 2, name: 'Транспорт', category_type: 'needs', user_id: 0, created_at: new Date().toISOString() },
    amount: 15000,
    spent: 12500,
    remaining: 2500,
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    user_id: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    category_id: 3,
    category: { id: 3, name: 'Развлечения', category_type: 'wants', user_id: 0, created_at: new Date().toISOString() },
    amount: 10000,
    spent: 11500,
    remaining: -1500,
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    user_id: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    category_id: 4,
    category: { id: 4, name: 'Подписки', category_type: 'wants', user_id: 0, created_at: new Date().toISOString() },
    amount: 3000,
    spent: 1500,
    remaining: 1500,
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    user_id: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const budgetService = {
  // Получить все бюджеты пользователя
  getBudgets: async (params?: {
    period_start?: string;
    period_end?: string;
  }): Promise<Budget[]> => {
    if (isDemoMode()) {
      return getDemoBudgets();
    }

    try {
      const response = await api.get<Budget[]>('/finance/budget/budgets', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching budgets:', error);
      return [];
    }
  },

  // Создать новый бюджет
  createBudget: async (data: BudgetCreate): Promise<Budget> => {
    if (isDemoMode()) {
      const demoCats = getDemoBudgets();
      return {
        id: Math.floor(Math.random() * 10000),
        category_id: data.category_id,
        category: demoCats[0]?.category || { id: data.category_id, name: 'Категория', category_type: 'needs', user_id: 0, created_at: new Date().toISOString() },
        amount: data.amount,
        spent: 0,
        remaining: data.amount,
        period_start: data.period_start,
        period_end: data.period_end,
        user_id: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    const response = await api.post<Budget>('/finance/budget/budgets', data);
    return response.data;
  },

  // Обновить бюджет
  updateBudget: async (id: number, data: Partial<BudgetCreate>): Promise<Budget> => {
    if (isDemoMode()) {
      const budgets = getDemoBudgets();
      const budget = budgets.find(b => b.id === id);
      return budget || ({} as Budget);
    }

    const response = await api.put<Budget>(`/finance/budget/budgets/${id}`, data);
    return response.data;
  },

  // Удалить бюджет
  deleteBudget: async (id: number): Promise<void> => {
    if (isDemoMode()) {
      return;
    }

    await api.delete(`/finance/budget/budgets/${id}`);
  },

  // Получить бюджет по ID
  getBudget: async (id: number): Promise<Budget> => {
    if (isDemoMode()) {
      const budgets = getDemoBudgets();
      const budget = budgets.find(b => b.id === id);
      return budget || ({} as Budget);
    }

    const response = await api.get<Budget>(`/finance/budget/budgets/${id}`);
    return response.data;
  },

  // Получить сводку по бюджету
  getBudgetSummary: async (period_start?: string, period_end?: string): Promise<BudgetSummary> => {
    if (isDemoMode()) {
      const budgets = getDemoBudgets();
      const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0);
      const totalSpent = budgets.reduce((s, b) => s + (b.spent || 0), 0);
      return {
        total_budgeted: totalBudgeted,
        total_spent: totalSpent,
        remaining: totalBudgeted - totalSpent,
        utilization_rate: totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0,
        categories_summary: [],
        over_budget_categories: budgets.filter(b => (b.spent || 0) > b.amount).map(b => b.category.name),
      };
    }

    const response = await api.get<BudgetSummary>('/finance/budget/budgets/summary', {
      params: { period_start, period_end }
    });
    return response.data;
  },

  // Получить анализ бюджета по категориям
  getBudgetAnalysis: async (period_start?: string, period_end?: string) => {
    if (isDemoMode()) {
      return {
        weekly_data: [],
        category_breakdown: [],
      };
    }

    try {
      const response = await api.get('/finance/dashboard/spending-trends', {
        params: { period_start, period_end }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching budget analysis:', error);
      return { weekly_data: [], category_breakdown: [] };
    }
  },
};
