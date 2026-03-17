import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { transactionService, categoryAPI } from "@/api/transactions";
import { LoadingSpinner } from "@/components/ui/loading";
import { ArrowLeft, Check } from "lucide-react";
import type { Category } from "@/types";

export function CreateTransactionPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);

  const [formData, setFormData] = useState({
    amount: "",
    type: "expense" as "expense" | "income",
    description: "",
    category_id: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    notebook_type: "small" as "small" | "big",
    is_planned: false,
    is_recurring: false,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  // Reset category when transaction type changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      category_id: "",
      // Income always goes to big notebook; expenses default to small
      notebook_type: prev.type === "income" ? "big" : "small",
    }));
  }, [formData.type]);

  const loadCategories = async () => {
    setIsCategoriesLoading(true);
    try {
      const data = await categoryAPI.getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить категории",
        variant: "destructive",
      });
    } finally {
      setIsCategoriesLoading(false);
    }
  };

  // Filter categories based on selected transaction type
  const filteredCategories = categories.filter((cat) => {
    if (formData.type === "income") {
      return cat.category_type === "income";
    }
    // For expenses, show all non-income categories
    return cat.category_type !== "income";
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || !formData.category_id || !formData.description) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await transactionService.createTransaction({
        amount: parseFloat(formData.amount),
        type: formData.type,
        description: formData.description,
        category_id: parseInt(formData.category_id),
        date: formData.date,
        notes: formData.notes || undefined,
        notebook_type: formData.notebook_type,
        is_planned: formData.is_planned,
        is_recurring: formData.is_recurring,
      });

      toast({
        title: "Успешно",
        description: "Транзакция добавлена",
      });

      navigate("/transactions");
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать транзакцию",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCategoriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/transactions")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Добавить транзакцию
          </h1>
          <p className="text-gray-600 mt-1">Создайте новую транзакцию</p>
        </div>
      </div>

      {/* Form */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type */}
          <div>
            <Label htmlFor="type">Тип транзакции *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  type: value as "income" | "expense",
                })
              }
            >
              <SelectTrigger id="type" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">📈 Доход</SelectItem>
                <SelectItem value="expense">📉 Расход</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div>
            <Label htmlFor="amount">Сумма (₽) *</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              className="mt-2"
              step="0.01"
              min="0"
              required
            />
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">
              Категория *{" "}
              {formData.type === "income" ? "(доходов)" : "(расходов)"}
            </Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) =>
                setFormData({ ...formData, category_id: value })
              }
            >
              <SelectTrigger id="category" className="mt-2">
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.icon ? `${cat.icon} ` : ""}
                      {cat.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    Нет категорий для данного типа
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Описание *</Label>
            <Input
              id="description"
              placeholder="Описание транзакции"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="mt-2"
              required
            />
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="date">Дата *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="mt-2"
              required
            />
          </div>

          {/* Notebook Type — only for expenses (Kakeibo notebooks are for spending) */}
          {formData.type === "expense" && (
            <div>
              <Label htmlFor="notebook">Тип записи (Кэкэйбо)</Label>
              <Select
                value={formData.notebook_type}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    notebook_type: value as "small" | "big",
                  })
                }
              >
                <SelectTrigger id="notebook" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">
                    📔 Малая тетрадь (ежедневные траты)
                  </SelectItem>
                  <SelectItem value="big">
                    📘 Большая тетрадь (долгосрочные цели)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.notebook_type === "small"
                  ? "Маленький блокнот — для записи ежедневных планов и фактических трат"
                  : "Большой блокнот — для долгосрочных целей, итогов и анализа"}
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Примечания</Label>
            <Input
              id="notes"
              placeholder="Дополнительные заметки (опционально)"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="mt-2"
            />
          </div>

          {/* Additional Options */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex items-start gap-3">
              <input
                id="is_planned"
                type="checkbox"
                checked={formData.is_planned}
                onChange={(e) =>
                  setFormData({ ...formData, is_planned: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 mt-1"
              />
              <div>
                <Label htmlFor="is_planned" className="cursor-pointer">
                  Это плановая транзакция
                </Label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Отметьте, если это запланированная трата. Фактические расходы
                  записываются без этой отметки. В Кэкэйбо сначала планируют,
                  потом записывают факт.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <input
                id="is_recurring"
                type="checkbox"
                checked={formData.is_recurring}
                onChange={(e) =>
                  setFormData({ ...formData, is_recurring: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 mt-1"
              />
              <div>
                <Label htmlFor="is_recurring" className="cursor-pointer">
                  Это повторяющаяся транзакция
                </Label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Отметьте для регулярных платежей (подписки, аренда, зарплата и
                  т.д.). Помогает отслеживать постоянные обязательства.
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => navigate("/transactions")}
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Создание...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Создать транзакцию
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
