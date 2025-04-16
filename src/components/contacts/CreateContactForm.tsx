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

// Validation Schema - Adjust fields as needed
// Making non-required fields optional
const contactFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  company: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  // tags: z.array(z.string()).optional(), // Handle array input later if needed
  notes: z.string().optional(),
})

type ContactFormValues = z.infer<typeof contactFormSchema>;

interface CreateContactFormProps {
  onSuccess: () => void; // Callback to close dialog and refetch
}

const CreateContactForm: React.FC<CreateContactFormProps> = ({ onSuccess }) => {
  const { user } = useAuth(); // Needed to set user_id
  const [loading, setLoading] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      status: "", // Set a default status if desired
      source: "",
      notes: "",
    },
  })

  async function onSubmit(values: ContactFormValues) {
    if (!user) {
      toast.error("You must be logged in to create a contact.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('contacts')
        .insert([
          {
            user_id: user.id,
            name: values.name,
            email: values.email,
            company: values.company || null,
            status: values.status || null,
            source: values.source || null,
            notes: values.notes || null,
            // tags: values.tags || [], // Add tags if handling them
          }
        ])
        .select() // Select to check if insert worked (returns data/error)

      if (error) throw error;

      toast.success('Contact created successfully!');
      form.reset(); // Reset form fields
      onSuccess(); // Call the success callback
    } catch (error: any) {
      console.error("Error creating contact:", error);
      toast.error(error.error_description || error.message || 'Failed to create contact.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
        {/* Add fields for status, source, tags later - potentially using Select for status */}
         <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <FormControl>
                <Input placeholder="Lead" {...field} disabled={loading} /> 
                 {/* Replace with Select component later */}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Initial contact notes..." {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating...' : 'Create Contact'}
        </Button>
      </form>
    </Form>
  );
};

export default CreateContactForm; 