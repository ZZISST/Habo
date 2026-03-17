import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/api/client";
import {
  OnboardingQuestionnaire,
  type AssessmentResult,
} from "@/components/OnboardingQuestionnaire";
import {
  Settings,
  Bell,
  Shield,
  Palette,
  Download,
  Trash2,
  Moon,
  Sun,
  Smartphone,
  ClipboardCheck,
  Brain,
  RefreshCw,
  CheckCircle,
} from "lucide-react";

const isDemoMode = () => {
  const token = localStorage.getItem("access_token");
  return token?.startsWith("demo_token_");
};

interface SettingsSection {
  id: string;
  title: string;
  icon: React.ReactNode;
}

export function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("general");
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentCompleted, setAssessmentCompleted] = useState<
    boolean | null
  >(null);
  const [assessmentScore, setAssessmentScore] = useState<number | null>(null);
  const [assessmentDate, setAssessmentDate] = useState<string | null>(null);

  // Check assessment status
  useEffect(() => {
    const checkAssessment = async () => {
      const localFlag = localStorage.getItem(
        `assessment_completed_${user?.id ?? "demo"}`,
      );
      if (localFlag === "true") {
        setAssessmentCompleted(true);
      }

      if (isDemoMode()) {
        // Check local storage for demo assessment score
        const storedScore = localStorage.getItem(
          `assessment_score_${user?.id ?? "demo"}`,
        );
        if (storedScore) {
          setAssessmentScore(parseFloat(storedScore));
          setAssessmentDate(
            localStorage.getItem(`assessment_date_${user?.id ?? "demo"}`) ||
              new Date().toLocaleDateString("ru-RU"),
          );
        }
        return;
      }

      try {
        const response = await api.get("/finance/analysis/assessment");
        if (response.data && response.data.id) {
          setAssessmentCompleted(true);
          if (response.data.score) {
            setAssessmentScore(response.data.score);
          }
          if (response.data.created_at) {
            setAssessmentDate(
              new Date(response.data.created_at).toLocaleDateString("ru-RU"),
            );
          }
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

  const handleAssessmentComplete = (result: AssessmentResult) => {
    setShowAssessment(false);
    setAssessmentCompleted(true);
    setAssessmentScore(result.score);
    setAssessmentDate(new Date().toLocaleDateString("ru-RU"));
    localStorage.setItem(`assessment_completed_${user?.id ?? "demo"}`, "true");
    localStorage.setItem(
      `assessment_score_${user?.id ?? "demo"}`,
      String(result.score),
    );
    localStorage.setItem(
      `assessment_date_${user?.id ?? "demo"}`,
      new Date().toLocaleDateString("ru-RU"),
    );
    toast({
      title: "Опрос завершён",
      description: `Ваш финансовый балл: ${result.score}. Рекомендации обновлены.`,
    });
  };

  const handleRetakeAssessment = () => {
    // Clear cached flag so the questionnaire treats it as new
    localStorage.removeItem(`assessment_completed_${user?.id ?? "demo"}`);
    setShowAssessment(true);
  };

  const [settings, setSettings] = useState({
    // General
    language: "ru",
    currency: "RUB",
    theme: "light",

    // Notifications
    emailNotifications: true,
    pushNotifications: true,
    budgetAlerts: true,
    weeklyReports: true,

    // Privacy
    shareAnalytics: false,
    twoFactorAuth: false,
  });

  const sections: SettingsSection[] = [
    { id: "general", title: "Общие", icon: <Settings className="h-5 w-5" /> },
    {
      id: "assessment",
      title: "Финансовый опрос",
      icon: <Brain className="h-5 w-5" />,
    },
    {
      id: "notifications",
      title: "Уведомления",
      icon: <Bell className="h-5 w-5" />,
    },
    {
      id: "privacy",
      title: "Безопасность",
      icon: <Shield className="h-5 w-5" />,
    },
    {
      id: "appearance",
      title: "Внешний вид",
      icon: <Palette className="h-5 w-5" />,
    },
    { id: "data", title: "Данные", icon: <Download className="h-5 w-5" /> },
  ];

  const handleSave = () => {
    // TODO: Save to API
    toast({
      title: "Настройки сохранены",
      description: "Ваши настройки успешно обновлены",
    });
  };

  const handleExportData = () => {
    toast({
      title: "Экспорт данных",
      description: "Ваши данные будут отправлены на email",
    });
  };

  const handleDeleteAccount = () => {
    if (
      confirm(
        "Вы уверены, что хотите удалить аккаунт? Это действие необратимо.",
      )
    ) {
      toast({
        title: "Запрос на удаление",
        description: "Запрос на удаление аккаунта отправлен",
        variant: "destructive",
      });
    }
  };

  const Toggle = ({
    checked,
    onChange,
    label,
  }: {
    checked: boolean;
    onChange: () => void;
    label: string;
  }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "general":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Основные настройки</h3>
              <div className="space-y-4">
                <div>
                  <Label>Язык</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(value) =>
                      setSettings({ ...settings, language: value })
                    }
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Валюта</Label>
                  <Select
                    value={settings.currency}
                    onValueChange={(value) =>
                      setSettings({ ...settings, currency: value })
                    }
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RUB">₽ Российский рубль</SelectItem>
                      <SelectItem value="USD">$ Доллар США</SelectItem>
                      <SelectItem value="EUR">€ Евро</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case "assessment":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">
              Финансовый опрос Кэкэйбо
            </h3>
            <p className="text-sm text-gray-600">
              Пройдите финансовый опрос из 10 вопросов, чтобы получить
              персонализированные рекомендации по методу Кэкэйбо. Ваши ответы
              помогут AI-ассистенту лучше понять вашу финансовую ситуацию и дать
              более точные советы.
            </p>

            {assessmentCompleted ? (
              <Card className="p-5 bg-green-50 border-green-200">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 mb-1">
                      Опрос пройден
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      {assessmentScore !== null && (
                        <Badge className="bg-green-100 text-green-800">
                          Балл: {assessmentScore}
                        </Badge>
                      )}
                      {assessmentDate && (
                        <span className="text-sm text-green-700">
                          Дата: {assessmentDate}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-green-700">
                      Ваши результаты используются для персонализации
                      рекомендаций и AI-анализа. Вы можете пройти опрос
                      повторно, если ваша финансовая ситуация изменилась.
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-5 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <ClipboardCheck className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 mb-1">
                      Опрос ещё не пройден
                    </h4>
                    <p className="text-sm text-blue-700">
                      Пройдите финансовый опрос, чтобы получить
                      персонализированные рекомендации. Это займёт примерно 3–5
                      минут.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <div className="flex gap-3">
              {assessmentCompleted ? (
                <Button variant="outline" onClick={handleRetakeAssessment}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Пройти опрос повторно
                </Button>
              ) : (
                <Button onClick={() => setShowAssessment(true)}>
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Начать опрос
                </Button>
              )}
            </div>

            <Separator />

            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Как это работает
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    1
                  </div>
                  <p className="text-sm text-gray-600">
                    Вы отвечаете на 10 вопросов о доходах, расходах, привычках и
                    целях
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    2
                  </div>
                  <p className="text-sm text-gray-600">
                    На основе ваших ответов формируется финансовый профиль
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    3
                  </div>
                  <p className="text-sm text-gray-600">
                    AI-ассистент использует профиль для персонализированных
                    рекомендаций по методу Кэкэйбо
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">
              Настройки уведомлений
            </h3>
            <div className="space-y-4">
              <Toggle
                checked={settings.emailNotifications}
                onChange={() =>
                  setSettings({
                    ...settings,
                    emailNotifications: !settings.emailNotifications,
                  })
                }
                label="Email уведомления"
              />
              <Toggle
                checked={settings.pushNotifications}
                onChange={() =>
                  setSettings({
                    ...settings,
                    pushNotifications: !settings.pushNotifications,
                  })
                }
                label="Push-уведомления"
              />
              <Separator />
              <Toggle
                checked={settings.budgetAlerts}
                onChange={() =>
                  setSettings({
                    ...settings,
                    budgetAlerts: !settings.budgetAlerts,
                  })
                }
                label="Оповещения о бюджете"
              />
              <Toggle
                checked={settings.weeklyReports}
                onChange={() =>
                  setSettings({
                    ...settings,
                    weeklyReports: !settings.weeklyReports,
                  })
                }
                label="Еженедельные отчёты"
              />
            </div>
          </div>
        );

      case "privacy":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">
              Безопасность и конфиденциальность
            </h3>
            <div className="space-y-4">
              <Toggle
                checked={settings.twoFactorAuth}
                onChange={() =>
                  setSettings({
                    ...settings,
                    twoFactorAuth: !settings.twoFactorAuth,
                  })
                }
                label="Двухфакторная аутентификация"
              />
              <Toggle
                checked={settings.shareAnalytics}
                onChange={() =>
                  setSettings({
                    ...settings,
                    shareAnalytics: !settings.shareAnalytics,
                  })
                }
                label="Делиться анонимной аналитикой"
              />
              <Separator />
              <div>
                <Label>Смена пароля</Label>
                <div className="mt-2 space-y-2">
                  <Input type="password" placeholder="Текущий пароль" />
                  <Input type="password" placeholder="Новый пароль" />
                  <Input type="password" placeholder="Подтвердите пароль" />
                  <Button variant="outline" className="mt-2">
                    Изменить пароль
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">
              Внешний вид приложения
            </h3>
            <div>
              <Label>Тема оформления</Label>
              <div className="grid grid-cols-3 gap-4 mt-2">
                {[
                  {
                    value: "light",
                    label: "Светлая",
                    icon: <Sun className="h-5 w-5" />,
                  },
                  {
                    value: "dark",
                    label: "Тёмная",
                    icon: <Moon className="h-5 w-5" />,
                  },
                  {
                    value: "system",
                    label: "Системная",
                    icon: <Smartphone className="h-5 w-5" />,
                  },
                ].map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() =>
                      setSettings({ ...settings, theme: theme.value })
                    }
                    className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                      settings.theme === theme.value
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {theme.icon}
                    <span className="text-sm font-medium">{theme.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case "data":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Управление данными</h3>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Экспорт данных</h4>
                  <p className="text-sm text-gray-500">
                    Скачать все ваши данные в формате CSV
                  </p>
                </div>
                <Button variant="outline" onClick={handleExportData}>
                  <Download className="mr-2 h-4 w-4" />
                  Экспорт
                </Button>
              </div>
            </Card>
            <Card className="p-4 border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-red-600">Удалить аккаунт</h4>
                  <p className="text-sm text-gray-500">
                    Навсегда удалить аккаунт и все данные
                  </p>
                </div>
                <Button variant="destructive" onClick={handleDeleteAccount}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить
                </Button>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      {/* Financial Assessment Modal */}
      {showAssessment && (
        <OnboardingQuestionnaire
          onComplete={handleAssessmentComplete}
          onSkip={() => setShowAssessment(false)}
        />
      )}

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Настройки</h1>
        <p className="text-gray-600 mt-1">
          Управляйте настройками вашего аккаунта
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <Card className="p-4 h-fit">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-gray-100"
                }`}
              >
                {section.icon}
                <span className="font-medium">{section.title}</span>
              </button>
            ))}
          </nav>
        </Card>

        {/* Content */}
        <Card className="p-6 md:col-span-3">
          {renderContent()}
          <div className="mt-6 pt-6 border-t flex justify-end gap-2">
            <Button variant="outline">Отмена</Button>
            <Button onClick={handleSave}>Сохранить изменения</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
