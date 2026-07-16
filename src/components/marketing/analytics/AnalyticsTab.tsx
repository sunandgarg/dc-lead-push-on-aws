import { Card, CardContent } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export function AnalyticsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Analytics & KPIs</h2>
        <p className="text-muted-foreground">Track your marketing performance</p>
      </div>

      <Card className="card-elevated">
        <CardContent className="py-12 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Analytics will appear once you run campaigns.</p>
        </CardContent>
      </Card>
    </div>
  );
}
