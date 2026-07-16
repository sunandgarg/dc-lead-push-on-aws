import { memo } from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface UniversityPerformance {
  name: string;
  success: number;
  failed: number;
  total: number;
  successRate: number;
}

interface UniversityHealthCardProps {
  universities: UniversityPerformance[];
}

export function UniversityHealthCard({ universities }: UniversityHealthCardProps) {
  if (universities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">University Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p>No data available yet</p>
            <p className="text-sm">Start pushing leads to see performance</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (rate: number) => {
    if (rate >= 80) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (rate >= 50) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">University Performance</CardTitle>
        <p className="text-sm text-muted-foreground">
          How each university integration is performing
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {universities.slice(0, 8).map((uni, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getStatusIcon(uni.successRate)}
                <span className="text-sm font-medium truncate">{uni.name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-green-600">{uni.success} ✓</span>
                <span className="text-red-600">{uni.failed} ✗</span>
                <span className="text-muted-foreground w-12 text-right">{uni.successRate}%</span>
              </div>
            </div>
            <Progress 
              value={uni.successRate} 
              className="h-1.5"
            />
          </div>
        ))}

        {universities.length > 8 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{universities.length - 8} more universities
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(UniversityHealthCard);
