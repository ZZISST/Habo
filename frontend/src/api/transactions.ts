import { api } from "./client";
import type {
  Transaction,
  TransactionCreate,
  Category,
  CategoryCreate,
  PaginatedResponse,
} from "@/types";

const isDemoMode = () => {
  const token = localStorage.getItem("access_token");
  return token?.startsWith("demo_token_");
};

const getDemoCategories = (): Category[] => [
  // Expense categories
  {
    id: 1,
    name: "Продукты",
    category_type: "needs",
    color: "#4CAF50",
    icon: "🍎",
    user_id: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Транспорт",
    category_type: "needs",
    color: "#FF9800",
    icon: "🚗",
    user_id: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: "Развлечения",
    category_type: "wants",
    color: "#9C27B0",
    icon: "🎉",
    user_id: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 4,
    name: "ЖКХ",
    category_type: "needs",
    color: "#2196F3",
    icon: "🏠",
    user_id: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 5,
    name: "Здоровье",
    category_type: "needs",
    color: "#F44336",
    icon: "💊",
    user_id: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 6,
    name: "Одежда",
    category_type: "wants",
    color: "#E91E63",
    icon: "👕",
    user_id: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 7,
    name: "Образование",
    category_type: "culture",
    color: "#3F51B5",
    icon: "📚",
    user_id: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 8,
    name: "Экстренные расходы",
    category_type: "unexpected",
    color: "#795548",
    icon: "⚡",
    user_id: 0,
    created_at: new Date().toISOString(),
  },
  // Income categories
  {
    id: 100,
    name: "Зарплата",
    category_type: "income",
    color: "#4CAF50",
    icon: "💰",
    user_id: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 101,
    name: "Подработка",
    category_type: "income",
    color: "#8BC34A",
    icon: "💼",
    user_id: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 102,
    name: "Подарок",
    category_type: "income",
    color: "#CDDC39",
    icon: "🎁",
    user_id: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 103,
    name: "Инвестиции",
    category_type: "income",
    color: "#009688",
    icon: "📈",
    user_id: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 104,
    name: "Прочие доходы",
    category_type: "income",
    color: "#00BCD4",
    icon: "💵",
    user_id: 0,
    created_at: new Date().toISOString(),
  },
];

