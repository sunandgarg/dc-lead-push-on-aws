import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { User, ChevronDown } from 'lucide-react';

interface UserRecord {
  id: string;
  userId: string;
  name: string;
  role: string;
  teamLead: string;
  status: 'Active' | 'Inactive';
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserRecord[];
}

function HierarchyNode({ user, children }: { user: UserRecord; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-card border-2 border-primary/20 rounded-xl px-4 py-3 text-center min-w-[140px] shadow-sm hover:shadow-md transition-shadow">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
          <User className="h-5 w-5 text-primary" />
        </div>
        <p className="font-semibold text-sm">{user.name}</p>
        <Badge variant="outline" className="text-xs mt-1">{user.role}</Badge>
      </div>
      {children && (
        <>
          <div className="w-px h-6 bg-border" />
          <ChevronDown className="h-3 w-3 text-muted-foreground -my-1" />
          <div className="flex gap-6 mt-1">{children}</div>
        </>
      )}
    </div>
  );
}

export function UserHierarchyChart({ open, onOpenChange, users }: Props) {
  const topManagers = users.filter(u => u.teamLead === '-' || u.role === 'Senior Manager');
  const getSubordinates = (name: string) => users.filter(u => u.teamLead === name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Organization Hierarchy</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center py-6 overflow-x-auto">
          <div className="flex flex-col items-center gap-2">
            {topManagers.map(manager => {
              const tls = getSubordinates(manager.name);
              return (
                <HierarchyNode key={manager.id} user={manager}>
                  {tls.length > 0 && tls.map(tl => {
                    const callers = getSubordinates(tl.name);
                    return (
                      <HierarchyNode key={tl.id} user={tl}>
                        {callers.length > 0 && callers.map(c => (
                          <HierarchyNode key={c.id} user={c} />
                        ))}
                      </HierarchyNode>
                    );
                  })}
                </HierarchyNode>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
