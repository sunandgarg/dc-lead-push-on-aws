import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Check, X, Loader2, UserCheck, Users, Clock, RefreshCw } from 'lucide-react';

interface PendingUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  is_approved: boolean;
}

export function PendingApprovals() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [allUsers, setAllUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at, is_approved')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const users = (data || []) as PendingUser[];
      setPendingUsers(users.filter(u => !u.is_approved));
      setAllUsers(users);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to fetch pending users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Set up realtime subscription for profile changes
  useEffect(() => {
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUsers]);

  const handleApprove = async (userId: string) => {
    if (!user) return;
    
    setProcessingId(userId);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          is_approved: true,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      toast({
        title: 'User Approved',
        description: 'User can now access the system',
      });
      
      // Optimistic update
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      setAllUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, is_approved: true } : u
      ));
    } catch (err) {
      console.error('Error approving user:', err);
      toast({
        title: 'Error',
        description: 'Failed to approve user',
        variant: 'destructive',
      });
      fetchUsers(); // Refresh on error
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: string) => {
    setProcessingId(userId);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_approved: false })
        .eq('id', userId);

      if (updateError) throw updateError;

      toast({
        title: 'User Rejected',
        description: 'User access has been revoked',
      });
      
      // Optimistic update
      setAllUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, is_approved: false } : u
      ));
      setPendingUsers(prev => {
        const existingUser = allUsers.find(u => u.id === userId);
        if (existingUser && !prev.find(u => u.id === userId)) {
          return [...prev, { ...existingUser, is_approved: false }];
        }
        return prev;
      });
    } catch (err) {
      console.error('Error rejecting user:', err);
      toast({
        title: 'Error',
        description: 'Failed to reject user',
        variant: 'destructive',
      });
      fetchUsers(); // Refresh on error
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">{error}</p>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 mx-auto px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  const displayUsers = showAll ? allUsers : pendingUsers;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg text-foreground">User Management</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowAll(false)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              !showAll ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Clock className="h-4 w-4 inline mr-1" />
            Pending ({pendingUsers.length})
          </button>
          <button
            onClick={() => setShowAll(true)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              showAll ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Users className="h-4 w-4 inline mr-1" />
            All Users ({allUsers.length})
          </button>
        </div>
      </div>

      {displayUsers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {showAll ? 'No users found' : 'No pending approvals'}
        </div>
      ) : (
        <div className="space-y-2">
          {displayUsers.map((pendingUser) => (
            <div
              key={pendingUser.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground truncate">
                    {pendingUser.full_name || pendingUser.email}
                  </p>
                  {pendingUser.is_approved ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-600">
                      Approved
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-600">
                      Pending
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{pendingUser.email}</p>
                <p className="text-xs text-muted-foreground">
                  Registered: {new Date(pendingUser.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2 ml-4">
                {!pendingUser.is_approved ? (
                  <>
                    <button
                      onClick={() => handleApprove(pendingUser.id)}
                      disabled={processingId === pendingUser.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500/10 text-green-600 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50"
                    >
                      {processingId === pendingUser.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(pendingUser.id)}
                      disabled={processingId === pendingUser.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleReject(pendingUser.id)}
                    disabled={processingId === pendingUser.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    {processingId === pendingUser.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    Revoke Access
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
