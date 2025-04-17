import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Webhook } from '@/types';
import { toast } from 'react-toastify';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"
import AddWebhookForm from '@/components/webhooks/AddWebhookForm';
import EditWebhookForm from '@/components/webhooks/EditWebhookForm';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog"

const WebhooksPage = () => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<Webhook | null>(null);
  const [webhookToEdit, setWebhookToEdit] = useState<Webhook | null>(null);

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('webhooks')
        .select('id, user_id, event_trigger, url, description, created_at')
        // RLS policy filters by user_id on the backend
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setWebhooks(data || []);
    } catch (err: any) {
      console.error("Error fetching webhooks:", err);
      setError(err.message || 'Failed to fetch webhooks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleAddSuccess = () => {
      setIsAddDialogOpen(false);
      fetchWebhooks();
  };

  const handleEdit = (webhook: Webhook) => {
    setWebhookToEdit(webhook);
  };

  const handleEditSuccess = () => {
    setWebhookToEdit(null);
    fetchWebhooks();
  };

  const requestDeleteWebhook = (webhook: Webhook) => {
    setWebhookToDelete(webhook);
  };

  const confirmDeleteWebhook = async () => {
    if (!webhookToDelete) return;
    setLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', webhookToDelete.id);

      if (deleteError) throw deleteError;

      toast.success(`Webhook for "${webhookToDelete.event_trigger}" deleted successfully!`);
      setWebhookToDelete(null);
      fetchWebhooks();
    } catch (err: any) {
      console.error("Error deleting webhook:", err);
      toast.error(err.message || 'Failed to delete webhook.');
      setError(err.message || 'Failed to delete webhook.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div>
       <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">Webhook Integrations</h1>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>Add Webhook</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Webhook</DialogTitle>
                  <DialogDescription>
                    Configure a new n8n workflow trigger.
                  </DialogDescription>
                </DialogHeader>
                <AddWebhookForm onSuccess={handleAddSuccess} />
              </DialogContent>
            </Dialog>
        </div>
        <p className="text-muted-foreground mb-6">
            Connect CRM events to your n8n workflows.
        </p>

        {loading && <p>Loading webhooks...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}

        {!loading && !error && (
             <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Event Trigger</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Webhook URL</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {webhooks.length > 0 ? (
                    webhooks.map((webhook) => (
                        <TableRow key={webhook.id}>
                        <TableCell className="font-medium">{webhook.event_trigger}</TableCell>
                        <TableCell>{webhook.description ?? '-'}</TableCell>
                        <TableCell className="max-w-xs truncate" title={webhook.url}>{webhook.url}</TableCell>
                        <TableCell>{new Date(webhook.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(webhook)}>
                                Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => requestDeleteWebhook(webhook)}
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
                        <TableCell colSpan={5} className="h-24 text-center">
                        No webhooks configured yet.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
            </Table>
        )}

        <AlertDialog open={!!webhookToDelete} onOpenChange={(open) => !open && setWebhookToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the webhook triggering on
                    <span className="font-semibold"> {webhookToDelete?.event_trigger}</span>
                    {webhookToDelete?.description && ` (${webhookToDelete.description})`}.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setWebhookToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteWebhook} disabled={loading} className="bg-red-600 hover:bg-red-700">
                    {loading ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={!!webhookToEdit} onOpenChange={(open) => !open && setWebhookToEdit(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Webhook</DialogTitle>
              <DialogDescription>
                Update the path or description for the <span className="font-semibold">{webhookToEdit?.event_trigger}</span> trigger.
              </DialogDescription>
            </DialogHeader>
            {webhookToEdit && (
              <EditWebhookForm 
                webhook={webhookToEdit} 
                onSuccess={handleEditSuccess} 
              />
            )}
          </DialogContent>
        </Dialog>

    </div>
  );
};

export default WebhooksPage; 