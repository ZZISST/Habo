import { Link } from 'react-router-dom';
import { PiggyBank } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and description */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <PiggyBank className="h-6 w-6 text-blue-600" />
              <span className="text-lg font-bold text-gray-900">HABO</span>
            </div>
            <p className="text-sm text-gray-600">
              Умный помощник для управления личными финансами. 
              Анализируйте расходы, планируйте бюджет и получайте 
              персональные рекомендации с ИИ.
            </p>
          </div>

          {/* Features */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Возможности</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>Анализ расходов</li>
              <li>Планирование бюджета</li>
              <li>AI рекомендации</li>
              <li>Финансовые цели</li>
              <li>Отчеты и аналитика</li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Поддержка</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link to="/help" className="hover:text-gray-900">
                  Помощь
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-gray-900">
                  Контакты
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-gray-900">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Правовая информация</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link to="/privacy" className="hover:text-gray-900">
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-gray-900">
                  Пользовательское соглашение
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-gray-900">
                  Использование cookies
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-600">
              © 2026 HABO. Все права защищены.
            </p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a
                href="mailto:support@habo.app"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                support@habo.app
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
