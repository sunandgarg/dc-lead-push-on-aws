import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';

const leadSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email').max(255),
  targetEntity: z.string().min(1, 'Select a college/entity'),
  countryCode: z.string().min(1, 'Select country code'),
  phone: z.string().trim().min(10, 'Phone must be at least 10 digits').max(15),
  state: z.string().min(1, 'Select a state'),
  preferredStream: z.string().min(1, 'Select a stream'),
  yearOfAdmission: z.string().min(1, 'Select year'),
  leadSource: z.string().min(1, 'Select source'),
  assignCounselor: z.string().min(1, 'Assign a counselor'),
  alternatePhone: z.string().trim().max(15).optional().or(z.literal('')),
  referName: z.string().trim().max(100).optional().or(z.literal('')),
  referEmail: z.string().trim().max(255).optional().or(z.literal('')),
  referPhone: z.string().trim().max(15).optional().or(z.literal('')),
  sendVerificationEmail: z.boolean().default(false),
});

type LeadFormData = z.infer<typeof leadSchema>;

const ENTITIES = ['IIT Delhi', 'NIT Trichy', 'BITS Pilani', 'VIT Vellore', 'SRM Chennai', 'Manipal University', 'Amity University'];
const STATES = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Uttar Pradesh', 'Rajasthan', 'Gujarat', 'Telangana', 'West Bengal', 'Kerala'];
const STREAMS = ['Engineering', 'Medical', 'Arts', 'Commerce', 'Science', 'Management', 'Law', 'Design'];
const SOURCES = ['Facebook Ads', 'Google Ads', 'Custom Campaign', 'Walk-in', 'Website', 'Referral', 'WhatsApp', 'Organic'];
const COUNSELORS = ['Sneha Singh', 'Vikram Reddy', 'Neha Gupta', 'Ravi Joshi', 'Ananya Desai'];
const YEARS = ['2026', '2027', '2028'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: LeadFormData) => void;
}

export function AddNewLeadModal({ open, onOpenChange, onSave }: Props) {
  const { toast } = useToast();
  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: '', email: '', targetEntity: '', countryCode: '+91', phone: '', state: '',
      preferredStream: '', yearOfAdmission: '', leadSource: '', assignCounselor: '',
      alternatePhone: '', referName: '', referEmail: '', referPhone: '', sendVerificationEmail: false,
    },
  });

  const handleSubmit = (data: LeadFormData) => {
    onSave(data);
    toast({ title: 'Lead Created', description: `${data.name} has been added successfully.` });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" />Add New Lead</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Mandatory */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Required Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Name *</FormLabel><FormControl><Input placeholder="Full name" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email *</FormLabel><FormControl><Input type="email" placeholder="lead@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="targetEntity" render={({ field }) => (
                    <FormItem><FormLabel>Target Entity/College *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>{ENTITIES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-3 gap-2">
                    <FormField control={form.control} name="countryCode" render={({ field }) => (
                      <FormItem><FormLabel>Code *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="+91">+91</SelectItem><SelectItem value="+1">+1</SelectItem><SelectItem value="+44">+44</SelectItem><SelectItem value="+971">+971</SelectItem></SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                    <div className="col-span-2">
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Phone *</FormLabel><FormControl><Input placeholder="9876543210" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem><FormLabel>State *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="preferredStream" render={({ field }) => (
                    <FormItem><FormLabel>Preferred Stream *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>{STREAMS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="yearOfAdmission" render={({ field }) => (
                    <FormItem><FormLabel>Year of Admission *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="leadSource" render={({ field }) => (
                    <FormItem><FormLabel>Lead Source *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="assignCounselor" render={({ field }) => (
                    <FormItem><FormLabel>Assign to Counselor *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>{COUNSELORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                </div>
              </div>

              {/* Optional */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Optional / Referral</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="alternatePhone" render={({ field }) => (
                    <FormItem><FormLabel>Alternate Phone</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="referName" render={({ field }) => (
                    <FormItem><FormLabel>Refer Name</FormLabel><FormControl><Input placeholder="Referrer name" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="referEmail" render={({ field }) => (
                    <FormItem><FormLabel>Refer Email</FormLabel><FormControl><Input placeholder="Referrer email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="referPhone" render={({ field }) => (
                    <FormItem><FormLabel>Refer Phone</FormLabel><FormControl><Input placeholder="Referrer phone" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>

              <FormField control={form.control} name="sendVerificationEmail" render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="text-sm font-normal cursor-pointer">Send Lead Verification Email</FormLabel>
                </FormItem>
              )} />

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit">Save Lead</Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
