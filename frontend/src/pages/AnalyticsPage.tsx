import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { dashboardService } from "@/api/dashboard";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const COLORS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#6366F1",
  "#14B8A6",
];

export function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
    end: new Date(),
  });

  const [analytics, setAnalytics] = useState<{
    expensesByCategory: { name: string; value: number; color?: string }[];
    incomeVsExpenses: { month: string; income: number; expenses: number }[];
    monthlyTrend: { month: string; amount: number }[];
    topCategories: { name: string; amount: number; change: number }[];
    summary: {
      totalIncome: number;
      totalExpenses: number;
      avgMonthlyExpenses: number;
      savingsRate: number;
    };
  } | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange.start, dateRange.end]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const period = `${dateRange.start.toISOString().split("T")[0]}_${dateRange.end.toISOString().split("T")[0]}`;
      const dashboard = await dashboardService.getDashboard(period);

      const expensesByCategory = Object.entries(
        dashboard.expense_by_category || {},
      ).map(([name, value], index) => ({
        name,
        value: value as number,
        color: COLORS[index % COLORS.length],
      }));

      const topCategories = Object.entries(dashboard.expense_by_category || {})
        .slice(0, 5)
        .map(([name, value]) => ({
          name,
          amount: value as number,
          change: 0, // Placeholder, actual change calculation would need historical data
        }));

      // Преобразование monthly_trend в format для LineChart (если есть)
      const monthlyTrend = (dashboard.monthly_trend || []).map(
        (trend: any) => ({
          month: new Date(trend.month || trend.date).toLocaleDateString(
            "ru-RU",
            { month: "short" },
          ),
          amount: trend.expenses || trend.totalExpenses || 0,
        }),
      );

      // Transform monthly_trend for the BarChart (needs short month labels)
      const incomeVsExpenses = (dashboard.monthly_trend || []).map(
        (trend: any) => ({
          month: new Date(trend.month || trend.date).toLocaleDateString(
            "ru-RU",
            { month: "short" },
          ),
          income: trend.income || 0,
          expenses: trend.expenses || 0,
        }),
      );

      setAnalytics({
        expensesByCategory,
        incomeVsExpenses,
        monthlyTrend:
          monthlyTrend.length > 0
            ? monthlyTrend
            : expensesByCategory.map((cat) => ({
                month: cat.name,
                amount: cat.value,
              })),
        topCategories: topCategories.length > 0 ? topCategories : [],
        summary: {
          totalIncome: dashboard.total_income || 0,
          totalExpenses: dashboard.total_expenses || 0,
          avgMonthlyExpenses: (dashboard.total_expenses || 0) / 6,
          savingsRate:
            dashboard.savings_rate ??
            (dashboard.total_income
              ? ((dashboard.total_income - dashboard.total_expenses) /
                  dashboard.total_income) *
                100
              : 0),
        },
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
      // Демо данные
      setAnalytics({
        expensesByCategory: [
          { name: "Продукты", value: 45000, color: "#3B82F6" },
          { name: "Транспорт", value: 18000, color: "#EF4444" },
          { name: "Развлечения", value: 25000, color: "#10B981" },
          { name: "ЖКХ", value: 12000, color: "#F59E0B" },
          { name: "Подписки", value: 5000, color: "#8B5CF6" },
          { name: "Здоровье", value: 8000, color: "#EC4899" },
        ],
        incomeVsExpenses: [
          { month: "Окт", income: 120000, expenses: 95000 },
          { month: "Ноя", income: 125000, expenses: 88000 },
          { month: "Дек", income: 150000, expenses: 120000 },
          { month: "Янв", income: 120000, expenses: 92000 },
          { month: "Фев", income: 125000, expenses: 98000 },
          { month: "Мар", income: 130000, expenses: 113000 },
        ],
        monthlyTrend: [
          { month: "Окт", amount: 95000 },
          { month: "Ноя", amount: 88000 },
          { month: "Дек", amount: 120000 },
          { month: "Янв", amount: 92000 },
          { month: "Фев", amount: 98000 },
          { month: "Мар", amount: 113000 },
        ],
        topCategories: [
          { name: "Продукты", amount: 45000, change: 5.2 },
          { name: "Развлечения", amount: 25000, change: -12.5 },
          { name: "Транспорт", amount: 18000, change: 8.3 },
          { name: "ЖКХ", amount: 12000, change: 0 },
          { name: "Здоровье", amount: 8000, change: 15.0 },
        ],
        summary: {
          totalIncome: 770000,
          totalExpenses: 606000,
          avgMonthlyExpenses: 101000,
          savingsRate: 21.3,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Не удалось загрузить аналитику</p>
        <Button onClick={loadAnalytics} className="mt-4">
          Попробовать снова
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Аналитика</h1>
          <p className="text-gray-600 mt-1">Детальный анализ ваших финансов</p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Общий доход</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(analytics.summary.totalIncome)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Общие расходы</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(analytics.summary.totalExpenses)}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Средние расходы/мес</p>
              <p className="text-2xl font-bold">
                {formatCurrency(analytics.summary.avgMonthlyExpenses)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Норма сбережений</p>
              <p className="text-2xl font-bold text-purple-600">
                {analytics.summary.savingsRate.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <PieChartIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses by Category */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Расходы по категориям</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.expensesByCategory}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {analytics.expensesByCategory.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: "8px" }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Income vs Expenses */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Доходы vs Расходы</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.incomeVsExpenses}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}к`}
              />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar
                dataKey="income"
                name="Доходы"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expenses"
                name="Расходы"
                fill="#EF4444"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Monthly Trend & Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Expenses Trend */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Динамика расходов</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}к`}
              />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Line
                type="monotone"
                dataKey="amount"
                name="Расходы"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ fill: "#3B82F6", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Categories */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Топ категорий расходов</h3>
          <div className="space-y-4">
            {analytics.topCategories.map((category, index) => (
              <div
                key={category.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-medium">{category.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold">
                    {formatCurrency(category.amount)}
                  </span>
                  <div
                    className={`flex items-center gap-1 text-sm ${
                      category.change > 0
                        ? "text-red-500"
                        : category.change < 0
                          ? "text-green-500"
                          : "text-gray-500"
                    }`}
                  >
                    {category.change > 0 ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : category.change < 0 ? (
                      <ArrowDownRight className="h-4 w-4" />
                    ) : null}
                    {category.change !== 0 && `${Math.abs(category.change)}%`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
