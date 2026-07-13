import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Loader2, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  key: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'warning';
  provider?: string;
  confidenceScore?: number;
}

interface WorkflowStepperProps {
  steps: Step[];
  loading: boolean;
}

export function WorkflowStepper({ steps, loading }: WorkflowStepperProps) {
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="pt-6">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">Overall Progress</span>
            <span className="text-sm font-semibold text-white">{progress}%</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{completedCount} of {steps.length} modules completed</span>
            {loading && <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Analyzing...</span>}
          </div>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, index) => (
            <StepCard key={step.key} step={step} index={index + 1} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StepCard({ step, index }: { step: Step; index: number }) {
  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default:
        return <Circle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (step.status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>;
      case 'running':
        return <Badge variant="default" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Running</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'warning':
        return <Badge variant="default" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Warning</Badge>;
      default:
        return <Badge variant="outline" className="text-gray-400">Pending</Badge>;
    }
  };

  const getCardClass = () => {
    const base = 'bg-white/5 border transition-all duration-300';
    
    switch (step.status) {
      case 'completed':
        return cn(base, 'border-green-500/30 hover:border-green-500/50');
      case 'running':
        return cn(base, 'border-blue-500/50 shadow-lg shadow-blue-500/20 animate-pulse');
      case 'failed':
        return cn(base, 'border-red-500/30');
      case 'warning':
        return cn(base, 'border-yellow-500/30');
      default:
        return cn(base, 'border-white/10');
    }
  };

  return (
    <Card className={getCardClass()}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-xs font-bold text-muted-foreground">Step {index}</span>
          </div>
          {getStatusBadge()}
        </div>

        <h3 className="font-semibold text-sm text-white mb-2">{step.label}</h3>

        {step.status === 'completed' && (
          <div className="space-y-1">
            {step.provider && (
              <div className="text-xs text-muted-foreground">
                Provider: <span className="text-purple-400">{step.provider}</span>
              </div>
            )}
            {step.confidenceScore != null && (
              <div className="text-xs text-muted-foreground">
                Confidence: <span className="text-green-400">{step.confidenceScore}%</span>
              </div>
            )}
          </div>
        )}

        {step.status === 'running' && (
          <div className="text-xs text-blue-400">Analyzing data...</div>
        )}
      </CardContent>
    </Card>
  );
}
