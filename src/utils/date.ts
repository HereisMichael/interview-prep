import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export function formatDate(date: string | Date, format = 'YYYY-MM-DD HH:mm'): string {
  return dayjs(date).format(format);
}

export function formatRelative(date: string | Date): string {
  return dayjs(date).fromNow();
}

export function addDays(date: string | Date, days: number): string {
  return dayjs(date).add(days, 'day').toISOString();
}

export function isToday(date: string | Date): boolean {
  return dayjs(date).isSame(dayjs(), 'day');
}

export function daysBetween(a: string | Date, b: string | Date): number {
  return dayjs(b).diff(dayjs(a), 'day');
}
