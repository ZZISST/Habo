import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { transactionService, categoryAPI } from "@/api/transactions";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { LoadingSpinner } from "@/components/ui/loading";
import { useToast } from "@/components/ui/use-toast";
import {
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Tag,
  X,
  FileSpreadsheet,
  Trash2,
  BookOpen,
  BookMarked,
} from "lucide-react";
import type { Transaction, Category } from "@/types";

interface TransactionFilters {
  limit?: number;
  start_date?: string;
  end_date?: string;
  category_id?: number;
  transaction_type?: "income" | "expense";
  search?: string;
}

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [filters, setFilters] = useState<TransactionFilters>({
    limit: 50,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [notebookFilter, setNotebookFilter] = useState<"all" | "small" | "big">(
    "all",
  );
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [filterMinAmount, setFilterMinAmount] = useState("");
  const [filterMaxAmount, setFilterMaxAmount] = useState("");
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date(),
  });

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await categoryAPI.getCategories();
        setCategories(cats);
      } catch (error) {
        console.error("Error loading categories:", error);
      }
    };
    loadCategories();
  }, []);

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = {
        ...filters,
        start_date: dateRange.start.toISOString().split("T")[0],
        end_date: dateRange.end.toISOString().split("T")[0],
        search: searchTerm || undefined,
      };

      // Apply type filter
      if (filterType && filterType !== "all") {
        params.transaction_type = filterType;
      }

      // Apply category filter
      if (filterCategoryId && filterCategoryId !== "all") {
        params.category_id = parseInt(filterCategoryId);
      }

      const response = await transactionService.getTransactions(params);
      // Handle both array and paginated response formats
      let items = Array.isArray(response) ? response : response.items || [];

      // Client-side filtering for min/max amount (since the API may not support it)
      if (filterMinAmount) {
        const min = parseFloat(filterMinAmount);
        if (!isNaN(min)) {
          items = items.filter((t: Transaction) => Math.abs(t.amount) >= min);
        }
      }
      if (filterMaxAmount) {
        const max = parseFloat(filterMaxAmount);
        if (!isNaN(max)) {
          items = items.filter((t: Transaction) => Math.abs(t.amount) <= max);
        }
      }

      setTransactions(items);
    } catch (error) {
      console.error("Error loading transactions:", error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    filters,
    dateRange,
    searchTerm,
    filterType,
    filterCategoryId,
    filterMinAmount,
    filterMaxAmount,
  ]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleSearch = () => {
    loadTransactions();
  };

  const handleApplyFilters = () => {
    setIsFilterOpen(false);
    loadTransactions();
  };

  const handleResetFilters = () => {
    setFilterType("all");
    setFilterCategoryId("all");
    setFilterMinAmount("");
    setFilterMaxAmount("");
    setSearchTerm("");
    setFilters({ limit: 50 });
    setIsFilterOpen(false);
  };

  const activeFilterCount = [
    filterType !== "all" ? 1 : 0,
    filterCategoryId !== "all" ? 1 : 0,
    filterMinAmount ? 1 : 0,
    filterMaxAmount ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const handleDeleteTransaction = async (id: number) => {
    if (!confirm("Удалить эту транзакцию?")) return;
    try {
      await transactionService.deleteTransaction(id);
      toast({
        title: "Удалено",
        description: "Транзакция успешно удалена",
      });
      loadTransactions();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить транзакцию",
        variant: "destructive",
      });
    }
  };

  // === EXPORT FUNCTIONALITY ===
  const exportToCSV = () => {
    if (transactions.length === 0) {
      toast({
        title: "Нет данных",
        description: "Нет транзакций для экспорта",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "ID",
      "Дата",
      "Тип",
      "Категория",
      "Описание",
      "Сумма",
      "Тетрадь",
      "Плановая",
      "Повторяющаяся",
    ];
    const rows = transactions.map((t) => [
      t.id,
      new Date(t.date).toLocaleDateString("ru-RU"),
      t.type === "income" ? "Доход" : "Расход",
      t.category?.name || "",
      t.description || "",
      t.amount,
      t.notebook_type === "small" ? "Малая" : "Большая",
      t.is_planned ? "Да" : "Нет",
      t.is_recurring ? "Да" : "Нет",
    ]);

    // BOM for UTF-8
    const BOM = "\uFEFF";
    const csvContent =
      BOM +
      [
        headers.join(";"),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"),
        ),
      ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().split("T")[0];
    link.download = `habo_transactions_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Экспорт завершён",
      description: `Экспортировано ${transactions.length} транзакций в CSV`,
    });
    setIsExportDialogOpen(false);
  };

  const exportToJSON = () => {
    if (transactions.length === 0) {
      toast({
        title: "Нет данных",
        description: "Нет транзакций для экспорта",
        variant: "destructive",
      });
      return;
    }

    const exportData = transactions.map((t) => ({
      id: t.id,
      date: t.date,
      type: t.type,
      category: t.category?.name || "",
      description: t.description || "",
      amount: t.amount,
      notebook_type: t.notebook_type,
      is_planned: t.is_planned,
      is_recurring: t.is_recurring,
    }));

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().split("T")[0];
    link.download = `habo_transactions_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Экспорт завершён",
      description: `Экспортировано ${transactions.length} транзакций в JSON`,
    });
    setIsExportDialogOpen(false);
  };

  // === IMPORT FUNCTIONALITY ===
  const handleImportCSV = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();

        if (file.name.endsWith(".json")) {
          const data = JSON.parse(text);
          if (!Array.isArray(data)) {
            throw new Error("Файл JSON должен содержать массив транзакций");
          }

          let importedCount = 0;
          for (const item of data) {
            try {
              await transactionService.createTransaction({
                amount: parseFloat(item.amount),
                type: item.type || "expense",
                description: item.description || "Импортированная транзакция",
                category_id: item.category_id || categories[0]?.id || 1,
                date: item.date || new Date().toISOString().split("T")[0],
                notebook_type: item.notebook_type || "small",
                is_planned: item.is_planned || false,
                is_recurring: item.is_recurring || false,
              });
              importedCount++;
            } catch (err) {
              console.error("Error importing transaction:", err);
            }
          }

          toast({
            title: "Импорт завершён",
            description: `Импортировано ${importedCount} из ${data.length} транзакций`,
          });
          loadTransactions();
        } else if (file.name.endsWith(".csv")) {
          // Parse CSV
          const lines = text.split("\n").filter((line) => line.trim());
          if (lines.length < 2) {
            throw new Error(
              "CSV файл должен содержать заголовок и хотя бы одну строку данных",
            );
          }

          // Skip header row
          let importedCount = 0;
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i]
              .split(";")
              .map((v) => v.replace(/^"|"$/g, "").trim());
            if (values.length < 6) continue;

            const typeStr = values[2]?.toLowerCase();
            const type: "income" | "expense" =
              typeStr === "доход" || typeStr === "income"
                ? "income"
                : "expense";

            try {
              await transactionService.createTransaction({
                amount: parseFloat(values[5]) || 0,
                type,
                description: values[4] || "Импортированная транзакция",
                category_id: categories[0]?.id || 1,
                date: values[1] || new Date().toISOString().split("T")[0],
                notebook_type: "small",
                is_planned: false,
                is_recurring: false,
              });
              importedCount++;
            } catch (err) {
              console.error("Error importing CSV row:", err);
            }
          }

          toast({
            title: "Импорт завершён",
            description: `Импортировано ${importedCount} из ${lines.length - 1} транзакций`,
          });
          loadTransactions();
        } else {
          throw new Error("Поддерживаются только форматы CSV и JSON");
        }
      } catch (error: any) {
        console.error("Import error:", error);
        toast({
          title: "Ошибка импорта",
          description: error.message || "Не удалось импортировать данные",
          variant: "destructive",
        });
      }
    };
    input.click();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    return type === "income" ? TrendingUp : TrendingDown;
  };

  const getTransactionColor = (type: string) => {
    return type === "income" ? "text-green-600" : "text-red-600";
  };

  const getBadgeColor = (type: string) => {
    return type === "income"
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };

  // Filter transactions by notebook type
  const filteredByNotebook =
    notebookFilter === "all"
      ? transactions
      : transactions.filter((t) => t.notebook_type === notebookFilter);

  // Summary stats — always computed from ALL transactions so the three
  // overview cards show the full financial picture regardless of the
  // currently selected notebook filter.
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const getNotebookLabel = (type: string) => {
    return type === "small" ? "📔 Малая тетрадь" : "📘 Большая тетрадь";
  };

  const getNotebookBadgeColor = (type: string) => {
    return type === "small"
      ? "bg-amber-100 text-amber-800"
      : "bg-indigo-100 text-indigo-800";
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Транзакции</h1>
          <p className="text-gray-600 mt-1">
            Управляйте своими доходами и расходами
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => navigate("/transactions/create")}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить транзакцию
          </Button>
        </div>
      </div>

      {/* Notebook Tabs (Kakeibo) */}
      <Card className="p-2">
        <div className="flex items-center gap-1">
          <Button
            variant={notebookFilter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setNotebookFilter("all")}
            className="flex-1 sm:flex-none"
          >
            📋 Все записи
          </Button>
          <Button
            variant={notebookFilter === "small" ? "default" : "ghost"}
            size="sm"
            onClick={() => setNotebookFilter("small")}
            className="flex-1 sm:flex-none"
          >
            <BookOpen className="h-4 w-4 mr-1" />
            📔 Малая тетрадь
          </Button>
          <Button
            variant={notebookFilter === "big" ? "default" : "ghost"}
            size="sm"
            onClick={() => setNotebookFilter("big")}
            className="flex-1 sm:flex-none"
          >
            <BookMarked className="h-4 w-4 mr-1" />
            📘 Большая тетрадь
          </Button>
        </div>
      </Card>

      {/* Summary cards */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Доходы</p>
                <p className="text-lg font-semibold text-green-600">
                  +{formatCurrency(totalIncome)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Расходы</p>
                <p className="text-lg font-semibold text-red-600">
                  -{formatCurrency(totalExpenses)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-full ${
                  totalIncome - totalExpenses >= 0
                    ? "bg-blue-100"
                    : "bg-orange-100"
                }`}
              >
                <Tag
                  className={`h-5 w-5 ${
                    totalIncome - totalExpenses >= 0
                      ? "text-blue-600"
                      : "text-orange-600"
                  }`}
                />
              </div>
              <div>
                <p className="text-sm text-gray-500">Баланс за период</p>
                <p
                  className={`text-lg font-semibold ${
                    totalIncome - totalExpenses >= 0
                      ? "text-blue-600"
                      : "text-orange-600"
                  }`}
                >
                  {formatCurrency(totalIncome - totalExpenses)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Поиск транзакций..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />
          </div>

          <DateRangePicker value={dateRange} onChange={setDateRange} />

          <Button
            variant="outline"
            className="justify-start relative"
            onClick={() => setIsFilterOpen(true)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Фильтры
            {activeFilterCount > 0 && (
              <Badge className="ml-2 bg-blue-600 text-white text-xs px-1.5 py-0.5">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 justify-start"
              onClick={() => setIsExportDialogOpen(true)}
            >
              <Download className="h-4 w-4 mr-2" />
              Экспорт
            </Button>
            <Button
              variant="outline"
              className="flex-1 justify-start"
              onClick={handleImportCSV}
            >
              <Upload className="h-4 w-4 mr-2" />
              Импорт
            </Button>
          </div>
        </div>

        {/* Active filter pills */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">Активные фильтры:</span>
            {filterType !== "all" && (
              <Badge
                className="bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200"
                onClick={() => {
                  setFilterType("all");
                }}
              >
                Тип: {filterType === "income" ? "Доходы" : "Расходы"}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
            {filterCategoryId !== "all" && (
              <Badge
                className="bg-purple-100 text-purple-800 cursor-pointer hover:bg-purple-200"
                onClick={() => {
                  setFilterCategoryId("all");
                }}
              >
                Категория:{" "}
                {categories.find((c) => c.id.toString() === filterCategoryId)
                  ?.name || filterCategoryId}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
            {filterMinAmount && (
              <Badge
                className="bg-green-100 text-green-800 cursor-pointer hover:bg-green-200"
                onClick={() => {
                  setFilterMinAmount("");
                }}
              >
                Мин: {formatCurrency(parseFloat(filterMinAmount))}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
            {filterMaxAmount && (
              <Badge
                className="bg-orange-100 text-orange-800 cursor-pointer hover:bg-orange-200"
                onClick={() => {
                  setFilterMaxAmount("");
                }}
              >
                Макс: {formatCurrency(parseFloat(filterMaxAmount))}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs"
            >
              Сбросить все
            </Button>
          </div>
        )}
      </Card>

      {/* Filter Dialog */}
      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Фильтры транзакций</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Тип транзакции</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Все типы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="income">📈 Доходы</SelectItem>
                  <SelectItem value="expense">📉 Расходы</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Категория</Label>
              <Select
                value={filterCategoryId}
                onValueChange={setFilterCategoryId}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Все категории" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Мин. сумма (₽)</Label>
                <Input
                  type="number"
                  value={filterMinAmount}
                  onChange={(e) => setFilterMinAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Макс. сумма (₽)</Label>
                <Input
                  type="number"
                  value={filterMaxAmount}
                  onChange={(e) => setFilterMaxAmount(e.target.value)}
                  placeholder="999999"
                  min="0"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleResetFilters}>
                Сбросить
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsFilterOpen(false)}
                >
                  Отмена
                </Button>
                <Button onClick={handleApplyFilters}>Применить</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Экспорт транзакций</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Экспортировать {transactions.length} транзакций за выбранный
              период.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={exportToCSV}
              >
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <span>CSV (Excel)</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={exportToJSON}
              >
                <Download className="h-8 w-8 text-blue-600" />
                <span>JSON</span>
              </Button>
            </div>
            <div className="text-xs text-gray-500">
              CSV файл можно открыть в Excel, Google Sheets и других табличных
              редакторах. JSON подходит для программного импорта.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transactions List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {notebookFilter === "all"
              ? "Все транзакции"
              : notebookFilter === "small"
                ? "📔 Ежедневные записи"
                : "📘 Большая тетрадь — долгосрочные записи"}
          </h3>
          <div className="text-sm text-gray-500">
            Найдено: {filteredByNotebook.length} транзакций
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : filteredByNotebook.length > 0 ? (
          <div className="space-y-4">
            {filteredByNotebook.map((transaction) => {
              const Icon = getTransactionIcon(transaction.type);
              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`p-3 rounded-full ${
                        transaction.type === "income"
                          ? "bg-green-100"
                          : "bg-red-100"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${getTransactionColor(transaction.type)}`}
                      />
                    </div>

                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-medium text-gray-900">
                          {transaction.description || "Без описания"}
                        </h4>
                        <Badge className={getBadgeColor(transaction.type)}>
                          {transaction.type === "income" ? "Доход" : "Расход"}
                        </Badge>
                        {transaction.is_recurring && (
                          <Badge className="bg-blue-100 text-blue-700">
                            Повторяющаяся
                          </Badge>
                        )}
                        {transaction.is_planned && (
                          <Badge className="bg-purple-100 text-purple-700">
                            Плановая
                          </Badge>
                        )}
                        {transaction.notebook_type && (
                          <Badge
                            className={getNotebookBadgeColor(
                              transaction.notebook_type,
                            )}
                          >
                            {getNotebookLabel(transaction.notebook_type)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Tag className="h-4 w-4" />
                          {transaction.category?.name || "Без категории"}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(transaction.date).toLocaleDateString(
                            "ru-RU",
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div
                        className={`text-lg font-semibold ${getTransactionColor(transaction.type)}`}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </div>
                      {transaction.account && (
                        <div className="text-sm text-gray-500">
                          {transaction.account.name}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        title="Удалить"
                      >
                        <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Нет транзакций
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || activeFilterCount > 0
                ? "По заданным фильтрам транзакции не найдены"
                : "У вас пока нет транзакций за выбранный период"}
            </p>
            {activeFilterCount > 0 ? (
              <Button variant="outline" onClick={handleResetFilters}>
                Сбросить фильтры
              </Button>
            ) : (
              <Button onClick={() => navigate("/transactions/create")}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить первую транзакцию
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Load More */}
      {filteredByNotebook.length >= (filters.limit || 50) && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => {
              setFilters((prev) => ({
                ...prev,
                limit: (prev.limit || 50) + 50,
              }));
            }}
            disabled={isLoading}
          >
            {isLoading ? <LoadingSpinner size="sm" /> : "Загрузить еще"}
          </Button>
        </div>
      )}
    </div>
  );
}
