import { Link } from "react-router-dom";
import {
  PiggyBank,
  ArrowRight,
  CheckCircle,
  Brain,
  Target,
  Shield,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LandingPage() {
  const features = [
    {
      icon: TrendingUp,
      title: "Автоматический анализ",
      description:
        "Автоматическое отслеживание и категоризация всех ваших финансовых операций",
    },
    {
      icon: Target,
      title: "Планирование бюджета",
      description:
        "Установите лимиты по категориям и следите за их соблюдением",
    },
    {
      icon: Brain,
      title: "ИИ рекомендации",
      description:
        "Персональные советы и предупреждения от искусственного интеллекта",
    },
    {
      icon: TrendingUp,
      title: "Прогнозирование",
      description:
        "Получайте прогнозы по вашим доходам и расходам на будущие периоды",
    },
    {
      icon: Target,
      title: "Финансовые цели",
      description: "Ставьте цели и отслеживайте прогресс их достижения",
    },
    {
      icon: Shield,
      title: "Безопасность данных",
      description:
        "Ваши финансовые данные надежно защищены современными технологиями",
    },
  ];

  const benefits = [
    "Полный контроль над финансами",
    "Персональные ИИ рекомендации",
    "Автоматическая категоризация",
    "Детальная аналитика и отчеты",
    "Планирование бюджета",
    "Отслеживание финансовых целей",
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <PiggyBank className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Habo</span>
            </div>
            <div className="flex space-x-4">
              <Link to="/login">
                <Button variant="outline">Войти</Button>
              </Link>
              <Link to="/register">
                <Button>Начать</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Умное управление
              <br />
              <span className="text-blue-600">личными финансами</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Habo - ваш персональный финансовый помощник с ИИ. Анализируйте
              расходы, планируйте бюджет и получайте умные рекомендации для
              достижения финансовых целей.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="text-lg px-8">
                  Начать бесплатно
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/demo">
                <Button variant="outline" size="lg" className="text-lg px-8">
                  Посмотреть демо
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Все инструменты в одном месте
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Habo объединяет все необходимые инструменты для эффективного
              управления личными финансами
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="p-6 hover:shadow-lg transition-shadow"
              >
                <feature.icon className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Почему Habo?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Наше приложение помогает тысячам пользователей достигать
                финансовых целей благодаря умным технологиям и простому
                интерфейсу.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <span className="text-gray-900">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <Card className="p-8 bg-white shadow-xl">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Баланс
                    </span>
                    <span className="text-2xl font-bold text-gray-900">
                      ₽156,750
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Доходы</span>
                      <span className="text-green-600 font-medium">
                        +₽85,000
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Расходы</span>
                      <span className="text-red-600 font-medium">-₽28,250</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Сбережения</span>
                      <span className="text-blue-600 font-medium">
                        +₽56,750
                      </span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Brain className="h-4 w-4" />
                      <span>ИИ рекомендует сократить развлечения на 15%</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Готовы взять контроль над финансами?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Разгрузите голову и начните путь к финансовой свободе с
            персональным помощником Habo.
          </p>
          <Link to="/register">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Начать бесплатно
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <PiggyBank className="h-6 w-6 text-blue-400" />
                <span className="text-xl font-bold">household account book organised</span>
              </div>
              <p className="text-gray-400">
                Умный помощник для управления личными финансами
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Продукт</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link to="/features">Возможности</Link>
                </li>
                <li>
                  <Link to="/pricing">Цены</Link>
                </li>
                <li>
                  <Link to="/security">Безопасность</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Поддержка</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link to="/help">Помощь</Link>
                </li>
                <li>
                  <Link to="/contact">Контакты</Link>
                </li>
                <li>
                  <Link to="/faq">FAQ</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Юридическая информация</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link to="/privacy">Политика конфиденциальности</Link>
                </li>
                <li>
                  <Link to="/terms">Условия использования</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2026 Habo. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
