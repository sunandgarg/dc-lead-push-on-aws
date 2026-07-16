import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { Building2, Phone, Search, Edit2, Check, MessageCircle, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UniversityBiz {
  id: string;
  name: string;
  daily_limit: number | null;
  admission_commitment: number | null;
  contact_person_name: string | null;
  contact_person_mobile: string | null;
  contact_person_email: string | null;
  whatsapp_group_link: string | null;
  deal_price: number | null;
  gst_inclusive: boolean | null;
  city: string | null;
  state: string | null;
  utm_link: string | null;
  api_url: string | null;
}

interface DealFormData {
  daily_limit: string;
  admission_commitment: string;
  contact_person_name: string;
  contact_person_mobile: string;
  contact_person_email: string;
  whatsapp_group_link: string;
  deal_price: string;
  gst_inclusive: boolean;
  city: string;
  state: string;
}

function UniversityTrackerInner() {
  const { toast } = useToast();
  const [universities, setUniversities] = useState<UniversityBiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editUni, setEditUni] = useState<UniversityBiz | null>(null);
  const [form, setForm] = useState<DealFormData>({
    daily_limit: '', admission_commitment: '', contact_person_name: '',
    contact_person_mobile: '', contact_person_email: '', whatsapp_group_link: '',
    deal_price: '', gst_inclusive: true, city: '', state: '',
  });

  const fetchUniversities = useCallback(async () => {
    const { data, error } = await supabase
      .from('universities')
      .select('id, name, daily_limit, admission_commitment, contact_person_name, contact_person_mobile, contact_person_email, whatsapp_group_link, deal_price, gst_inclusive, city, state, utm_link, api_url')
      .order('name');
    if (!error) setUniversities((data as UniversityBiz[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUniversities(); }, [fetchUniversities]);

  const filtered = useMemo(() => {
    if (!search.trim()) return universities;
    const t = search.toLowerCase();
    return universities.filter(u => u.name.toLowerCase().includes(t) || u.state?.toLowerCase().includes(t) || u.city?.toLowerCase().includes(t));
  }, [universities, search]);

  const openEdit = (uni: UniversityBiz) => {
    setEditUni(uni);
    setForm({
      daily_limit: uni.daily_limit?.toString() || '',
      admission_commitment: uni.admission_commitment?.toString() || '',
      contact_person_name: uni.contact_person_name || '',
      contact_person_mobile: uni.contact_person_mobile || '',
      contact_person_email: uni.contact_person_email || '',
      whatsapp_group_link: uni.whatsapp_group_link || '',
      deal_price: uni.deal_price?.toString() || '',
      gst_inclusive: uni.gst_inclusive ?? true,
      city: uni.city || '',
      state: uni.state || '',
    });
  };

  const saveDetails = async () => {
    if (!editUni) return;
    const { error } = await supabase.from('universities').update({
      daily_limit: form.daily_limit ? parseInt(form.daily_limit) : null,
      admission_commitment: form.admission_commitment ? parseInt(form.admission_commitment) : null,
      contact_person_name: form.contact_person_name || null,
      contact_person_mobile: form.contact_person_mobile || null,
      contact_person_email: form.contact_person_email || null,
      whatsapp_group_link: form.whatsapp_group_link || null,
      deal_price: form.deal_price ? parseFloat(form.deal_price) : null,
      gst_inclusive: form.gst_inclusive,
      city: form.city || null,
      state: form.state || null,
    }).eq('id', editUni.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'University details updated' });
      setEditUni(null);
      fetchUniversities();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            University Tracker
          </h1>
          <p className="text-muted-foreground">{universities.length} universities • Admin view</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, city, state..." className="pl-10" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">University</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact Person</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Daily Limit</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Commitment</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Deal</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Type</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((uni) => (
              <tr key={uni.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{uni.name}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {uni.city && uni.state ? `${uni.city}, ${uni.state}` : uni.state || uni.city || '-'}
                </td>
                <td className="px-4 py-3">
                  {uni.contact_person_name ? (
                    <div className="space-y-0.5">
                      <p className="text-foreground">{uni.contact_person_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {uni.contact_person_mobile && (
                          <a href={`tel:${uni.contact_person_mobile}`} className="flex items-center gap-1 hover:text-primary">
                            <Phone className="h-3 w-3" />{uni.contact_person_mobile}
                          </a>
                        )}
                      </div>
                    </div>
                  ) : <span className="text-muted-foreground">-</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {uni.daily_limit ? <Badge variant="outline">{uni.daily_limit}/day</Badge> : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  {uni.admission_commitment ? <Badge variant="secondary">{uni.admission_commitment}</Badge> : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  {uni.deal_price ? (
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer" onClick={() => openEdit(uni)}>
                      <IndianRupee className="h-3 w-3 mr-0.5" />
                      {uni.deal_price.toLocaleString()}
                      <span className="ml-1 text-[10px]">({uni.gst_inclusive ? 'incl' : 'excl'} GST)</span>
                    </Badge>
                  ) : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {uni.api_url?.trim() && <Badge variant="outline" className="text-[10px]">API</Badge>}
                    {uni.utm_link?.trim() && <Badge variant="outline" className="text-[10px]">UTM</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(uni)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    {uni.whatsapp_group_link && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={uni.whatsapp_group_link} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-3.5 w-3.5 text-primary" />
                        </a>
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No universities found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editUni} onOpenChange={(o) => !o && setEditUni(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Details - {editUni?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">City</Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City" />
              </div>
              <div>
                <Label className="text-xs">State</Label>
                <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="State" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Daily Limit</Label>
                <Input type="number" value={form.daily_limit} onChange={e => setForm(f => ({ ...f, daily_limit: e.target.value }))} placeholder="e.g. 100" />
              </div>
              <div>
                <Label className="text-xs">Admission Commitment</Label>
                <Input type="number" value={form.admission_commitment} onChange={e => setForm(f => ({ ...f, admission_commitment: e.target.value }))} placeholder="e.g. 50" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Contact Person Name</Label>
              <Input value={form.contact_person_name} onChange={e => setForm(f => ({ ...f, contact_person_name: e.target.value }))} placeholder="Name" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Mobile</Label>
                <Input value={form.contact_person_mobile} onChange={e => setForm(f => ({ ...f, contact_person_mobile: e.target.value }))} placeholder="+91..." />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={form.contact_person_email} onChange={e => setForm(f => ({ ...f, contact_person_email: e.target.value }))} placeholder="email@..." />
              </div>
            </div>
            <div>
              <Label className="text-xs">WhatsApp Group Link</Label>
              <Input value={form.whatsapp_group_link} onChange={e => setForm(f => ({ ...f, whatsapp_group_link: e.target.value }))} placeholder="https://chat.whatsapp.com/..." />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Deal Price (₹)</Label>
                <Input type="number" value={form.deal_price} onChange={e => setForm(f => ({ ...f, deal_price: e.target.value }))} placeholder="e.g. 50000" />
              </div>
              <div className="flex items-end gap-3 pb-1">
                <Switch checked={form.gst_inclusive} onCheckedChange={v => setForm(f => ({ ...f, gst_inclusive: v }))} id="gst" />
                <Label htmlFor="gst" className="text-xs">{form.gst_inclusive ? 'GST Inclusive' : 'GST Exclusive'}</Label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditUni(null)}>Cancel</Button>
            <Button onClick={saveDetails}><Check className="h-4 w-4 mr-1.5" />Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const UniversityTracker = memo(UniversityTrackerInner);
export default UniversityTracker;
