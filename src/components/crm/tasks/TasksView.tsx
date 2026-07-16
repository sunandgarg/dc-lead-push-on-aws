import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Trash2,
  User,
  Search
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  priority: string | null;
  status: string | null;
  due_date: string | null;
  completed_at: string | null;
  contact_id: string | null;
  assigned_to: string | null;
  created_at: string;
  contact?: { name: string; mobile: string } | null;
}

export function TasksView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [_editingTask, _setEditingTask] = useState<Task | null>(null);
  const { toast } = useToast();

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    type: 'follow_up',
    priority: 'medium',
    due_date: '',
    contact_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tasksRes, contactsRes] = await Promise.all([
        supabase.from('crm_tasks').select('*').order('due_date', { ascending: true }).limit(500),
        supabase.from('crm_contacts').select('id, name, mobile').order('name').limit(1000),
      ]);

      // Enrich tasks with contact info
      const contactMap = new Map((contactsRes.data || []).map(c => [c.id, c]));
      const enrichedTasks = (tasksRes.data || []).map(t => ({
        ...t,
        contact: t.contact_id ? contactMap.get(t.contact_id) || null : null,
      }));

      setTasks(enrichedTasks);
      setContacts(contactsRes.data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = useMemo(() => {
    let result = tasks;
    
    switch (filter) {
      case 'pending':
        result = result.filter(t => t.status !== 'completed');
        break;
      case 'completed':
        result = result.filter(t => t.status === 'completed');
        break;
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.contact?.name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [tasks, filter, searchTerm]);

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
      return;
    }

    try {
      const insertData: any = {
        title: newTask.title,
        description: newTask.description || null,
        type: newTask.type,
        priority: newTask.priority,
        due_date: newTask.due_date || null,
        status: 'pending',
        contact_id: newTask.contact_id || null,
      };

      const { error } = await supabase.from('crm_tasks').insert(insertData);
      if (error) throw error;

      // Log activity if linked to contact
      if (newTask.contact_id) {
        await supabase.from('crm_activities').insert({
          contact_id: newTask.contact_id,
          type: 'task',
          title: `Task Created: ${newTask.title}`,
          description: `Due: ${newTask.due_date || 'No date'}`,
        });
      }

      toast({ title: 'Success', description: 'Task created' });
      setIsAddOpen(false);
      setNewTask({ title: '', description: '', type: 'follow_up', priority: 'medium', due_date: '', contact_id: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating task:', error);
      toast({ title: 'Error', description: 'Failed to create task', variant: 'destructive' });
    }
  };

  const toggleTaskComplete = async (task: Task) => {
    const isCompleting = task.status !== 'completed';
    
    try {
      const { error } = await supabase
        .from('crm_tasks')
        .update({
          status: isCompleting ? 'completed' : 'pending',
          completed_at: isCompleting ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      if (error) throw error;

      // Log activity if linked to contact
      if (task.contact_id && isCompleting) {
        await supabase.from('crm_activities').insert({
          contact_id: task.contact_id,
          type: 'task',
          title: `Task Completed: ${task.title}`,
          outcome: 'completed',
        });
      }

      setTasks(prev => prev.map(t => 
        t.id === task.id 
          ? { ...t, status: isCompleting ? 'completed' : 'pending', completed_at: isCompleting ? new Date().toISOString() : null }
          : t
      ));

      toast({ 
        title: isCompleting ? 'Task completed' : 'Task reopened',
        description: task.title
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({ title: 'Error', description: 'Failed to update task', variant: 'destructive' });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from('crm_tasks').delete().eq('id', taskId);
      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast({ title: 'Deleted', description: 'Task removed' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'text-destructive bg-destructive/10';
      case 'medium': return 'text-warning bg-warning/10';
      case 'low': return 'text-muted-foreground bg-muted';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const isToday = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate).toDateString() === new Date().toDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            Pending ({tasks.filter(t => t.status !== 'completed').length})
          </Button>
          <Button
            variant={filter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('completed')}
          >
            Completed ({tasks.filter(t => t.status === 'completed').length})
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({tasks.length})
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-[200px]"
            />
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={newTask.title}
                    onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Task title"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Task description..."
                  />
                </div>
                <div>
                  <Label>Link to Contact</Label>
                  <Select value={newTask.contact_id || '__none__'} onValueChange={(v) => setNewTask(prev => ({ ...prev, contact_id: v === '__none__' ? '' : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No contact</SelectItem>
                      {contacts.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.mobile})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select value={newTask.type} onValueChange={(v) => setNewTask(prev => ({ ...prev, type: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={newTask.priority} onValueChange={(v) => setNewTask(prev => ({ ...prev, priority: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
                <Button onClick={handleAddTask} className="w-full">
                  Create Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Tasks</p>
          <p className="text-2xl font-bold">{tasks.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Due Today</p>
          <p className="text-2xl font-bold text-primary">{tasks.filter(t => isToday(t.due_date) && t.status !== 'completed').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Overdue</p>
          <p className="text-2xl font-bold text-destructive">{tasks.filter(t => isOverdue(t.due_date) && t.status !== 'completed').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold text-success">{tasks.filter(t => t.status === 'completed').length}</p>
        </Card>
      </div>

      {/* Task List */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            {filteredTasks.length > 0 ? (
              filteredTasks.map(task => (
                <div
                  key={task.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border ${
                    task.status === 'completed' ? 'bg-muted/30 opacity-60' : 
                    isOverdue(task.due_date) ? 'border-destructive/30 bg-destructive/5' : 'bg-card'
                  }`}
                >
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={() => toggleTaskComplete(task)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </span>
                      <Badge variant="outline" className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                      {task.type && (
                        <Badge variant="secondary">{task.type.replace('_', ' ')}</Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      {task.contact && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{task.contact.name}</span>
                        </div>
                      )}
                      {task.due_date && (
                        <div className={`flex items-center gap-1 text-xs ${
                          isOverdue(task.due_date) && task.status !== 'completed' 
                            ? 'text-destructive' 
                            : isToday(task.due_date) 
                              ? 'text-primary' 
                              : 'text-muted-foreground'
                        }`}>
                          {isOverdue(task.due_date) && task.status !== 'completed' && <AlertCircle className="h-3 w-3" />}
                          <Calendar className="h-3 w-3" />
                          <span>
                            {isToday(task.due_date) 
                              ? 'Due Today' 
                              : new Date(task.due_date).toLocaleDateString()
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {task.status === 'completed' && (
                      <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No tasks found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
