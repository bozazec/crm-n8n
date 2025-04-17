import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/lib/supabaseClient';
import { ActivityLog } from '@/types';
import {
  startOfWeek, 
  endOfWeek, 
  addWeeks, 
  subWeeks, 
  eachDayOfInterval, 
  format, 
  isSameDay 
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Placeholder for Reminder Details Panel (create later)
// import ReminderDetailsPanel from '@/components/reminders/ReminderDetailsPanel';

// Function to fetch reminders (can be defined outside component or inline in useQuery)
const fetchRemindersForRange = async (userId: string | undefined, startDate: Date, endDate: Date): Promise<ActivityLog[]> => {
  if (!userId) {
    // Return empty array or throw error if user is required but not available
    return []; 
  }
  
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('reminder_at', startDate.toISOString())
    .lte('reminder_at', endDate.toISOString())
    .not('reminder_at', 'is', null)
    .order('reminder_at', { ascending: true });

  if (error) {
    console.error("Error fetching reminders:", error);
    throw new Error(error.message || 'Failed to fetch reminders.');
  }
  return data || [];
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [selectedReminder, setSelectedReminder] = useState<ActivityLog | null>(null);

  // Date Calculations (stable with useMemo)
  const { startOfPrevWeek, endOfNextWeek } = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
    const end = endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
    return { startOfPrevWeek: start, endOfNextWeek: end };
  }, []);

  // --- Use TanStack Query --- 
  const { 
    data: reminders = [], // Default to empty array
    isLoading, 
    isError,
    error 
  } = useQuery<ActivityLog[], Error>({
    // Query key includes user ID and dates to refetch if they change
    queryKey: ['reminders', user?.id, startOfPrevWeek, endOfNextWeek],
    // Query function calls our fetcher
    queryFn: () => fetchRemindersForRange(user?.id, startOfPrevWeek, endOfNextWeek),
    // Only run the query if the user is logged in
    enabled: !!user, 
    // Optional: Configure staleTime, cacheTime etc. if needed
    // staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // --- Grid Rendering Logic --- 
  // Recalculate daysInGrid based on memoized dates
  const daysInGrid = useMemo(() => 
      eachDayOfInterval({ start: startOfPrevWeek, end: endOfNextWeek }), 
      [startOfPrevWeek, endOfNextWeek]
  );

  // Group reminders by date (YYYY-MM-DD format for easy lookup)
  const remindersByDate = useMemo(() => {
    const map = new Map<string, ActivityLog[]>();
    reminders.forEach(reminder => {
      if (reminder.reminder_at) {
        // Fix: Directly extract the date part from the ISO string (UTC date)
        // This avoids local timezone conversion during grouping.
        const dateStr = reminder.reminder_at.substring(0, 10); // Extracts 'YYYY-MM-DD'
        
        const existing = map.get(dateStr) || [];
        map.set(dateStr, [...existing, reminder]);
      }
    });
    return map;
  }, [reminders]);

  // Week labels
  const weekLabels = ['Previous Week', 'Current Week', 'Next Week'];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      {user && <p className="text-muted-foreground mb-6">Welcome back, {user.email}</p>}
      
      <h2 className="text-2xl font-semibold mb-4">Reminders Preview</h2>

      {/* Reminder Grid Area - Use isLoading, isError from useQuery */}
      {isLoading && <p>Loading reminders...</p>}
      {isError && <p className="text-red-500">Error: {error?.message || 'Failed to load reminders'}</p>}
      {!isLoading && !isError && (
        <div className="border rounded-md overflow-hidden">
          {/* Grid Header (Days of Week) */}
          <div className="grid grid-cols-7 bg-muted/50 font-semibold text-sm">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center p-2 border-r last:border-r-0">{day}</div>
            ))}
          </div>

          {/* Grid Body (Weeks and Days) */}
          <div className="grid grid-cols-7 grid-rows-3"> {/* 7 days, 3 weeks */}
            {daysInGrid.map((day, index) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayReminders = remindersByDate.get(dayKey) || [];
              const weekIndex = Math.floor(index / 7);
              const isFirstDayOfWeek = index % 7 === 0;
              const today = new Date(); // define today here or pass it down

              return (
                <div 
                  key={dayKey} 
                  className={cn(
                    "relative p-2 border-r border-t min-h-[80px] flex flex-col last:border-r-0",
                    isSameDay(day, today) && "bg-primary/10"
                  )}
                >
                  {/* Display Week Label on the first day */} 
                  {isFirstDayOfWeek && weekIndex < weekLabels.length && (
                      <span className="absolute top-1 left-1 text-xs font-bold text-muted-foreground opacity-50">
                          {weekLabels[weekIndex]}
                      </span>
                  )}
                  {/* Day Number */}
                  <span className={`text-xs font-medium ${isSameDay(day, today) ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                    {format(day, 'd')}
                  </span>
                  {/* Reminder Nodes */}
                  <div className="flex-grow mt-1 space-y-1 overflow-hidden">
                    {dayReminders.map(reminder => (
                      <button 
                        key={reminder.id}
                        onClick={() => setSelectedReminder(reminder)} // Set selected reminder
                        className="w-full text-left text-xs bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 rounded px-1 py-0.5 truncate block"
                        title={`${reminder.action}: ${reminder.description || 'No description'}`}
                      >
                        {/* Simple display: action or description */}
                        {reminder.action} {reminder.description ? `- ${reminder.description}` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reminder Details Panel (Placeholder for now) */}
      {selectedReminder && (
        <div className="fixed inset-y-0 right-0 w-1/3 max-w-md bg-background border-l shadow-lg p-6 overflow-y-auto z-10">
            <p>Details for Reminder ID: {selectedReminder.id}</p>
            <pre className="text-xs bg-muted p-2 rounded mt-2">{JSON.stringify(selectedReminder, null, 2)}</pre>
            <Button onClick={() => setSelectedReminder(null)} variant="outline" size="sm" className="mt-4">Close</Button>
          {/* Replace with actual ReminderDetailsPanel component later
           <ReminderDetailsPanel 
             reminder={selectedReminder}
             onClose={() => setSelectedReminder(null)}
           /> 
          */}
        </div>
      )}
    </div>
  );
};

export default DashboardPage; 