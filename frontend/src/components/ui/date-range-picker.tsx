import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Calendar, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';

interface DateRangeValue {
  start: Date;
  end: Date;
}

interface DateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onDateRangeChange?: (startDate: Date, endDate: Date) => void;
  value?: DateRangeValue;
  onChange?: (value: DateRangeValue) => void;
  className?: string;
}

export function DateRangePicker({
  startDate: startDateProp,
  endDate: endDateProp,
  onDateRangeChange,
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  // Support both old (startDate/endDate) and new (value/onChange) API
  const startDate = value?.start ?? startDateProp;
  const endDate = value?.end ?? endDateProp;
  
  const handleDateChange = (start: Date, end: Date) => {
    if (onChange) {
      onChange({ start, end });
    }
    if (onDateRangeChange) {
      onDateRangeChange(start, end);
    }
  };

  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(
    startDate ? format(startDate, 'yyyy-MM-dd') : ''
  );
  const [tempEndDate, setTempEndDate] = useState(
    endDate ? format(endDate, 'yyyy-MM-dd') : ''
  );

  useEffect(() => {
    if (startDate) setTempStartDate(format(startDate, 'yyyy-MM-dd'));
    if (endDate) setTempEndDate(format(endDate, 'yyyy-MM-dd'));
  }, [startDate, endDate]);

  const handleApply = () => {
    if (tempStartDate && tempEndDate) {
      handleDateChange(new Date(tempStartDate), new Date(tempEndDate));
      setIsOpen(false);
    }
  };

  const handlePresetClick = (preset: string) => {
    const now = new Date();
    let start: Date, end: Date;

    switch (preset) {
      case 'thisMonth':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'lastMonth':
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      case 'last3Months':
        start = startOfMonth(subMonths(now, 2));
        end = endOfMonth(now);
        break;
      case 'thisYear':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      default:
        return;
    }

    handleDateChange(start, end);
    setTempStartDate(format(start, 'yyyy-MM-dd'));
    setTempEndDate(format(end, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const formatDisplayDate = () => {
    if (!startDate || !endDate) return 'Выберите период';
    
    return `${format(startDate, 'dd MMM', { locale: ru })} - ${format(
      endDate,
      'dd MMM yyyy',
      { locale: ru }
    )}`;
  };

  return (
    <div className={className}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-start text-left font-normal"
      >
        <Calendar className="mr-2 h-4 w-4" />
        {formatDisplayDate()}
      </Button>

      {isOpen && (
        <Card className="absolute z-50 mt-2 p-4 bg-white shadow-lg border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Выбор периода</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Быстрый выбор */}
          <div className="space-y-2 mb-4">
            <Label className="text-sm font-medium">Быстрый выбор</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick('thisMonth')}
              >
                Текущий месяц
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick('lastMonth')}
              >
                Прошлый месяц
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick('last3Months')}
              >
                3 месяца
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick('thisYear')}
              >
                Текущий год
              </Button>
            </div>
          </div>

          {/* Ручной выбор */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="startDate" className="text-sm">
                Начальная дата
              </Label>
              <Input
                id="startDate"
                type="date"
                value={tempStartDate}
                onChange={(e) => setTempStartDate(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="endDate" className="text-sm">
                Конечная дата
              </Label>
              <Input
                id="endDate"
                type="date"
                value={tempEndDate}
                onChange={(e) => setTempEndDate(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleApply}
                disabled={!tempStartDate || !tempEndDate}
              >
                Применить
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Отмена
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}