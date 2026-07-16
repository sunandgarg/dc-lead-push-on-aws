import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';

const userSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address').max(255),
  phone: z.string().trim().min(10, 'Phone must be at least 10 digits').max(15),
  alternatePhone: z.string().trim().max(15).optional().or(z.literal('')),
  cloudTelephonyNumber: z.string().trim().max(20).optional().or(z.literal('')),
  outboundNumber: z.string().trim().max(20).optional().or(z.literal('')),
  officeLocation: z.string().min(1, 'Select a location'),
  userRole: z.string().min(1, 'Select a role'),
  staffRole: z.string().optional().or(z.literal('')),
  teamLead: z.string().optional().or(z.literal('')),
  hideMobile: z.boolean().default(false),
  hideEmail: z.boolean().default(false),
  hideExportCSV: z.boolean().default(false),
  enableIVR: z.boolean().default(false),
  receiveEmailOnAssign: z.boolean().default(true),
});

type UserFormData = z.infer<typeof userSchema>;

const ROLES = ['Telecaller', 'Senior Telecaller', 'Team Lead', 'Manager', 'Senior Manager', 'Admin'];
const LOCATIONS = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Remote'];
const TEAM_LEADS = ['Rahul Sharma (TL-001)', 'Priya Patel (TL-002)', 'Amit Kumar (TL-003)', 'Sneha Singh (TL-004)'];

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: UserFormData) => void;
}

export function AddUserModal({ open, onOpenChange, onSave }: AddUserModalProps) {
  const { toast } = useToast();
  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '', email: '', phone: '', alternatePhone: '', cloudTelephonyNumber: '',
      outboundNumber: '', officeLocation: '', userRole: '', staffRole: '', teamLead: '',
      hideMobile: false, hideEmail: false, hideExportCSV: false, enableIVR: false, receiveEmailOnAssign: true,
    },
  });

  const handleSubmit = (data: UserFormData) => {
    onSave(data);
    toast({ title: 'User Created', description: `${data.name} has been added successfully.` });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add New User
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Full Name *</FormLabel><FormControl><Input placeholder="Enter full name" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email *</FormLabel><FormControl><Input type="email" placeholder="user@company.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone *</FormLabel><FormControl><Input placeholder="9876543210" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="alternatePhone" render={({ field }) => (
                    <FormItem><FormLabel>Alternate Phone</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="cloudTelephonyNumber" render={({ field }) => (
                    <FormItem><FormLabel>Cloud Telephony Number</FormLabel><FormControl><Input placeholder="IVR/Cloud number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="outboundNumber" render={({ field }) => (
                    <FormItem><FormLabel>Outbound Number</FormLabel><FormControl><Input placeholder="Outbound caller ID" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="officeLocation" render={({ field }) => (
                    <FormItem><FormLabel>Office Location *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger></FormControl>
                        <SelectContent>{LOCATIONS.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Role & Hierarchy */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Role & Hierarchy</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="userRole" render={({ field }) => (
                    <FormItem><FormLabel>User Role *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger></FormControl>
                        <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="staffRole" render={({ field }) => (
                    <FormItem><FormLabel>Staff Role</FormLabel><FormControl><Input placeholder="e.g., Counselor" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="teamLead" render={({ field }) => (
                    <FormItem><FormLabel>Assign to Team Lead</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select team lead" /></SelectTrigger></FormControl>
                        <SelectContent>{TEAM_LEADS.map(tl => <SelectItem key={tl} value={tl}>{tl}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Privacy & Toggles */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Privacy & Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { name: 'hideMobile' as const, label: 'Hide Mobile Number from this user' },
                    { name: 'hideEmail' as const, label: 'Hide Email Address' },
                    { name: 'hideExportCSV' as const, label: 'Hide Export CSV Button' },
                    { name: 'enableIVR' as const, label: 'Enable IVR Functionality' },
                    { name: 'receiveEmailOnAssign' as const, label: 'Receive Email when a new lead is assigned' },
                  ].map(({ name, label }) => (
                    <FormField key={name} control={form.control} name={name} render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="text-sm font-normal cursor-pointer">{label}</FormLabel>
                      </FormItem>
                    )} />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit">Create User</Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
