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
} from 'recharts';
import { Card } from '@/components/ui/card';

interface ChartData {
  name: string;
  value: number;
  color?: string;
}

interface ExpensePieChartProps {
  data: ChartData[];
  title?: string;
  className?: string;
}

export function ExpensePieChart({ data, title, className }: ExpensePieChartProps) {
  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow border">
          <p className="font-medium">{data.name}</p>
          <p className="text-blue-600">{formatCurrency(data.value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={`p-6 ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

interface MonthlyTrendProps {
  data: {
    month: string;
    income: number;
    expenses: number;
    savings: number;
  }[];
  title?: string;
  className?: string;
}

export function MonthlyTrendChart({ data, title, className }: MonthlyTrendProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className={`p-6 ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={formatCurrency} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="income" 
            stroke="#10B981" 
            strokeWidth={2}
            name="Доходы"
          />
          <Line 
            type="monotone" 
            dataKey="expenses" 
            stroke="#EF4444" 
            strokeWidth={2}
            name="Расходы"
          />
          <Line 
            type="monotone" 
            dataKey="savings" 
            stroke="#3B82F6" 
            strokeWidth={2}
            name="Сбережения"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

interface BudgetProgressProps {
  data: {
    category: string;
    budgeted: number;
    spent: number;
    remaining: number;
  }[];
  title?: string;
  className?: string;
}

export function BudgetProgressChart({ data, title, className }: BudgetProgressProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className={`p-6 ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={formatCurrency} />
          <YAxis dataKey="category" type="category" width={120} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Legend />
          <Bar dataKey="budgeted" fill="#E5E7EB" name="Запланировано" />
          <Bar dataKey="spent" fill="#3B82F6" name="Потрачено" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// Generic PieChart component
interface CustomPieChartProps {
  data: ChartData[];
  height?: number;
  valueFormatter?: (value: number) => string;
}

export function CustomPieChart({ data, height = 300, valueFormatter }: CustomPieChartProps) {
  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  const defaultFormatter = (value: number) => value.toString();
  const formatter = valueFormatter || defaultFormatter;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow border">
          <p className="text-gray-700">{formatter(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Generic LineChart component
interface CustomLineChartProps {
  data: any[];
  height?: number;
  valueFormatter?: (value: number) => string;
  lines?: Array<{
    key: string;
    color: string;
    name: string;
  }>;
}

export function CustomLineChart({ 
  data, 
  height = 300, 
  valueFormatter, 
  lines = [{ key: 'value', color: '#3B82F6', name: 'Значение' }] 
}: CustomLineChartProps) {
  const defaultFormatter = (value: number) => value.toString();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip formatter={valueFormatter || defaultFormatter} />
        <Legend />
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            stroke={line.color}
            name={line.name}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}