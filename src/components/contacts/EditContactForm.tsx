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
import { useState, useEffect } from 'react'
import { Contact } from '@/types'

// Schema (same as create for now, but could differ)
const contactFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  company: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
})

type ContactFormValues = z.infer<typeof contactFormSchema>;

interface EditContactFormProps {
  contact: Contact; // Pass the contact to edit
  onSuccess: () => void; // Callback to close dialog and refetch
}

const EditContactForm: React.FC<EditContactFormProps> = ({ contact, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    // Pre-fill form with existing contact data
    defaultValues: {
      name: contact.name || "",
      email: contact.email || "",
      company: contact.company || "",
      status: contact.status || "",
      source: "", // Add source field if needed
      notes: "", // Add notes field if needed
    },
  })

  // Use useEffect to update form values if the contact prop changes
  // (e.g., if the dialog remains open and user selects another contact - though not typical here)
  useEffect(() => {
    form.reset({
      name: contact.name || "",
      email: contact.email || "",
      company: contact.company || "",
      status: contact.status || "",
      source: contact.source || "", // Add source
      notes: contact.notes || "", // Add notes
      // Don't reset id, user_id, created_at, updated_at as they aren't form fields
    });
    // Ensure form.reset is included in dependency array
  }, [contact, form, form.reset]);

  async function onSubmit(values: ContactFormValues) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          name: values.name,
          email: values.email,
          company: values.company || null,
          status: values.status || null,
          source: values.source || null,
          notes: values.notes || null,
          // updated_at is handled by the trigger
        })
        .eq('id', contact.id) // Specify which contact to update
        .select() // Check if update worked

      if (error) throw error;

      toast.success('Contact updated successfully!');
      onSuccess(); // Call the success callback (closes dialog, refetches)
    } catch (error: any) {
      console.error("Error updating contact:", error);
      toast.error(error.error_description || error.message || 'Failed to update contact.');
    } finally {
      setLoading(false);
    }
  }

  return (
    // Form structure is identical to CreateContactForm
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
         {/* Name Field */}
         <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Email Field */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input placeholder="john.doe@example.com" {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Company Field */}
        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company</FormLabel>
              <FormControl>
                <Input placeholder="Acme Inc." {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Status Field */}
         <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <FormControl>
                <Input placeholder="Lead" {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Notes Field */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Contact notes..." {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </Form>
  );
};

export default EditContactForm; 