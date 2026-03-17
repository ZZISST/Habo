import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { dashboardService } from "@/api/dashboard";
import { transactionService } from "@/api/transactions";
import { budgetService } from "@/api/budget";
import { api } from "@/api/client";
import { FinancialCard } from "@/components/ui/financial-card";
import { LoadingSpinner } from "@/components/ui/loading";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { CustomPieChart, CustomLineChart } from "@/components/ui/charts";
import {
  OnboardingQuestionnaire,
  type AssessmentResult,
} from "@/components/OnboardingQuestionnaire";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Target,
  Plus,
  MoreVertical,
  Eye,
  EyeOff,
  ClipboardCheck,
  Brain,
} from "lucide-react";
import type { DashboardData, Transaction, Budget } from "@/types";

const isDemoMode = () => {
  const token = localStorage.getItem("access_token");
  return token?.startsWith("demo_token_");
};

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentCompleted, setAssessmentCompleted] = useState<
    boolean | null
  >(null);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    total_balance: 0,
    balance_change: 0,
    total_income: 0,
    income_change: 0,
    total_expenses: 0,
    expense_change: 0,
    expense_by_category: {},
    monthly_trend: [],
    savings_rate: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    [],
  );
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date(),
  });

  // Check if user has completed financial assessment
  useEffect(() => {
    const checkAssessment = async () => {
      // Check localStorage first for quick UI
      const localFlag = localStorage.getItem(
        `assessment_completed_${user?.id ?? "demo"}`,
      );
      if (localFlag === "true") {
        setAssessmentCompleted(true);
        return;
      }

      if (isDemoMode()) {
        setAssessmentCompleted(false);
        return;
      }

      try {
        const response = await api.get("/finance/analysis/assessment");
        if (response.data && response.data.id) {
          setAssessmentCompleted(true);
          localStorage.setItem(
            `assessment_completed_${user?.id ?? "demo"}`,
            "true",
          );
        } else {
          setAssessmentCompleted(false);
        }
      } catch {
        setAssessmentCompleted(false);
      }
    };
    checkAssessment();
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [dateRange, user]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const period = `${dateRange.start.toISOString().split("T")[0]}_${dateRange.end.toISOString().split("T")[0]}`;
      const [dashboard, transactions, budgetsData] = await Promise.all([
        dashboardService.getDashboard(period),
        transactionService.getTransactions({
          limit: 5,
          start_date: dateRange.start.toISOString().split("T")[0],
          end_date: dateRange.end.toISOString().split("T")[0],
        }),
        budgetService.getBudgets({
          period_start: dateRange.start.toISOString().split("T")[0],
          period_end: dateRange.end.toISOString().split("T")[0],
        }),
      ]);

      setDashboardData(
        dashboard || {
          total_balance: 0,
          balance_change: 0,
          total_income: 0,
          income_change: 0,
          total_expenses: 0,
          expense_change: 0,
          expense_by_category: {},
          monthly_trend: [],
          savings_rate: 0,
        },
      );
      // Handle both array and paginated response formats
      const transactionItems = Array.isArray(transactions)
        ? transactions
        : transactions.items || [];
      setRecentTransactions(transactionItems);
      // Budgets should be an array
      const budgetItems = Array.isArray(budgetsData) ? budgetsData : [];
      setBudgets(budgetItems.slice(0, 3)); // Show only 3 budgets
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      // Set default empty state instead of null
      setDashboardData({
        total_balance: 0,
        balance_change: 0,
        total_income: 0,
        income_change: 0,
        total_expenses: 0,
        expense_change: 0,
        expense_by_category: {},
        monthly_trend: [],
        savings_rate: 0,
      });
      setRecentTransactions([]);
      setBudgets([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssessmentComplete = (result: AssessmentResult) => {
    setShowAssessment(false);
    setAssessmentCompleted(true);
    localStorage.setItem(`assessment_completed_${user?.id ?? "demo"}`, "true");
    console.log("Assessment completed with score:", result.score);
  };

  const handleAssessmentSkip = () => {
    setShowAssessment(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getBalanceDisplay = (amount: number) => {
    return balanceVisible ? formatCurrency(amount) : "••••••";
  };

  const expensesByCategory = Object.entries(
    dashboardData.expense_by_category || {},
  ).map(([name, value]) => ({ name, value }));

  const monthlyTrend =
    dashboardData.monthly_trend?.map((trend) => ({
      name: new Date(trend.month).toLocaleDateString("ru-RU", {
        month: "short",
      }),
      income: trend.income,
      expenses: trend.expenses,
    })) || [];

  return (
    <div className="space-y-6 p-6">
      {/* Financial Assessment Modal */}
      {showAssessment && (
        <OnboardingQuestionnaire
          onComplete={handleAssessmentComplete}
          onSkip={handleAssessmentSkip}
        />
      )}

      {/* Assessment Prompt Banner */}
      {assessmentCompleted === false && !showAssessment && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Пройдите финансовый опрос
                </h3>
                <p className="text-sm text-gray-600">
                  Ответьте на 10 вопросов для персонализированных рекомендаций
                  по методу Кэкэйбо
                </p>
              </div>
            </div>
            <Button onClick={() => setShowAssessment(true)} size="sm">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Начать опрос
            </Button>
          </div>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Добро пожаловать, {user?.first_name || user?.username}!
          </h1>
          <p className="text-gray-600 mt-1">
            Ваша финансовая сводка за выбранный период
          </p>
        </div>

        <div className="flex items-center gap-4">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button onClick={loadDashboardData} variant="outline">
            Обновить
          </Button>
        </div>
      </div>

      {/* Main Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FinancialCard
          title="Общий баланс"
          value={getBalanceDisplay(dashboardData.total_balance)}
          change={{
            value: dashboardData.balance_change,
            type: dashboardData.balance_change >= 0 ? "positive" : "negative",
          }}
          icon={Wallet}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBalanceVisible(!balanceVisible)}
            >
              {balanceVisible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          }
        />

        <FinancialCard
          title="Доходы за период"
          value={formatCurrency(dashboardData.total_income)}
          change={{
            value: dashboardData.income_change,
            type: dashboardData.income_change >= 0 ? "positive" : "negative",
          }}
          icon={TrendingUp}
          color="green"
        />

        <FinancialCard
          title="Расходы за период"
          value={formatCurrency(dashboardData.total_expenses)}
          change={{
            value: dashboardData.expense_change,
            type: dashboardData.expense_change >= 0 ? "negative" : "positive",
          }}
          icon={TrendingDown}
          color="red"
        />

        <FinancialCard
          title="Экономия"
          value={formatCurrency(
            dashboardData.total_income - dashboardData.total_expenses,
          )}
          change={{
            value:
              ((dashboardData.total_income - dashboardData.total_expenses) /
                dashboardData.total_income) *
              100,
            type:
              dashboardData.total_income - dashboardData.total_expenses >= 0
                ? "positive"
                : "negative",
            format: "percent",
          }}
          icon={Target}
          color="blue"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Distribution */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Расходы по категориям
            </h3>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>

          {expensesByCategory.length > 0 ? (
            <CustomPieChart
              data={expensesByCategory}
              height={300}
              valueFormatter={formatCurrency}
            />
          ) : (
            <div className="h-300 flex items-center justify-center text-gray-500">
              Нет данных за выбранный период
            </div>
          )}
        </Card>

        {/* Monthly Trend */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Тренд доходов и расходов
            </h3>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>

          {monthlyTrend.length > 0 ? (
            <CustomLineChart
              data={monthlyTrend}
              height={300}
              valueFormatter={formatCurrency}
              lines={[
                { key: "income", color: "#10b981", name: "Доходы" },
                { key: "expenses", color: "#f59e0b", name: "Расходы" },
              ]}
            />
          ) : (
            <div className="h-300 flex items-center justify-center text-gray-500">
              Нет данных за выбранный период
            </div>
          )}
        </Card>
      </div>

      {/* Recent Transactions & Budgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Последние транзакции
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/transactions")}
            >
              Все транзакции
            </Button>
          </div>

          <div className="space-y-4">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-full ${
                        transaction.type === "income"
                          ? "bg-green-100"
                          : "bg-red-100"
                      }`}
                    >
                      <CreditCard
                        className={`h-4 w-4 ${
                          transaction.type === "income"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {transaction.description}
                      </p>
                      <p className="text-sm text-gray-500">
                        {transaction.category.name} •{" "}
                        {new Date(transaction.date).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        transaction.type === "income"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Нет транзакций за выбранный период</p>
                <Button
                  className="mt-4"
                  size="sm"
                  onClick={() => navigate("/transactions")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить транзакцию
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Budget Overview */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Бюджеты</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/budget")}
            >
              Управление бюджетами
            </Button>
          </div>

          <div className="space-y-4">
            {budgets.length > 0 ? (
              budgets.map((budget) => {
                const spent = budget.spent || 0;
                const percentage = (spent / budget.amount) * 100;
                const isOverBudget = percentage > 100;

                return (
                  <div key={budget.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">
                        {budget.category.name}
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          isOverBudget ? "text-red-600" : "text-gray-600"
                        }`}
                      >
                        {formatCurrency(spent)} /{" "}
                        {formatCurrency(budget.amount)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isOverBudget ? "bg-red-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{percentage.toFixed(1)}% потрачено</span>
                      {isOverBudget && (
                        <span className="text-red-600 font-medium">
                          Превышен на {formatCurrency(spent - budget.amount)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>У вас нет активных бюджетов</p>
                <Button
                  className="mt-4"
                  size="sm"
                  onClick={() => navigate("/budget")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Создать бюджет
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Button
        variant="outline"
        className="flex items-center justify-center gap-2 h-20"
        onClick={() => navigate("/goals")}
      >
        <Target className="h-5 w-5" />
        <span>Новая цель</span>
      </Button>
    </div>
  );
}
