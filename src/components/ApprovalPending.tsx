import { Clock, Mail, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface ApprovalPendingProps {
  email: string;
}

export function ApprovalPending({ email }: ApprovalPendingProps) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card-elevated p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>

          {/* Title */}
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Approval Pending
          </h1>

          <p className="text-muted-foreground mb-6">
            Your account is awaiting admin approval. You'll be notified once your access is granted.
          </p>

          {/* User Info */}
          <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg mb-6">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">{email}</span>
          </div>

          {/* Info Box */}
          <div className="text-left p-4 bg-primary/5 border border-primary/20 rounded-lg mb-6">
            <p className="text-sm text-foreground">
              <strong>What happens next?</strong>
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>• An admin will review your registration</li>
              <li>• You'll receive access once approved</li>
              <li>• Contact admin if this takes too long</li>
            </ul>
          </div>

          {/* Admin Contact */}
          <p className="text-xs text-muted-foreground mb-4">
            Contact: <span className="font-medium">ceo@dekhocampus.com</span>
          </p>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full p-3 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
