import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Trash2, Upload, Download, AlertTriangle, XCircle, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';

interface SuppressionEntry {
  id: string;
  email: string;
  reason: string;
  source_campaign_id: string | null;
  notes: string | null;
  created_at: string;
}

export function SMTPSuppressionList() {
  const [entries, setEntries] = useState<SuppressionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterReason, setFilterReason] = useState('all');
  const [formData, setFormData] = useState({
    email: '',
    reason: 'manual',
    notes: '',
  });
  const [bulkEmails, setBulkEmails] = useState('');
  const { toast } = useToast();

  const fetchEntries = useCallback(async () => {
    try {
      let query = supabase
        .from('smtp_suppression_list')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterReason !== 'all') {
        query = query.eq('reason', filterReason);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching suppression list:', error);
      toast({ title: 'Error', description: 'Failed to load suppression list', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [filterReason, toast]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleAdd = async () => {
    if (!formData.email) return;

    try {
      const { error } = await supabase
        .from('smtp_suppression_list')
        .insert({
          email: formData.email.toLowerCase().trim(),
          reason: formData.reason,
          notes: formData.notes || null,
        });

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Duplicate', description: 'This email is already suppressed', variant: 'default' });
        } else {
          throw error;
        }
      } else {
        toast({ title: 'Added', description: 'Email added to suppression list' });
        setShowAddModal(false);
        setFormData({ email: '', reason: 'manual', notes: '' });
        fetchEntries();
      }
    } catch (error: any) {
      console.error('Error adding to suppression list:', error);
      toast({ title: 'Error', description: error.message || 'Failed to add', variant: 'destructive' });
    }
  };

  const handleBulkAdd = async () => {
    const emails = bulkEmails
      .split('\n')
      .map(e => e.trim().toLowerCase())
      .filter(e => e && e.includes('@'));

    if (emails.length === 0) {
      toast({ title: 'No Emails', description: 'Please enter valid email addresses', variant: 'destructive' });
      return;
    }

    try {
      const inserts = emails.map(email => ({
        email,
        reason: 'manual' as const,
        notes: 'Bulk import',
      }));

      const { error } = await supabase
        .from('smtp_suppression_list')
        .upsert(inserts, { onConflict: 'email,reason', ignoreDuplicates: true });

      if (error) throw error;
      
      toast({ title: 'Imported', description: `Added ${emails.length} emails to suppression list` });
      setShowBulkModal(false);
      setBulkEmails('');
      fetchEntries();
    } catch (error: any) {
      console.error('Error bulk adding:', error);
      toast({ title: 'Error', description: error.message || 'Failed to import', variant: 'destructive' });
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('smtp_suppression_list')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Removed', description: 'Email removed from suppression list' });
      fetchEntries();
    } catch (error) {
      console.error('Error removing:', error);
      toast({ title: 'Error', description: 'Failed to remove', variant: 'destructive' });
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Email', 'Reason', 'Notes', 'Added At'].join(','),
      ...entries.map(e => [
        e.email,
        e.reason,
        `"${(e.notes || '').replace(/"/g, '""')}"`,
        format(new Date(e.created_at), 'yyyy-MM-dd HH:mm:ss'),
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suppression_list_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Exported', description: `Exported ${entries.length} entries` });
  };

  const getReasonBadge = (reason: string) => {
    const styles: Record<string, string> = {
      hard_bounce: 'bg-destructive/20 text-destructive',
      soft_bounce: 'bg-warning/20 text-warning',
      unsubscribed: 'bg-muted text-muted-foreground',
      spam_complaint: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      manual: 'bg-primary/20 text-primary',
    };
    const labels: Record<string, string> = {
      hard_bounce: 'Hard Bounce',
      soft_bounce: 'Soft Bounce',
      unsubscribed: 'Unsubscribed',
      spam_complaint: 'Spam Complaint',
      manual: 'Manual',
    };
    return <Badge className={styles[reason] || styles.manual}>{labels[reason] || reason}</Badge>;
  };

  const filteredEntries = entries.filter(e => 
    e.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats - single pass
  const stats = (() => {
    let hardBounce = 0, unsubscribed = 0, spam = 0;
    for (const e of entries) {
      if (e.reason === 'hard_bounce') hardBounce++;
      else if (e.reason === 'unsubscribed') unsubscribed++;
      else if (e.reason === 'spam_complaint') spam++;
    }
    return { total: entries.length, hardBounce, unsubscribed, spam };
  })();

  if (loading) {
    return <div className="animate-pulse">Loading suppression list...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Suppressed</p>
                <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
              </div>
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated border-l-4 border-l-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hard Bounces</p>
                <p className="text-2xl font-bold text-destructive">{stats.hardBounce.toLocaleString()}</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unsubscribed</p>
                <p className="text-2xl font-bold">{stats.unsubscribed.toLocaleString()}</p>
              </div>
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated border-l-4 border-l-warning">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Spam Complaints</p>
                <p className="text-2xl font-bold text-warning">{stats.spam.toLocaleString()}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Suppression List</CardTitle>
          <CardDescription>
            Emails that won't receive any marketing communications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search emails..."
                className="pl-10"
              />
            </div>
            <Select value={filterReason} onValueChange={setFilterReason}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reasons</SelectItem>
                <SelectItem value="hard_bounce">Hard Bounce</SelectItem>
                <SelectItem value="soft_bounce">Soft Bounce</SelectItem>
                <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                <SelectItem value="spam_complaint">Spam Complaint</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setShowBulkModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Bulk Import
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={entries.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Email
            </Button>
          </div>

          {/* Table */}
          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {searchTerm ? 'No emails match your search' : 'No suppressed emails yet'}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.slice(0, 100).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-sm">{entry.email}</TableCell>
                      <TableCell>{getReasonBadge(entry.reason)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {entry.notes || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(entry.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(entry.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredEntries.length > 100 && (
                <div className="p-4 text-center text-sm text-muted-foreground bg-muted/50">
                  Showing first 100 of {filteredEntries.length} entries
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Single Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Suppression List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={formData.reason} onValueChange={(val) => setFormData({ ...formData, reason: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="hard_bounce">Hard Bounce</SelectItem>
                  <SelectItem value="soft_bounce">Soft Bounce</SelectItem>
                  <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                  <SelectItem value="spam_complaint">Spam Complaint</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Reason for suppression..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!formData.email}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modal */}
      <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Import Emails</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Addresses (one per line)</Label>
              <Textarea
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
                rows={10}
              />
              <p className="text-xs text-muted-foreground">
                All emails will be added with "Manual" reason
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkModal(false)}>Cancel</Button>
            <Button onClick={handleBulkAdd} disabled={!bulkEmails.trim()}>
              Import Emails
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
