import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/lib/supabaseClient';
import { ActivityLog, Contact } from '@/types';
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
import { X } from 'lucide-react';

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

// Function to fetch a single contact by ID
const fetchContactById = async (contactId: string | null | undefined): Promise<Contact | null> => {
  if (!contactId) {
    return null;
  }
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .maybeSingle();
  if (error) {
    console.error("Error fetching contact:", error);
    throw new Error(error.message || 'Failed to fetch contact details.');
  }
  return data;
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
    isLoading: isLoadingReminders, 
    isError: isErrorReminders,
    error: errorReminders 
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

  // --- React Query for Selected Contact Details --- 
  const selectedContactId = selectedReminder?.contact_id; // Get ID from selected reminder
  const { 
    data: contactDetails, 
    isLoading: isLoadingContact, 
    isError: isErrorContact, 
    error: errorContact 
  } = useQuery<Contact | null, Error>({
    queryKey: ['contact', selectedContactId], // Depends on selectedContactId
    queryFn: () => fetchContactById(selectedContactId),
    // Only run the query if a contact ID is available
    enabled: !!selectedContactId, 
    // Optional: Add staleTime if desired
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
      {isLoadingReminders && <p>Loading reminders...</p>}
      {isErrorReminders && <p className="text-red-500">Error: {errorReminders?.message || 'Failed to load reminders'}</p>}
      {!isLoadingReminders && !isErrorReminders && (
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

      {/* Reminder Details Section (Below Grid) */}
      {selectedReminder && (
        <div className="mt-6 p-4 border rounded-md bg-muted/50">
          <div className="flex justify-between items-start mb-4 pb-4 border-b">
            <h3 className="text-lg font-semibold">Details</h3>
            <Button onClick={() => setSelectedReminder(null)} variant="ghost" size="icon" className="-mt-2 -mr-2">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Two-column layout for details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Contact Details */}
            <div>
              <h4 className="font-semibold mb-2 text-base">Contact Info</h4>
              {isLoadingContact && <p className="text-sm text-muted-foreground">Loading contact...</p>}
              {isErrorContact && <p className="text-sm text-red-500">Error: {errorContact?.message || 'Failed to load contact'}</p>}
              {contactDetails && (
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Name:</span> {contactDetails.name}</p>
                  <p><span className="font-medium">Email:</span> {contactDetails.email}</p>
                  {contactDetails.company && 
                    <p><span className="font-medium">Company:</span> {contactDetails.company}</p>
                  }
                  {contactDetails.status && 
                     <p><span className="font-medium">Status:</span> {contactDetails.status}</p>
                   }
                  {/* Add other relevant contact fields */} 
                </div>
              )}
              {!isLoadingContact && !isErrorContact && !contactDetails && (
                 <p className="text-sm text-muted-foreground">Contact details not found.</p> 
              )}
            </div>

            {/* Right Column: Reminder Details */}
            <div>
              <h4 className="font-semibold mb-2 text-base">Reminder Info</h4>
              <div className="space-y-1 text-sm">
                 <p><span className="font-medium">Action:</span> {selectedReminder.action}</p>
                 {selectedReminder.description && 
                   <p><span className="font-medium">Description:</span> {selectedReminder.description}</p>
                 }
                 <p><span className="font-medium">Date:</span> {selectedReminder.reminder_at ? format(new Date(selectedReminder.reminder_at), 'PPP') : 'N/A'}</p>
                 <p><span className="font-medium">Logged:</span> {format(new Date(selectedReminder.created_at), 'Pp')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage; 