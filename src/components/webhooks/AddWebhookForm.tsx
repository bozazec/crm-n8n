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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'react-toastify'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// Define available event triggers
// TODO: Move to shared constants
const EVENT_TRIGGERS = [
  { value: 'contact.created', label: 'Contact Created' },
  { value: 'contact.updated', label: 'Contact Updated' },
  { value: 'activity.created', label: 'Activity Updated' },
];

// Validation Schema
const webhookFormSchema = z.object({
  event_trigger: z.string().min(1, { message: "Event trigger is required." }),
  url: z.string()
         .min(1, { message: "Webhook path is required." })
         .startsWith('/', { message: "Path must start with /" }),
  description: z.string().optional(),
});

type WebhookFormValues = z.infer<typeof webhookFormSchema>;

interface AddWebhookFormProps {
  onSuccess: () => void; // Callback to close dialog and refetch
}

const AddWebhookForm: React.FC<AddWebhookFormProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: {
      event_trigger: "",
      url: "",
      description: "",
    },
  })

  async function onSubmit(values: WebhookFormValues) {
    if (!user) {
      toast.error("You must be logged in.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('webhooks')
        .insert([
          {
            user_id: user.id,
            event_trigger: values.event_trigger,
            url: values.url,
            description: values.description || null,
          }
        ])
        .select();

      if (error) {
        // Handle specific error for unique constraint violation
        if (error.code === '23505') { // PostgreSQL unique violation code
          throw new Error(`Webhook already exists for event: ${values.event_trigger}`);
        } else {
          throw error;
        }
      }

      toast.success('Webhook added successfully!');
      form.reset();
      onSuccess();
    } catch (error: any) {
      console.error("Error adding webhook:", error);
      toast.error(error.message || 'Failed to add webhook.'); // Use error.message directly
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="event_trigger"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Trigger *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an event" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EVENT_TRIGGERS.map((trigger) => (
                    <SelectItem key={trigger.value} value={trigger.value}>
                      {trigger.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Webhook Path *</FormLabel>
              <FormControl>
                <Input placeholder="/webhook/your-n8n-webhook-path" {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Send welcome email on new contact" {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Adding...' : 'Add Webhook'}
        </Button>
      </form>
    </Form>
  );
};

export default AddWebhookForm; 