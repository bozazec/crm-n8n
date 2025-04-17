import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify'; // Import toast
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
import { Input } from "@/components/ui/input"; // Import Input
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger, // We might trigger differently
} from "@/components/ui/alert-dialog"
import CreateContactForm from '@/components/contacts/CreateContactForm';
import EditContactForm from '@/components/contacts/EditContactForm';
import { Contact } from '@/types'; // Import Contact type from shared file
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select" // Import Select components
import ContactDetailsPanel from '@/components/contacts/ContactDetailsPanel';

// Define status options (consider moving to a constants file later)
const STATUS_OPTIONS = [
  { value: 'Lead', label: 'Lead' },
  { value: 'Prospect', label: 'Prospect' },
  { value: 'Customer', label: 'Customer' },
  { value: 'Lost', label: 'Lost' },
];

const ContactsPage = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false); // State for delete dialog
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null); // State for contact ID to delete
  const [isDeleting, setIsDeleting] = useState(false); // Loading state for delete operation
  const [searchTerm, setSearchTerm] = useState(""); // State for search term
  const [selectedStatus, setSelectedStatus] = useState<string>("all"); // State for status filter ("all" means no filter)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null); // Track which contact status is being updated
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null); // State for selected contact ID

  const fetchContacts = useCallback(async (currentSearchTerm: string, currentStatus: string) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('contacts')
        .select('id, user_id, name, email, company, status, source, tags, notes, created_at, updated_at');

      if (currentSearchTerm) {
        query = query.or(`name.ilike.%${currentSearchTerm}%,email.ilike.%${currentSearchTerm}%,company.ilike.%${currentSearchTerm}%`);
      }
      
      if (currentStatus !== "all") {
        query = query.eq('status', currentStatus);
      }

      if (user) { 
         query = query.eq('user_id', user.id); 
      }

      query = query.order('created_at', { ascending: false });

      const { data, error: fetchError } = await query;

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
  }, [user]);

  useEffect(() => {
    fetchContacts(searchTerm, selectedStatus);
  }, [fetchContacts, searchTerm, selectedStatus]);

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    fetchContacts(searchTerm, selectedStatus);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setIsEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setEditingContact(null);
    fetchContacts(searchTerm, selectedStatus);
  };

  const handleDelete = (contactId: string) => {
    setDeletingContactId(contactId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingContactId) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', deletingContactId);

      if (error) throw error;

      toast.success('Contact deleted successfully!');
      setDeletingContactId(null);
      setIsDeleteDialogOpen(false);
      fetchContacts(searchTerm, selectedStatus);
    } catch (error: any) {
      console.error("Error deleting contact:", error);
      toast.error(error.error_description || error.message || 'Failed to delete contact.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to handle inline status update
  const handleStatusChange = async (contactId: string, newStatus: string) => {
    setUpdatingStatusId(contactId); // Set loading state for this specific row
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ status: newStatus })
        .eq('id', contactId)
        .select('id') // Select minimal data to confirm update

      if (error) throw error;

      toast.success('Status updated!');
      // Optimistic update (optional) or refetch
      // To keep it simple, we refetch if the filter *was* based on status
      if (selectedStatus !== 'all') {
          fetchContacts(searchTerm, selectedStatus);
      } else {
          // Or update local state for faster feedback without full refetch
          setContacts(prevContacts => 
              prevContacts.map(c => c.id === contactId ? { ...c, status: newStatus } : c)
          );
      }

    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error(error.error_description || error.message || 'Failed to update status.');
    } finally {
      setUpdatingStatusId(null); // Clear loading state for this row
    }
  };

  // Function to handle row click
  const handleRowClick = (contactId: string) => {
    // If clicking the already selected row, deselect it, otherwise select the new one
    setSelectedContactId(prevId => prevId === contactId ? null : contactId);
  };

  return (
    // Use a flex container for two columns
    <div className="flex h-[calc(100vh-theme(space.14))]"> {/* Adjust height based on header height */}
      {/* Main Content Area (Filters + Table) */}
      <div className={`flex-1 overflow-y-auto p-6 ${selectedContactId ? 'pr-0' : ''}`}> 
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

        <div className="flex space-x-4 mb-4">
           <Input 
             placeholder="Search by name, email, company..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="max-w-sm"
           />
           <Select value={selectedStatus} onValueChange={setSelectedStatus}>
             <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>

        {loading && <p>Loading contacts...</p>}

        {error && <p className="text-red-500">Error: {error}</p>}

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
                  <TableRow 
                    key={contact.id} 
                    onClick={() => handleRowClick(contact.id)} 
                    className={`cursor-pointer hover:bg-muted/50 ${selectedContactId === contact.id ? 'bg-muted' : ''}`}
                  >
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>{contact.email}</TableCell>
                    <TableCell>{contact.company ?? '-'}</TableCell>
                    <TableCell onClick={(e: React.MouseEvent) => e.stopPropagation()}> 
                      <Select 
                        value={contact.status || ''} 
                        onValueChange={(newStatus) => handleStatusChange(contact.id, newStatus)}
                        disabled={updatingStatusId === contact.id} 
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                          <SelectValue placeholder="Set Status" /> 
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-xs">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{new Date(contact.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
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
                       No contacts found {searchTerm && "matching your search"}.
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

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the contact.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingContactId(null)} disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div> 

      {/* Details Panel Area */}
      {selectedContactId && (
        <div className="w-1/3 border-l bg-background overflow-y-auto p-6">
          <ContactDetailsPanel 
            contactId={selectedContactId} 
            onClose={() => setSelectedContactId(null)} // Add a way to close the panel
          />
        </div>
      )}
    </div>
  );
};

export default ContactsPage; 