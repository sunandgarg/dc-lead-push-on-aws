import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Phone, 
  Mail, 
  Calendar, 
  MessageSquare,
  Target,
  Clock,
  ArrowRight
} from 'lucide-react';

interface Activity {
  id: string;
  contact_id: string;
  type: string;
  title: string;
  description: string | null;
  outcome: string | null;
  created_at: string;
  completed_at: string | null;
}

export function ActivitiesView() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'meeting': return <Calendar className="h-4 w-4" />;
      case 'note': return <MessageSquare className="h-4 w-4" />;
      case 'stage_change': return <ArrowRight className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'call': return 'bg-green-100 text-green-600';
      case 'email': return 'bg-blue-100 text-blue-600';
      case 'meeting': return 'bg-purple-100 text-purple-600';
      case 'note': return 'bg-yellow-100 text-yellow-600';
      case 'stage_change': return 'bg-primary/10 text-primary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const groupActivitiesByDate = (activities: Activity[]) => {
    const groups: { [key: string]: Activity[] } = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.created_at).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });

    return groups;
  };

  const groupedActivities = groupActivitiesByDate(activities);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading activities...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{activities.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Phone className="h-4 w-4" /> Calls
          </p>
          <p className="text-2xl font-bold text-green-600">{activities.filter(a => a.type === 'call').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Mail className="h-4 w-4" /> Emails
          </p>
          <p className="text-2xl font-bold text-blue-600">{activities.filter(a => a.type === 'email').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar className="h-4 w-4" /> Meetings
          </p>
          <p className="text-2xl font-bold text-purple-600">{activities.filter(a => a.type === 'meeting').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MessageSquare className="h-4 w-4" /> Notes
          </p>
          <p className="text-2xl font-bold text-yellow-600">{activities.filter(a => a.type === 'note').length}</p>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardContent className="p-6">
          {Object.keys(groupedActivities).length > 0 ? (
            <div className="space-y-8">
              {Object.entries(groupedActivities).map(([date, dateActivities]) => (
                <div key={date}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">{date}</h3>
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-4">
                      {dateActivities.map(activity => (
                        <div key={activity.id} className="relative flex gap-4 pl-10">
                          <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1 bg-muted/30 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{activity.title}</p>
                                {activity.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                                )}
                                {activity.outcome && (
                                  <Badge variant="outline" className="mt-2">{activity.outcome}</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(activity.created_at).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No activities recorded yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
