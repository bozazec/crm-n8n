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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

// Same status options as in ContactsPage
// TODO: Move this to a shared constants file
const STATUS_OPTIONS = [
  { value: 'Lead', label: 'Lead' },
  { value: 'Prospect', label: 'Prospect' },
  { value: 'Customer', label: 'Customer' },
  { value: 'Lost', label: 'Lost' },
];

const CreateContactForm: React.FC<CreateContactFormProps> = ({ onSuccess }) => {
  const { user } = useAuth(); // Needed to set user_id
  const [loading, setLoading] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      status: "Lead", // Default to Lead, or leave empty: ""
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
      // Insert the contact and select the newly created record
      const { data: newContactData, error: contactError } = await supabase
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
          }
        ])
        .select() // Select the inserted record
        .single(); // Expecting a single record back

      if (contactError) throw contactError;

      if (!newContactData) {
        throw new Error("Failed to create contact or retrieve new contact ID.");
      }

      toast.success('Contact created successfully!');
      
      // --- Automatic Activity Logging --- 
      try {
          const { error: logError } = await supabase
            .from('activity_logs')
            .insert([
              {
                user_id: user.id,
                contact_id: newContactData.id, // Use the ID from the created contact
                action: 'Created',
                description: `Contact ${newContactData.name} created.`, // Optional description
              }
            ]);
          
          if (logError) {
              // Log the error but don't necessarily block the user 
              console.error("Error logging contact creation activity:", logError);
              toast.warning('Contact created, but failed to log activity.'); 
          }
      } catch(logCatchError) {
          console.error("Error in activity logging block:", logCatchError);
      }
      // --- End Automatic Activity Logging ---

      form.reset();
      onSuccess(); // Call the success callback (closes dialog, refetches contacts)
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
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
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