import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { budgetService } from "@/api/budget";
import { categoryAPI } from "@/api/transactions";
import {
  Plus,
  Trash2,
  Edit,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  PiggyBank,
} from "lucide-react";
import type { Budget, BudgetCreate, Category } from "@/types";

export function BudgetPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formData, setFormData] = useState<BudgetCreate>({
    category_id: 0,
    amount: 0,
    period_start: new Date().toISOString().split("T")[0],
    period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString()
      .split("T")[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [budgetsData, categoriesData] = await Promise.all([
        budgetService.getBudgets(),
        categoryAPI.getCategories(),
      ]);
      setBudgets(budgetsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error loading budgets:", error);
      // Демо данные для отображения
      setBudgets([
        {
          id: 1,
          category_id: 1,
          category: {
            id: 1,
            name: "Продукты",
            category_type: "needs",
            user_id: 1,
            created_at: "",
          },
          amount: 30000,
          spent: 22000,
          remaining: 8000,
          period_start: "2026-03-01",
          period_end: "2026-03-31",
          user_id: 1,
          created_at: "",
          updated_at: "",
        },
        {
          id: 2,
          category_id: 2,
          category: {
            id: 2,
            name: "Транспорт",
            category_type: "needs",
            user_id: 1,
            created_at: "",
          },
          amount: 15000,
          spent: 12500,
          remaining: 2500,
          period_start: "2026-03-01",
          period_end: "2026-03-31",
          user_id: 1,
          created_at: "",
          updated_at: "",
        },
        {
          id: 3,
          category_id: 3,
          category: {
            id: 3,
            name: "Развлечения",
            category_type: "wants",
            user_id: 1,
            created_at: "",
          },
          amount: 10000,
          spent: 11500,
          remaining: -1500,
          period_start: "2026-03-01",
          period_end: "2026-03-31",
          user_id: 1,
          created_at: "",
          updated_at: "",
        },
        {
          id: 4,
          category_id: 4,
          category: {
            id: 4,
            name: "Подписки",
            category_type: "wants",
            user_id: 1,
            created_at: "",
          },
          amount: 3000,
          spent: 1500,
          remaining: 1500,
          period_start: "2026-03-01",
          period_end: "2026-03-31",
          user_id: 1,
          created_at: "",
          updated_at: "",
        },
      ]);
      setCategories([
        {
          id: 1,
          name: "Продукты",
          category_type: "needs",
          user_id: 1,
          created_at: "",
        },
        {
          id: 2,
          name: "Транспорт",
          category_type: "needs",
          user_id: 1,
          created_at: "",
        },
        {
          id: 3,
          name: "Развлечения",
          category_type: "wants",
          user_id: 1,
          created_at: "",
        },
        {
          id: 4,
          name: "Подписки",
          category_type: "wants",
          user_id: 1,
          created_at: "",
        },
        {
          id: 5,
          name: "Здоровье",
          category_type: "needs",
          user_id: 1,
          created_at: "",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBudget) {
        await budgetService.updateBudget(editingBudget.id, formData);
      } else {
        await budgetService.createBudget(formData);
      }
      setIsDialogOpen(false);
      setEditingBudget(null);
      loadData();
    } catch (error) {
      console.error("Error saving budget:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить этот бюджет?")) return;
    try {
      await budgetService.deleteBudget(id);
      loadData();
    } catch (error) {
      console.error("Error deleting budget:", error);
    }
  };

  const openEditDialog = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      category_id: budget.category_id,
      amount: budget.amount,
      period_start: budget.period_start,
      period_end: budget.period_end,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingBudget(null);
    setFormData({
      category_id: 0,
      amount: 0,
      period_start: new Date().toISOString().split("T")[0],
      period_end: new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0,
      )
        .toISOString()
        .split("T")[0],
    });
    setIsDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressColor = (spent: number, amount: number) => {
    const spentAmount = spent || 0;
    const percentage = (spentAmount / amount) * 100;
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getProgressWidth = (spent: number, amount: number) => {
    const spentAmount = spent || 0;
    return Math.min((spentAmount / amount) * 100, 100);
  };

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const totalRemaining = totalBudgeted - totalSpent;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Бюджет</h1>
          <p className="text-gray-600 mt-1">
            Планируйте расходы и следите за выполнением бюджета
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Создать бюджет
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBudget ? "Редактировать бюджет" : "Создать бюджет"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Категория</Label>
                <Select
                  value={formData.category_id.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category_id: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter((cat) => cat.category_type !== "income")
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.icon ? `${cat.icon} ` : ""}
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Сумма бюджета</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      amount: parseFloat(e.target.value),
                    })
                  }
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Начало периода</Label>
                  <Input
                    type="date"
                    value={formData.period_start}
                    onChange={(e) =>
                      setFormData({ ...formData, period_start: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Конец периода</Label>
                  <Input
                    type="date"
                    value={formData.period_end}
                    onChange={(e) =>
                      setFormData({ ...formData, period_end: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Отмена
                </Button>
                <Button type="submit">
                  {editingBudget ? "Сохранить" : "Создать"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <PiggyBank className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Запланировано</p>
              <p className="text-2xl font-bold">
                {formatCurrency(totalBudgeted)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-full">
              <TrendingDown className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Потрачено</p>
              <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-full ${totalRemaining >= 0 ? "bg-green-100" : "bg-red-100"}`}
            >
              {totalRemaining >= 0 ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Остаток</p>
              <p
                className={`text-2xl font-bold ${totalRemaining >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {formatCurrency(totalRemaining)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Budget List */}
      <div className="grid gap-4">
        {budgets.length === 0 ? (
          <Card className="p-12 text-center">
            <PiggyBank className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Нет бюджетов
            </h3>
            <p className="text-gray-500 mb-4">
              Создайте первый бюджет, чтобы начать планировать расходы
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Создать бюджет
            </Button>
          </Card>
        ) : (
          budgets.map((budget) => (
            <Card key={budget.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    {budget.category.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(budget.period_start).toLocaleDateString("ru-RU")}{" "}
                    — {new Date(budget.period_end).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(budget)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(budget.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    Потрачено: {formatCurrency(budget.spent || 0)} из{" "}
                    {formatCurrency(budget.amount)}
                  </span>
                  <span
                    className={
                      (budget.remaining || 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {(budget.remaining || 0) >= 0
                      ? "Остаток: "
                      : "Превышение: "}
                    {formatCurrency(Math.abs(budget.remaining || 0))}
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${getProgressColor(budget.spent || 0, budget.amount)}`}
                    style={{
                      width: `${getProgressWidth(budget.spent || 0, budget.amount)}%`,
                    }}
                  />
                </div>
                <div className="text-right text-sm text-gray-500">
                  {Math.round(((budget.spent || 0) / budget.amount) * 100)}%
                  использовано
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
