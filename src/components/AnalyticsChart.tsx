import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface AnalyticsData {
  date: string;
  visits: number;
  messagesReceived: number;
}

interface AnalyticsChartProps {
  data: AnalyticsData[];
}

export default function AnalyticsChart({ data }: AnalyticsChartProps) {
  const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));

  if (data.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-gray-400 font-medium italic">
        No activity data yet.
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" debounce={1} minWidth={0} minHeight={0}>
        <AreaChart
          data={sortedData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ec4899" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(str) => format(parseISO(str), 'MMM d')}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #f1f5f9',
              borderRadius: '12px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="visits" 
            stroke="#6366f1" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorVisits)" 
            name="Visits"
          />
          <Area 
            type="monotone" 
            dataKey="messagesReceived" 
            stroke="#ec4899" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorMessages)" 
            name="Messages"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
