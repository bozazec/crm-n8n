import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react'; // Close icon
import { supabase } from '@/lib/supabaseClient';
import { ActivityLog } from '@/types'; // Import the type
import AddActivityLogForm from '@/components/activity/AddActivityLogForm'; // Import the form

interface ContactDetailsPanelProps {
  contactId: string;
  onClose: () => void;
}

const ContactDetailsPanel: React.FC<ContactDetailsPanelProps> = ({ contactId, onClose }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch logs for the specific contact
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('activity_logs')
        .select('*, reminder_at')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setLogs(data || []);
    } catch (err: any) {
      console.error("Error fetching activity logs:", err);
      setError(err.message || 'Failed to fetch logs.');
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  // Refetch logs when contactId changes
  useEffect(() => {
    if (contactId) {
      fetchLogs();
    }
  }, [contactId, fetchLogs]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 pb-4 border-b">
        <h2 className="text-xl font-semibold">Contact Details</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Add Activity Log Form */}
      <div className="mb-4">
        <AddActivityLogForm contactId={contactId} onSuccess={fetchLogs} />
      </div>

      {/* Activity Log List Area */}
      <div className="flex-grow overflow-y-auto">
        <h3 className="text-lg font-medium mb-2">Activity Log</h3>
        {loading && <p className="text-sm text-muted-foreground">Loading log...</p>}
        {error && <p className="text-sm text-red-500">Error: {error}</p>}
        {!loading && !error && (
          logs.length > 0 ? (
            <ul className="space-y-3">
              {logs.map((log) => (
                <li key={log.id} className="text-sm border-b pb-2 last:border-b-0">
                  <p className="font-medium">{log.action}</p>
                  {log.description && (
                    <p className="text-muted-foreground mt-1">{log.description}</p>
                  )}
                  {log.reminder_at && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Reminder: {new Date(log.reminder_at).toLocaleDateString()}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Logged: {new Date(log.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No activities logged yet.</p>
          )
        )}
      </div>
    </div>
  );
};

export default ContactDetailsPanel; 