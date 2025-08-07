import dayjs, { Dayjs } from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

export interface WeekDay {
  date: Dayjs;
  dayName: string;
  fullDate: string;
  dateString: string; // YYYY-MM-DD format
}

export function getCurrentWeek(): WeekDay[] {
  const today = dayjs();
  const startOfWeek = today.startOf('isoWeek');
  
  const weekDays: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = startOfWeek.add(i, 'day');
    weekDays.push({
      date,
      dayName: date.format('ddd'),
      fullDate: date.format('MMM D'),
      dateString: date.format('YYYY-MM-DD')
    });
  }
  
  return weekDays;
}

export function getWeekRange(weekOffset: number = 0): WeekDay[] {
  const today = dayjs().add(weekOffset, 'week');
  const startOfWeek = today.startOf('isoWeek');
  
  const weekDays: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = startOfWeek.add(i, 'day');
    weekDays.push({
      date,
      dayName: date.format('ddd'),
      fullDate: date.format('MMM D'),
      dateString: date.format('YYYY-MM-DD')
    });
  }
  
  return weekDays;
}

export function getWeekRangeString(weekOffset: number = 0): string {
  const weekDays = getWeekRange(weekOffset);
  const firstDay = weekDays[0];
  const lastDay = weekDays[6];
  
  if (firstDay.date.month() === lastDay.date.month()) {
    return `${firstDay.date.format('MMMM D')}-${lastDay.date.format('D, YYYY')}`;
  } else {
    return `${firstDay.date.format('MMM D')} - ${lastDay.date.format('MMM D, YYYY')}`;
  }
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  
  if (start.isSame(end, 'day')) {
    return start.format('MMM D, YYYY');
  } else if (start.isSame(end, 'month')) {
    return `${start.format('MMM D')}-${end.format('D, YYYY')}`;
  } else {
    return `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`;
  }
}

export function generateDateRange(startDate: string, endDate: string): string[] {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const dates: string[] = [];
  
  let current = start;
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    dates.push(current.format('YYYY-MM-DD'));
    current = current.add(1, 'day');
  }
  
  return dates;
}
