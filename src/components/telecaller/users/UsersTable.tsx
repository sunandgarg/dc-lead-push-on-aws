import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Filter, Download, Upload, UserPlus, MoreHorizontal, Edit, Eye, LogOut, KeyRound, MessageCircle, ShieldCheck, Users } from 'lucide-react';
import { AddUserModal } from './AddUserModal';
import { UserHierarchyChart } from './UserHierarchyChart';
import { useToast } from '@/hooks/use-toast';

interface UserRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  mobile: string;
  role: string;
  location: string;
  teamLead: string;
  ivrEnabled: boolean;
  status: 'Active' | 'Inactive';
  lastLogin: string;
}

const MOCK_USERS: UserRecord[] = [
  { id: '1', userId: 'USR-001', name: 'Rahul Sharma', email: 'rahul@company.com', mobile: '9876543210', role: 'Senior Manager', location: 'Mumbai', teamLead: '-', ivrEnabled: true, status: 'Active', lastLogin: '2026-03-08 09:15' },
  { id: '2', userId: 'USR-002', name: 'Priya Patel', email: 'priya@company.com', mobile: '9876543211', role: 'Team Lead', location: 'Delhi', teamLead: 'Rahul Sharma', ivrEnabled: true, status: 'Active', lastLogin: '2026-03-08 08:30' },
  { id: '3', userId: 'USR-003', name: 'Amit Kumar', email: 'amit@company.com', mobile: '9876543212', role: 'Team Lead', location: 'Bangalore', teamLead: 'Rahul Sharma', ivrEnabled: false, status: 'Active', lastLogin: '2026-03-07 17:45' },
  { id: '4', userId: 'USR-004', name: 'Sneha Singh', email: 'sneha@company.com', mobile: '9876543213', role: 'Telecaller', location: 'Mumbai', teamLead: 'Priya Patel', ivrEnabled: true, status: 'Active', lastLogin: '2026-03-08 09:00' },
  { id: '5', userId: 'USR-005', name: 'Vikram Reddy', email: 'vikram@company.com', mobile: '9876543214', role: 'Telecaller', location: 'Delhi', teamLead: 'Priya Patel', ivrEnabled: false, status: 'Inactive', lastLogin: '2026-03-01 14:20' },
  { id: '6', userId: 'USR-006', name: 'Neha Gupta', email: 'neha@company.com', mobile: '9876543215', role: 'Telecaller', location: 'Bangalore', teamLead: 'Amit Kumar', ivrEnabled: true, status: 'Active', lastLogin: '2026-03-08 07:55' },
  { id: '7', userId: 'USR-007', name: 'Ravi Joshi', email: 'ravi@company.com', mobile: '9876543216', role: 'Telecaller', location: 'Pune', teamLead: 'Amit Kumar', ivrEnabled: false, status: 'Active', lastLogin: '2026-03-07 16:10' },
  { id: '8', userId: 'USR-008', name: 'Ananya Desai', email: 'ananya@company.com', mobile: '9876543217', role: 'Manager', location: 'Chennai', teamLead: 'Rahul Sharma', ivrEnabled: true, status: 'Active', lastLogin: '2026-03-08 08:45' },
];

export function UsersTable() {
  const [users, setUsers] = useState<UserRecord[]>(MOCK_USERS);
  const [search, setSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [hierarchyOpen, setHierarchyOpen] = useState(false);
  const { toast } = useToast();

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.userId.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddUser = (data: any) => {
    const newUser: UserRecord = {
      id: String(users.length + 1),
      userId: `USR-${String(users.length + 1).padStart(3, '0')}`,
      name: data.name,
      email: data.email,
      mobile: data.phone,
      role: data.userRole,
      location: data.officeLocation,
      teamLead: data.teamLead || '-',
      ivrEnabled: data.enableIVR,
      status: 'Active',
      lastLogin: 'Never',
    };
    setUsers(prev => [...prev, newUser]);
  };

  const exportCSV = () => {
    const headers = 'User ID,Name,Email,Mobile,Role,Location,Team Lead,IVR,Status,Last Login\n';
    const rows = filtered.map(u => `${u.userId},${u.name},${u.email},${u.mobile},${u.role},${u.location},${u.teamLead},${u.ivrEnabled ? 'Yes' : 'No'},${u.status},${u.lastLogin}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'users_export.csv'; a.click();
    toast({ title: 'Exported', description: `${filtered.length} users exported to CSV` });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl">User Management</CardTitle>
              <Badge variant="secondary" className="bg-primary/10 text-primary">{users.length} Users</Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by Name or User ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" />
              </div>
              <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1" />Filter</Button>
              <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
              <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-1" />Import CSV</Button>
              <Button size="sm" onClick={() => setHierarchyOpen(true)}><Users className="h-4 w-4 mr-1" />Hierarchy</Button>
              <Button size="sm" onClick={() => setAddModalOpen(true)}><UserPlus className="h-4 w-4 mr-1" />Add User</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Team Lead</TableHead>
                  <TableHead>IVR</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user, idx) => (
                  <TableRow key={user.id} className="hover:bg-muted/30">
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{user.userId}</TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-sm">{user.email}</TableCell>
                    <TableCell className="font-mono text-sm">{user.mobile}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{user.role}</Badge></TableCell>
                    <TableCell className="text-sm">{user.location}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.teamLead}</TableCell>
                    <TableCell>
                      <Badge variant={user.ivrEnabled ? 'default' : 'secondary'} className={`text-xs ${user.ivrEnabled ? 'bg-green-100 text-green-700 border-green-200' : ''}`}>
                        {user.ivrEnabled ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${user.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{user.lastLogin}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Edit className="h-4 w-4 mr-2" />Edit Details</DropdownMenuItem>
                          <DropdownMenuItem><ShieldCheck className="h-4 w-4 mr-2" />Add Advanced Info (PAN/Aadhar)</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setHierarchyOpen(true)}><Eye className="h-4 w-4 mr-2" />View Hierarchy Chart</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem><LogOut className="h-4 w-4 mr-2" />Remote Logout</DropdownMenuItem>
                          <DropdownMenuItem><KeyRound className="h-4 w-4 mr-2" />Reset Password</DropdownMenuItem>
                          <DropdownMenuItem><MessageCircle className="h-4 w-4 mr-2" />Mark as WhatsApp User</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AddUserModal open={addModalOpen} onOpenChange={setAddModalOpen} onSave={handleAddUser} />
      <UserHierarchyChart open={hierarchyOpen} onOpenChange={setHierarchyOpen} users={users} />
    </div>
  );
}
