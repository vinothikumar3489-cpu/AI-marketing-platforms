import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';

interface ModuleResultCardProps {
  title: string;
  description: string;
  data: any;
  renderContent: (data: any) => React.ReactNode;
}

export function ModuleResultCard({ title, description, data, renderContent }: ModuleResultCardProps) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              {title}
            </CardTitle>
            <CardDescription className="mt-2">{description}</CardDescription>
          </div>
          {data.confidenceScore && (
            <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
              Confidence: {data.confidenceScore}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {renderContent(data)}
        
        {data.provider && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="text-xs text-muted-foreground">
              Analyzed using: <span className="text-purple-400 font-medium">{data.provider}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
