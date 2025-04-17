import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'react-toastify'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { DatePicker } from "@/components/ui/date-picker"
import { triggerWebhook } from '@/lib/webhookUtils'

// Define common actions (can be expanded)
const ACTIVITY_ACTIONS = [
  'Called', 'Sent Email', 'Meeting', 'Note', 'Created', 'Updated'
];

// Validation Schema
const activityLogSchema = z.object({
  action: z.string().min(1, { message: "Action type is required." }),
  description: z.string().optional(),
  reminder_at: z.date().optional(),
});

type ActivityLogFormValues = z.infer<typeof activityLogSchema>;

interface AddActivityLogFormProps {
  contactId: string;
  onSuccess: () => void; // Callback to refetch logs
}

const AddActivityLogForm: React.FC<AddActivityLogFormProps> = ({ contactId, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm<ActivityLogFormValues>({
    resolver: zodResolver(activityLogSchema),
    defaultValues: {
      action: "Note",
      description: "",
      reminder_at: undefined,
    },
  })

  async function onSubmit(values: ActivityLogFormValues) {
    if (!user) {
      toast.error("You must be logged in.");
      return;
    }
    setLoading(true);
    try {
      const reminderTimestamp = values.reminder_at 
        ? values.reminder_at.toISOString() 
        : null;

      const { data: newActivity, error } = await supabase
        .from('activity_logs')
        .insert([
          {
            user_id: user.id,
            contact_id: contactId,
            action: values.action,
            description: values.description || null,
            reminder_at: reminderTimestamp,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      if (newActivity) {
        triggerWebhook('activity.created', { userId: user.id, data: newActivity });
      }

      toast.success('Activity logged successfully!');
      form.reset();
      onSuccess();
    } catch (error: any) {
      console.error("Error logging activity:", error);
      toast.error(error.error_description || error.message || 'Failed to log activity.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] items-start">
        <FormField
          control={form.control}
          name="action"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Action</FormLabel>
              <FormControl>
                <Input list="activity-actions" placeholder="Action (e.g., Called, Note)" {...field} disabled={loading} />
              </FormControl>
              <datalist id="activity-actions">
                {ACTIVITY_ACTIONS.map(action => <option key={action} value={action} />)}
              </datalist>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="col-span-full sm:col-span-1 sm:row-start-2">
              <FormLabel className="sr-only">Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Add details..." {...field} disabled={loading} rows={2} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reminder_at"
          render={({ field }) => (
            <FormItem className="col-span-full sm:col-span-1 sm:row-start-3">
              <FormLabel>Reminder (Optional)</FormLabel>
              <FormControl>
                <DatePicker 
                  date={field.value} 
                  setDate={field.onChange} 
                  disabled={loading} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button 
          type="submit" 
          disabled={loading} 
          className="col-span-full sm:col-start-2 sm:row-start-1 sm:self-start"
        >
          {loading ? 'Logging...' : 'Log Activity'}
        </Button>
      </form>
    </Form>
  );
};

export default AddActivityLogForm; 