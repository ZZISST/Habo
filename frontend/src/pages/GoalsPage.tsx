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
import { useToast } from "@/components/ui/use-toast";
import { goalService } from "@/api/goals";
import {
  Plus,
  Trash2,
  Edit,
  Target,
  TrendingUp,
  Calendar,
  CheckCircle,
  AlertCircle,
  Trophy,
  Coins,
} from "lucide-react";
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

export function GoalsPage() {
  const { toast } = useToast();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [progressGoal, setProgressGoal] = useState<FinancialGoal | null>(null);
  const [progressAmount, setProgressAmount] = useState("");
  const [formData, setFormData] = useState<FinancialGoalCreate>({
    title: "",
    description: "",
    target_amount: 0,
    target_date: new Date(new Date().getFullYear(), 11, 31)
      .toISOString()
      .split("T")[0],
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    setIsLoading(true);
    try {
      if (isDemoMode()) {
        setGoals(getDemoGoals());
      } else {
        const data = await goalService.getGoals();
        setGoals(data);
      }
    } catch (error) {
      console.error("Error loading goals:", error);
      setGoals(getDemoGoals());
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.target_amount || !formData.target_date) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isDemoMode()) {
        if (editingGoal) {
          setGoals((prev) =>
            prev.map((g) =>
              g.id === editingGoal.id
                ? {
                    ...g,
                    title: formData.title,
                    description: formData.description,
                    target_amount: formData.target_amount,
                    target_date: formData.target_date,
                    progress_percentage:
                      (g.current_amount / formData.target_amount) * 100,
                    is_achieved: g.current_amount >= formData.target_amount,
                  }
                : g,
            ),
          );
        } else {
          const newGoal: FinancialGoal = {
            id: Math.floor(Math.random() * 10000),
            title: formData.title,
            description: formData.description,
            target_amount: formData.target_amount,
            current_amount: 0,
            target_date: formData.target_date,
            user_id: 0,
            is_achieved: false,
            progress_percentage: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setGoals((prev) => [...prev, newGoal]);
        }
        toast({
          title: editingGoal ? "Цель обновлена" : "Цель создана",
          description: editingGoal
            ? "Финансовая цель успешно обновлена"
            : "Новая финансовая цель создана",
        });
      } else {
        // Send target_date as full ISO datetime so Pydantic accepts it
        const payload = {
          ...formData,
          target_date: formData.target_date.includes("T")
            ? formData.target_date
            : `${formData.target_date}T23:59:59`,
        };
        if (editingGoal) {
          await goalService.updateGoal(editingGoal.id, payload);
        } else {
          await goalService.createGoal(payload);
        }
        await loadGoals();
        toast({
          title: editingGoal ? "Цель обновлена" : "Цель создана",
          description: editingGoal
            ? "Финансовая цель успешно обновлена"
            : "Новая финансовая цель создана",
        });
      }

      setIsDialogOpen(false);
      setEditingGoal(null);
      resetForm();
    } catch (error) {
      console.error("Error saving goal:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить цель",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить эту цель?")) return;
    try {
      if (isDemoMode()) {
        setGoals((prev) => prev.filter((g) => g.id !== id));
      } else {
        await goalService.deleteGoal(id);
        await loadGoals();
      }
      toast({
        title: "Цель удалена",
        description: "Финансовая цель была удалена",
      });
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить цель",
        variant: "destructive",
      });
    }
  };

  const handleAddProgress = async () => {
    if (!progressGoal || !progressAmount) return;

    const amount = parseFloat(progressAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Ошибка",
        description: "Введите корректную сумму",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isDemoMode()) {
        setGoals((prev) =>
          prev.map((g) => {
            if (g.id !== progressGoal.id) return g;
            const newCurrent = g.current_amount + amount;
            return {
              ...g,
              current_amount: Math.min(newCurrent, g.target_amount * 2),
              progress_percentage: Math.min(
                (newCurrent / g.target_amount) * 100,
                100,
              ),
              is_achieved: newCurrent >= g.target_amount,
            };
          }),
        );
      } else {
        await goalService.updateGoalProgress(progressGoal.id, amount);
        await loadGoals();
      }

      toast({
        title: "Прогресс обновлён",
        description: `Добавлено ${formatCurrency(amount)} к цели "${progressGoal.title}"`,
      });
      setIsProgressDialogOpen(false);
      setProgressGoal(null);
      setProgressAmount("");
    } catch (error) {
      console.error("Error updating progress:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить прогресс",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || "",
      target_amount: goal.target_amount,
      target_date: goal.target_date.split("T")[0],
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingGoal(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const openProgressDialog = (goal: FinancialGoal) => {
    setProgressGoal(goal);
    setProgressAmount("");
    setIsProgressDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      target_amount: 0,
      target_date: new Date(new Date().getFullYear(), 11, 31)
        .toISOString()
        .split("T")[0],
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressColor = (percentage: number, isAchieved: boolean) => {
    if (isAchieved) return "bg-green-500";
    if (percentage >= 75) return "bg-blue-500";
    if (percentage >= 50) return "bg-yellow-500";
    if (percentage >= 25) return "bg-orange-500";
    return "bg-red-400";
  };

  const getDaysRemaining = (targetDate: string) => {
    const target = new Date(targetDate);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const getMonthlyNeeded = (goal: FinancialGoal) => {
    const remaining = goal.target_amount - goal.current_amount;
    if (remaining <= 0) return 0;
    const days = getDaysRemaining(goal.target_date);
    if (days <= 0) return remaining;
    const months = Math.max(days / 30, 1);
    return remaining / months;
  };

  const activeGoals = goals.filter((g) => !g.is_achieved);
  const achievedGoals = goals.filter((g) => g.is_achieved);
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const overallProgress =
    totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="h-8 w-8 text-blue-600" />
            Финансовые цели
          </h1>
          <p className="text-gray-600 mt-1">
            Ставьте цели и отслеживайте прогресс их достижения
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Новая цель
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGoal ? "Редактировать цель" : "Создать цель"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Название цели *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Например: Отпуск в Турции"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Описание</Label>
                <Input
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Описание цели (опционально)"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Целевая сумма (₽) *</Label>
                <Input
                  type="number"
                  value={formData.target_amount || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      target_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                  min="0"
                  step="1000"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Дата достижения *</Label>
                <Input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) =>
                    setFormData({ ...formData, target_date: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingGoal(null);
                  }}
                >
                  Отмена
                </Button>
                <Button type="submit">
                  {editingGoal ? "Сохранить" : "Создать"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Progress Dialog */}
      <Dialog
        open={isProgressDialogOpen}
        onOpenChange={setIsProgressDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Добавить прогресс к &laquo;{progressGoal?.title}&raquo;
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {progressGoal && (
              <div className="text-sm text-gray-600">
                <p>
                  Текущий прогресс:{" "}
                  {formatCurrency(progressGoal.current_amount)} из{" "}
                  {formatCurrency(progressGoal.target_amount)}
                </p>
                <p>
                  Осталось:{" "}
                  {formatCurrency(
                    Math.max(
                      progressGoal.target_amount - progressGoal.current_amount,
                      0,
                    ),
                  )}
                </p>
              </div>
            )}
            <div>
              <Label>Сумма пополнения (₽)</Label>
              <Input
                type="number"
                value={progressAmount}
                onChange={(e) => setProgressAmount(e.target.value)}
                placeholder="0"
                min="0"
                step="100"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsProgressDialogOpen(false);
                  setProgressGoal(null);
                }}
              >
                Отмена
              </Button>
              <Button onClick={handleAddProgress}>Добавить</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Всего целей</p>
              <p className="text-2xl font-bold">{goals.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full">
              <Trophy className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Достигнуто</p>
              <p className="text-2xl font-bold text-green-600">
                {achievedGoals.length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-full">
              <Coins className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Накоплено</p>
              <p className="text-2xl font-bold">
                {formatCurrency(totalCurrent)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Общий прогресс</p>
              <p className="text-2xl font-bold">
                {overallProgress.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Активные цели</h2>
          <div className="grid gap-4">
            {activeGoals.map((goal) => {
              const daysRemaining = getDaysRemaining(goal.target_date);
              const monthlyNeeded = getMonthlyNeeded(goal);
              const progress =
                goal.progress_percentage ??
                (goal.target_amount > 0
                  ? (goal.current_amount / goal.target_amount) * 100
                  : 0);
              const isOverdue = daysRemaining < 0;

              return (
                <Card key={goal.id} className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {goal.title}
                        </h3>
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full whitespace-nowrap">
                            <AlertCircle className="h-3 w-3" />
                            Просрочена
                          </span>
                        )}
                      </div>
                      {goal.description && (
                        <p className="text-sm text-gray-500 mb-3">
                          {goal.description}
                        </p>
                      )}

                      {/* Progress bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {formatCurrency(goal.current_amount)} из{" "}
                            {formatCurrency(goal.target_amount)}
                          </span>
                          <span className="font-medium">
                            {progress.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getProgressColor(progress, false)}`}
                            style={{
                              width: `${Math.min(progress, 100)}%`,
                            }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {isOverdue
                              ? `Просрочена на ${Math.abs(daysRemaining)} дн.`
                              : `Осталось ${daysRemaining} дн.`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Coins className="h-3 w-3" />
                            Осталось{" "}
                            {formatCurrency(
                              Math.max(
                                goal.target_amount - goal.current_amount,
                                0,
                              ),
                            )}
                          </span>
                          {!isOverdue && monthlyNeeded > 0 && (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />~
                              {formatCurrency(monthlyNeeded)}/мес
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => openProgressDialog(goal)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Пополнить
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(goal)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(goal.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Achieved Goals */}
      {achievedGoals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-green-600" />
            Достигнутые цели
          </h2>
          <div className="grid gap-4">
            {achievedGoals.map((goal) => (
              <Card key={goal.id} className="p-6 bg-green-50 border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-full">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {goal.title}
                      </h3>
                      {goal.description && (
                        <p className="text-sm text-gray-500">
                          {goal.description}
                        </p>
                      )}
                      <p className="text-sm text-green-600 font-medium mt-1">
                        {formatCurrency(goal.target_amount)} — Цель достигнута!
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(goal.id)}
                  >
                    <Trash2 className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {goals.length === 0 && (
        <Card className="p-12 text-center">
          <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            У вас пока нет финансовых целей
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Создайте свою первую финансовую цель, чтобы начать отслеживать
            прогресс на пути к финансовой свободе
          </p>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Создать первую цель
          </Button>
        </Card>
      )}

      {/* Tips Card */}
      {goals.length > 0 && activeGoals.length > 0 && (
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            💡 Советы по достижению целей
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>
                Откладывайте регулярно — даже маленькие суммы приближают к цели
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>
                Настройте автоматическое пополнение сразу после получения дохода
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>
                Пересматривайте цели каждый месяц и корректируйте при
                необходимости
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
