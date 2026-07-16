import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ALL_PERMISSIONS } from '@/hooks/usePermissions';
import {
  Check, X, Loader2, RefreshCw,
  Plus, Key, LogOut, Shield, Eye, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface ManagedUser {
  id: string;
  email: string;
  full_name: string | null;
  is_approved: boolean;
  roles: string[];
  permissions: string[];
  last_sign_in_at: string | null;
  created_at: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active'>('all');

  // Create user form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('user');

  // Password change
  const [changePassword, setChangePassword] = useState('');

  // Permissions
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  const { toast } = useToast();
  const { user } = useAuth();

  const callAdmin = useCallback(async (action: string, params: Record<string, any> = {}) => {
    await supabase.auth.getSession();
    const res = await supabase.functions.invoke('admin-user-management', {
      body: { action, ...params },
    });
    if (res.error) {
      let message = res.error.message;
      try {
        const context = (res.error as any).context;
        if (context && typeof context.json === 'function') {
          const body = await context.json();
          message = body?.error || body?.message || message;
        }
      } catch {
        // Keep the SDK error when the response has no JSON body.
      }
      throw new Error(message);
    }
    if (res.data?.error) throw new Error(res.data.error);
    return res.data;
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await callAdmin('list_users');
      setUsers(data.users || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [callAdmin, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleApprove = async (userId: string) => {
    setProcessingId(userId);
    try {
      await callAdmin('approve_user', { user_id: userId });
      toast({ title: 'User Approved' });
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevoke = async (userId: string) => {
    setProcessingId(userId);
    try {
      await callAdmin('revoke_user', { user_id: userId });
      toast({ title: 'Access Revoked' });
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) return;
    try {
      setProcessingId('creating');
      const result = await callAdmin('create_user', {
        email: newEmail,
        password: newPassword,
        full_name: newFullName,
        role: newRole,
      });
      toast({
        title: result.created ? 'User Created' : 'Existing User Updated',
        description: `${newEmail} is approved and ready to sign in.`,
      });
      setShowCreateModal(false);
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
      setNewRole('user');
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleChangePassword = async () => {
    if (!selectedUser || !changePassword) return;
    try {
      setProcessingId(selectedUser.id);
      await callAdmin('change_password', {
        user_id: selectedUser.id,
        new_password: changePassword,
      });
      toast({ title: 'Password Changed', description: `Password updated for ${selectedUser.email}` });
      setShowPasswordModal(false);
      setChangePassword('');
      setSelectedUser(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleForceLogout = async (userId: string) => {
    if (!confirm('Force logout this user from all sessions?')) return;
    setProcessingId(userId);
    try {
      await callAdmin('force_logout', { user_id: userId });
      toast({ title: 'User Logged Out', description: 'All sessions terminated.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    setProcessingId(userId);
    try {
      await callAdmin('update_role', { user_id: userId, new_role: role });
      toast({ title: 'Role Updated' });
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    try {
      setProcessingId(selectedUser.id);
      await callAdmin('update_permissions', {
        user_id: selectedUser.id,
        permissions: editPermissions,
      });
      toast({ title: 'Permissions Updated' });
      setShowPermissionsModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const togglePermission = (perm: string) => {
    setEditPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const filteredUsers = users.filter(u => {
    if (filter === 'pending') return !u.is_approved;
    if (filter === 'active') return u.is_approved;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg text-foreground">User Management</h3>
          <span className="text-sm text-muted-foreground">({users.length} users)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Create User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'active', 'pending'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors capitalize ${
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f} ({f === 'all' ? users.length : f === 'pending' ? users.filter(u => !u.is_approved).length : users.filter(u => u.is_approved).length})
          </button>
        ))}
      </div>

      {/* User List */}
      <div className="space-y-2">
        {filteredUsers.map(u => (
          <div key={u.id} className="border border-border rounded-lg bg-card overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-foreground truncate">{u.full_name || u.email}</p>
                  {u.is_approved ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-600">Active</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-600">Pending</span>
                  )}
                  {u.roles.includes('super_admin') && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-600">Super Admin</span>
                  )}
                  {u.roles.includes('admin') && !u.roles.includes('super_admin') && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">Admin</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                  <span>Joined: {new Date(u.created_at).toLocaleDateString()}</span>
                  {u.last_sign_in_at && (
                    <span>Last login: {new Date(u.last_sign_in_at).toLocaleString()}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 ml-4">
                {!u.is_approved ? (
                  <button
                    onClick={() => handleApprove(u.id)}
                    disabled={processingId === u.id}
                    className="p-2 bg-green-500/10 text-green-600 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50"
                    title="Approve"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleRevoke(u.id)}
                    disabled={processingId === u.id || u.id === user?.id}
                    className="p-2 bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    title="Revoke Access"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedUser(u);
                    setChangePassword('');
                    setShowPasswordModal(true);
                  }}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="Change Password"
                >
                  <Key className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleForceLogout(u.id)}
                  disabled={processingId === u.id || u.id === user?.id}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                  title="Force Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedUser(u);
                    setEditPermissions(u.permissions);
                    setShowPermissionsModal(true);
                  }}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="Manage Permissions"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  {expandedUser === u.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Expanded details */}
            {expandedUser === u.id && (
              <div className="border-t border-border p-4 bg-muted/30 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">Role:</span>
                  <Select
                    value={u.roles.includes('super_admin') ? 'super_admin' : u.roles.includes('admin') ? 'admin' : 'user'}
                    onValueChange={(val) => handleRoleChange(u.id, val)}
                  >
                    <SelectTrigger className="w-32 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">Permissions:</span>
                  {u.roles.includes('admin') || u.roles.includes('super_admin') ? (
                    <p className="text-sm text-muted-foreground mt-1">Admins have full access to all features.</p>
                  ) : u.permissions.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {u.permissions.map(p => (
                        <span key={p} className="px-2 py-0.5 bg-accent text-accent-foreground rounded text-xs">{p}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">No specific permissions assigned. User has no module access.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create User Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <Input value={newFullName} onChange={e => setNewFullName(e.target.value)} placeholder="John Doe" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email *</label>
              <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="user@example.com" type="email" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Password *</label>
              <Input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" type="password" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Role</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
            <button
              onClick={handleCreateUser}
              disabled={!newEmail || !newPassword || processingId === 'creating'}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {processingId === 'creating' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create User'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password for {selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-foreground">New Password</label>
            <Input value={changePassword} onChange={e => setChangePassword(e.target.value)} placeholder="Min 6 characters" type="password" />
          </div>
          <DialogFooter>
            <button onClick={() => setShowPasswordModal(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
            <button
              onClick={handleChangePassword}
              disabled={!changePassword || changePassword.length < 6}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Update Password
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Modal */}
      <Dialog open={showPermissionsModal} onOpenChange={setShowPermissionsModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Permissions for {selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="py-4 max-h-96 overflow-y-auto space-y-4">
            {selectedUser?.roles.includes('admin') || selectedUser?.roles.includes('super_admin') ? (
              <p className="text-sm text-muted-foreground">Admins automatically have access to all features. Change role to "User" to set granular permissions.</p>
            ) : (
              Object.entries(ALL_PERMISSIONS).map(([key, module]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={key}
                      checked={editPermissions.includes(key)}
                      onCheckedChange={() => togglePermission(key)}
                    />
                    <label htmlFor={key} className="text-sm font-medium text-foreground cursor-pointer">{module.label}</label>
                  </div>
                  {Object.entries(module.children).length > 0 && (
                    <div className="ml-6 space-y-1">
                      {Object.entries(module.children).map(([childKey, childLabel]) => (
                        <div key={childKey} className="flex items-center gap-2">
                          <Checkbox
                            id={childKey}
                            checked={editPermissions.includes(key) || editPermissions.includes(childKey)}
                            disabled={editPermissions.includes(key)}
                            onCheckedChange={() => togglePermission(childKey)}
                          />
                          <label htmlFor={childKey} className="text-sm text-muted-foreground cursor-pointer">{childLabel}</label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setShowPermissionsModal(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
            <button
              onClick={handleSavePermissions}
              disabled={selectedUser?.roles.includes('admin') || selectedUser?.roles.includes('super_admin')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Save Permissions
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
