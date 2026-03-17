import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface FinancialCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
  children?: ReactNode;
  color?: 'default' | 'green' | 'red' | 'blue';
  action?: ReactNode;
  change?: {
    value: number;
    type: 'positive' | 'negative' | string;
    format?: 'percent' | 'value';
  };
}

export function FinancialCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  className,
  children,
  color = 'default',
  action,
  change,
}: FinancialCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
      }).format(val);
    }
    return val;
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return '↗';
      case 'down':
        return '↘';
      default:
        return '→';
    }
  };

  const getChangeColor = () => {
    if (!change) return '';
    return change.type === 'positive' ? 'text-green-600' : 'text-red-600';
  };

  const formatChange = () => {
    if (!change) return '';
    const sign = change.value >= 0 ? '+' : '';
    if (change.format === 'percent') {
      return `${sign}${change.value.toFixed(1)}%`;
    }
    return `${sign}${change.value.toFixed(1)}%`;
  };

  const getColorClass = () => {
    switch (color) {
      case 'green': return 'border-l-4 border-l-green-500';
      case 'red': return 'border-l-4 border-l-red-500';
      case 'blue': return 'border-l-4 border-l-blue-500';
      default: return '';
    }
  };

  return (
    <Card className={cn('p-6 bg-white shadow-sm border border-gray-100', getColorClass(), className)}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
            <div className="flex items-center gap-2">
              {Icon && <Icon className="h-5 w-5 text-gray-400" />}
              {action}
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-2xl font-bold text-gray-900">
              {typeof value === 'string' ? value : formatValue(value)}
            </p>
            
            {subtitle && (
              <p className="text-sm text-gray-500">{subtitle}</p>
            )}
            
            {change && (
              <div className={cn('flex items-center text-sm', getChangeColor())}>
                <span>{formatChange()} от предыдущего периода</span>
              </div>
            )}

            {trend && trendValue && (
              <div className={cn('flex items-center text-sm', getTrendColor())}>
                <span className="mr-1">{getTrendIcon()}</span>
                <span>{trendValue}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {children && <div className="mt-4">{children}</div>}
    </Card>
  );
}