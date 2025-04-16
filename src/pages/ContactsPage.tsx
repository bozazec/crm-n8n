import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  // DropdownMenuLabel, // Not used here
  // DropdownMenuSeparator, // Not used here
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from 'lucide-react'; // Import icon
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import CreateContactForm from '@/components/contacts/CreateContactForm';
import EditContactForm from '@/components/contacts/EditContactForm';
import { Contact } from '@/types'; // Import Contact type from shared file

const ContactsPage = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('contacts')
        .select('id, user_id, name, email, company, status, source, tags, notes, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }
      setContacts(data || []);
    } catch (err: any) {
      console.error("Error fetching contacts:", err);
      setError(err.message || 'Failed to fetch contacts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    fetchContacts();
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setIsEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setEditingContact(null);
    fetchContacts();
  };

  const handleDelete = (contactId: string) => {
    console.log('Delete contact ID:', contactId);
    // We will implement the Delete confirmation later
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Contacts</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create Contact</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Contact</DialogTitle>
              <DialogDescription>
                Fill in the details below to add a new contact.
              </DialogDescription>
            </DialogHeader>
            <CreateContactForm onSuccess={handleCreateSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Display Loading State */}
      {loading && <p>Loading contacts...</p>}

      {/* Display Error State */}
      {error && <p className="text-red-500">Error: {error}</p>}

      {/* Display Table when not loading and no error */}
      {!loading && !error && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length > 0 ? (
              contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>{contact.email}</TableCell>
                  <TableCell>{contact.company ?? '-'}</TableCell>
                  <TableCell>{contact.status ?? '-'}</TableCell>
                  <TableCell>{new Date(contact.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(contact)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(contact.id)}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No contacts found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {editingContact && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Contact</DialogTitle>
              <DialogDescription>
                Update the contact details below.
              </DialogDescription>
            </DialogHeader>
            <EditContactForm 
              contact={editingContact} 
              onSuccess={handleEditSuccess} 
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ContactsPage; 