const getDemoTransactions = (): Transaction[] => [
  {
    id: 1,
    user_id: 0,
    category_id: 1,
    amount: 4500,
    type: "expense",
    description: "Покупки в магазине",
    date: new Date().toISOString(),
    category: {
      id: 1,
      name: "Продукты",
      category_type: "needs",
      color: "#4CAF50",
      icon: "🍎",
      user_id: 0,
      created_at: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    notebook_type: "small",
    is_planned: false,
    is_recurring: false,
  },
  {
    id: 2,
    user_id: 0,
    category_id: 2,
    amount: 1200,
    type: "expense",
    description: "Бензин",
    date: new Date(Date.now() - 86400000).toISOString(),
    category: {
      id: 2,
      name: "Транспорт",
      category_type: "needs",
      color: "#FF9800",
      icon: "🚗",
      user_id: 0,
      created_at: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    notebook_type: "small",
    is_planned: false,
    is_recurring: false,
  },
  {
    id: 3,
    user_id: 0,
    category_id: 100,
    amount: 120000,
    type: "income",
    description: "Зарплата",
    date: new Date(Date.now() - 172800000).toISOString(),
    category: {
      id: 100,
      name: "Зарплата",
      category_type: "income",
      color: "#4CAF50",
      icon: "💰",
      user_id: 0,
      created_at: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    notebook_type: "big",
    is_planned: true,
    is_recurring: true,
  },
  {
    id: 4,
    user_id: 0,
    category_id: 3,
    amount: 3500,
    type: "expense",
    description: "Кино и ресторан",
    date: new Date(Date.now() - 259200000).toISOString(),
    category: {
      id: 3,
      name: "Развлечения",
      category_type: "wants",
      color: "#9C27B0",
      icon: "🎉",
      user_id: 0,
      created_at: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    notebook_type: "small",
    is_planned: false,
    is_recurring: false,
  },
  {
    id: 5,
    user_id: 0,
    category_id: 101,
    amount: 25000,
    type: "income",
    description: "Фриланс-проект",
    date: new Date(Date.now() - 345600000).toISOString(),
    category: {
      id: 101,
      name: "Подработка",
      category_type: "income",
      color: "#8BC34A",
      icon: "💼",
      user_id: 0,
      created_at: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    notebook_type: "big",
    is_planned: false,
    is_recurring: false,
  },
];

/**
 * Maps frontend TransactionCreate fields to the backend schema.
 * Frontend uses `type` and `date`, backend expects `transaction_type` and `transaction_date`.
 */
function mapToBackendTransaction(
  data: TransactionCreate,
): Record<string, unknown> {
  return {
    category_id: data.category_id,
    amount: data.amount,
    transaction_type: data.type,
    notebook_type: data.notebook_type,
    description: data.description || "",
    notes: data.notes || null,
    transaction_date: data.date
      ? new Date(data.date).toISOString()
      : new Date().toISOString(),
    is_planned: data.is_planned ?? false,
    is_recurring: data.is_recurring ?? false,
  };
}

/**
 * Maps a backend transaction response to the frontend Transaction type.
 * Backend returns `transaction_type` and `transaction_date`; frontend expects `type` and `date`.
 */
function mapFromBackendTransaction(raw: Record<string, any>): Transaction {
  return {
    id: raw.id,
    user_id: raw.user_id,
    category_id: raw.category_id,
    amount: raw.amount,
    type: raw.transaction_type ?? raw.type,
    description: raw.description,
    date: raw.transaction_date ?? raw.date,
    notes: raw.notes,
    category: raw.category,
    notebook_type: raw.notebook_type,
    is_planned: raw.is_planned,
    is_recurring: raw.is_recurring,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

export const transactionService = {
  // Получить все транзакции пользователя
  getTransactions: async (params?: {
    skip?: number;
    limit?: number;
    category_id?: number;
    transaction_type?: "income" | "expense";
    start_date?: string;
    end_date?: string;
    search?: string;
  }): Promise<PaginatedResponse<Transaction> | Transaction[]> => {
    if (isDemoMode()) {
      return getDemoTransactions();
    }

    try {
      const response = await api.get<any>("/finance/transactions/", { params });
      // Map each transaction from backend format
      if (Array.isArray(response.data)) {
        return response.data.map(mapFromBackendTransaction);
      }
      if (response.data?.items) {
        return {
          ...response.data,
          items: response.data.items.map(mapFromBackendTransaction),
        };
      }
      return response.data;
    } catch (error) {
      return getDemoTransactions();
    }
  },

  // Создать новую транзакцию
  createTransaction: async (data: TransactionCreate): Promise<Transaction> => {
    if (isDemoMode()) {
      const cats = getDemoCategories();
      const matchedCat = cats.find((c) => c.id === data.category_id) || cats[0];
      return {
        id: Math.floor(Math.random() * 100000),
        user_id: 0,
        category_id: data.category_id,
        amount: data.amount,
        type: data.type,
        description: data.description || "",
        date: data.date || new Date().toISOString(),
        category: matchedCat,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notebook_type: data.notebook_type,
        is_planned: data.is_planned || false,
        is_recurring: data.is_recurring || false,
      };
    }

    try {
      const payload = mapToBackendTransaction(data);
      const response = await api.post<any>("/finance/transactions/", payload);
      return mapFromBackendTransaction(response.data);
    } catch (error) {
      throw error;
    }
  },

  // Обновить транзакцию
  updateTransaction: async (
    id: number,
    data: Partial<TransactionCreate>,
  ): Promise<Transaction> => {
    if (isDemoMode()) {
      const transactions = getDemoTransactions();
      const trans = transactions.find((t) => t.id === id);
      return trans || ({} as Transaction);
    }

    try {
      // Map fields for the update payload too
      const payload: Record<string, unknown> = {};
      if (data.amount !== undefined) payload.amount = data.amount;
      if (data.category_id !== undefined)
        payload.category_id = data.category_id;
      if (data.type !== undefined) payload.transaction_type = data.type;
      if (data.notebook_type !== undefined)
        payload.notebook_type = data.notebook_type;
      if (data.description !== undefined)
        payload.description = data.description;
      if (data.notes !== undefined) payload.notes = data.notes;
      if (data.date !== undefined)
        payload.transaction_date = new Date(data.date).toISOString();
      if (data.is_planned !== undefined) payload.is_planned = data.is_planned;
      if (data.is_recurring !== undefined)
        payload.is_recurring = data.is_recurring;

      const response = await api.put<any>(
        `/finance/transactions/${id}`,
        payload,
      );
      return mapFromBackendTransaction(response.data);
    } catch (error) {
      throw error;
    }
  },

  // Удалить транзакцию
  deleteTransaction: async (id: number): Promise<void> => {
    if (isDemoMode()) {
      return;
    }

    try {
      await api.delete(`/finance/transactions/${id}`);
    } catch (error) {
      throw error;
    }
  },

  // Получить транзакцию по ID
  getTransaction: async (id: number): Promise<Transaction> => {
    if (isDemoMode()) {
      const transactions = getDemoTransactions();
      const trans = transactions.find((t) => t.id === id);
      return trans || ({} as Transaction);
    }

    try {
      const response = await api.get<any>(`/finance/transactions/${id}`);
      return mapFromBackendTransaction(response.data);
    } catch (error) {
      throw error;
    }
  },

  // Получить сводку транзакций
  getTransactionsSummary: async (start_date?: string, end_date?: string) => {
    if (isDemoMode()) {
      return {
        total_income: 145000,
        total_expenses: 98000,
        count: 25,
        avg_transaction: 5000,
      };
    }

    try {
      const response = await api.get("/finance/dashboard/summary", {
        params: { start_date, end_date },
      });
      return response.data;
    } catch (error) {
      return {};
    }
  },
};

export const categoryAPI = {
  // Получить все категории пользователя
  getCategories: async (): Promise<Category[]> => {
    if (isDemoMode()) {
      return getDemoCategories();
    }

    try {
      const response = await api.get<Category[]>("/finance/budget/categories");
      return response.data;
    } catch (error) {
      return getDemoCategories();
    }
  },

  // Создать новую категорию
  createCategory: async (data: CategoryCreate): Promise<Category> => {
    if (isDemoMode()) {
      return {
        id: Math.floor(Math.random() * 100000),
        name: data.name,
        category_type: data.category_type,
        color: data.color || "#000000",
        user_id: 0,
        created_at: new Date().toISOString(),
      };
    }

    try {
      const response = await api.post<Category>(
        "/finance/budget/categories",
        data,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Обновить категорию
  updateCategory: async (
    id: number,
    data: Partial<CategoryCreate>,
  ): Promise<Category> => {
    if (isDemoMode()) {
      const categories = getDemoCategories();
      const cat = categories.find((c) => c.id === id);
      return cat || ({} as Category);
    }

    try {
      const response = await api.put<Category>(
        `/finance/budget/categories/${id}`,
        data,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Удалить категорию
  deleteCategory: async (id: number): Promise<void> => {
    if (isDemoMode()) {
      return;
    }

    try {
      await api.delete(`/finance/budget/categories/${id}`);
    } catch (error) {
      throw error;
    }
  },

  // Получить категорию по ID
  getCategory: async (id: number): Promise<Category> => {
    if (isDemoMode()) {
      const categories = getDemoCategories();
      const cat = categories.find((c) => c.id === id);
      return cat || ({} as Category);
    }

    try {
      const response = await api.get<Category>(
        `/finance/budget/categories/${id}`,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
