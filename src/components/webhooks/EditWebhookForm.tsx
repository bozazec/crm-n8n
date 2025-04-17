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
// NOTE: Event trigger cannot be edited, so no Select component needed
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'react-toastify'
import { useState, useEffect } from 'react'
import { Webhook } from '@/types' // Import the Webhook type

// Define available event triggers (needed for display, even if not editable)
// Consider moving to shared constants
const EVENT_TRIGGERS = [
  { value: 'contact.created', label: 'Contact Created' },
  { value: 'contact.updated', label: 'Contact Updated' },
  { value: 'activity.created', label: 'Activity Updated' },
];

// Validation Schema for Edit - Event trigger is not part of the form
const webhookEditSchema = z.object({
  url: z.string()
         .min(1, { message: "Webhook path is required." })
         .startsWith('/', { message: "Path must start with /" }),
  description: z.string().optional(),
});

type WebhookEditFormValues = z.infer<typeof webhookEditSchema>;

interface EditWebhookFormProps {
  webhook: Webhook; // The webhook being edited
  onSuccess: () => void; // Callback to close dialog and refetch
}

const EditWebhookForm: React.FC<EditWebhookFormProps> = ({ webhook, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<WebhookEditFormValues>({
    resolver: zodResolver(webhookEditSchema),
    // Pre-fill form with existing webhook data
    defaultValues: {
      url: webhook.url || "",
      description: webhook.description || "",
    },
  })

  // Update form if the webhook prop changes (though unlikely in a dialog)
  useEffect(() => {
    form.reset({
      url: webhook.url || "",
      description: webhook.description || "",
    });
  }, [webhook, form]); // Include form in dependencies

  async function onSubmit(values: WebhookEditFormValues) {
    setLoading(true);
    try {
      // Use update instead of insert
      const { error } = await supabase
        .from('webhooks')
        .update({
            // Don't update user_id or event_trigger
            url: values.url,
            description: values.description || null,
            // updated_at is handled by Supabase trigger/policy
        })
        .eq('id', webhook.id) // Specify which webhook to update
        .select(); // Check if update worked (optional)

      if (error) {
        // Handle potential errors (e.g., RLS fails)
        throw error;
      }

      toast.success('Webhook updated successfully!');
      form.reset(); // Reset form after successful submission
      onSuccess(); // Close dialog and refetch
    } catch (error: any) {
      console.error("Error updating webhook:", error);
      toast.error(error.message || 'Failed to update webhook.');
    } finally {
      setLoading(false);
    }
  }

  // Find the label for the non-editable event trigger
  const eventTriggerLabel = EVENT_TRIGGERS.find(t => t.value === webhook.event_trigger)?.label || webhook.event_trigger;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Display Event Trigger (Non-Editable) */}
        <FormItem>
          <FormLabel>Event Trigger</FormLabel>
          <Input value={eventTriggerLabel} readOnly disabled className="bg-muted"/>
          <FormMessage /> { /* For schema errors if we added validation */ }
        </FormItem>

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
                <Textarea placeholder="Describe what this webhook does..." {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Saving Changes...' : 'Save Changes'}
        </Button>
      </form>
    </Form>
  );
};

export default EditWebhookForm; 