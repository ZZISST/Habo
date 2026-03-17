// User Authentication Types
export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at?: string;
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

// Financial Types
export interface Category {
  id: number;
  name: string;
  description?: string;
  category_type: "needs" | "wants" | "culture" | "unexpected" | "income";
  color?: string;
  icon?: string;
  user_id: number;
  created_at: string;
}

export interface CategoryCreate {
  name: string;
  description?: string;
  category_type: "needs" | "wants" | "culture" | "unexpected" | "income";
  color?: string;
  icon?: string;
}

export interface Transaction {
  id: number;
  amount: number;
  type: "expense" | "income";
  description?: string;
  category_id: number;
  category: Category;
  date: string;
  notes?: string;
  user_id: number;
  account?: Account;
  notebook_type: "small" | "big";
  is_planned: boolean;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: number;
  name: string;
  type: "checking" | "savings" | "credit";
  balance: number;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionCreate {
  amount: number;
  type: "expense" | "income";
  description?: string;
  category_id: number;
  date: string;
  notes?: string;
  notebook_type: "small" | "big";
  is_planned?: boolean;
  is_recurring?: boolean;
}

export interface Budget {
  id: number;
  category_id: number;
  category: Category;
  amount: number;
  period_start: string;
  period_end: string;
  spent: number;
  remaining: number;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetCreate {
  category_id: number;
  amount: number;
  period_start: string;
  period_end: string;
}

export interface FinancialGoal {
  id: number;
  title: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  category_id?: number;
  category?: Category;
  user_id: number;
  is_achieved: boolean;
  progress_percentage: number;
  priority?: number;
  created_at: string;
  updated_at: string;
}

export interface FinancialGoalCreate {
  title: string;
  description?: string;
  target_amount: number;
  target_date: string;
  category_id?: number;
  priority?: number;
}

// Dashboard Types
export interface ExpenseByCategoryData {
  category_name: string;
  category_type: string;
  total_amount: number;
  percentage_of_total: number;
  transaction_count: number;
  average_amount: number;
}

export interface BudgetSummary {
  total_budgeted: number;
  total_spent: number;
  remaining: number;
  utilization_rate: number;
  categories_summary: any[];
  over_budget_categories: string[];
}

// Analysis Types
export interface AnalysisRequest {
  period_start: string;
  period_end: string;
  include_predictions?: boolean;
  include_recommendations?: boolean;
  analysis_depth?: "basic" | "standard" | "detailed";
}

export interface AnalysisResponse {
  analysis_id: string;
  period_start: string;
  period_end: string;
  insights: string[];
  recommendations: string[];
  risk_assessment: string;
  confidence_score: number;
  generated_at: string;
}

export interface FinancialInsight {
  insight_type: string;
  description: string;
  impact_level: "low" | "medium" | "high";
  suggested_action?: string;
  data_points: Record<string, any>;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Chart Data Types
export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface MonthlySpendingData extends ChartDataPoint {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

// Dashboard Types
export interface DashboardData {
  total_balance: number;
  balance_change: number;
  total_income: number;
  income_change: number;
  total_expenses: number;
  expense_change: number;
  expense_by_category: Record<string, number>;
  monthly_trend?: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
  savings_rate?: number;
}

// API Response Types
export interface TransactionFilters {
  start_date?: string;
  end_date?: string;
  category_id?: number;
  type?: "income" | "expense";
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
}

export interface BudgetResponse {
  budgets: Budget[];
  total: number;
  page: number;
  limit: number;
}

// Form Types
export interface TransactionFormData {
  amount: string;
  type: "expense" | "income";
  description: string;
  category_id: string;
  date: string;
  notes: string;
  notebook_type: "small" | "big";
}

export interface BudgetFormData {
  category_id: string;
  amount: string;
  period_start: string;
  period_end: string;
}

export interface GoalFormData {
  name: string;
  description: string;
  target_amount: string;
  target_date: string;
  category_id: string;
}

// Filter Types
export interface DateFilter {
  start_date: string;
  end_date: string;
}

export interface TransactionFilter extends DateFilter {
  category_id?: number;
  transaction_type?: "expense" | "income";
  min_amount?: number;
  max_amount?: number;
}
