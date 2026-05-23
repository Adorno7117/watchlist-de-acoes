import { Activity } from 'lucide-react';
import { useClock } from '../hooks/useClock';
import { formatClockTime } from '../utils/formatters';

export function LiveClock() {
  const currentTime = useClock();

  return (
    <div className="updated-at">
      <Activity size={18} />
      <span>{formatClockTime(currentTime)}</span>
    </div>
  );
}
