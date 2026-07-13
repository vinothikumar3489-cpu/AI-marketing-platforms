import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Target, AlertTriangle, Sparkles } from 'lucide-react';

interface AnalysisSummaryProps {
  summary: {
    overallGrowthScore: number | null;
    bestChannel: string;
    topOpportunity: string;
    topRisk: string;
    nextAction: string;
    completedSteps?: number;
  };
}

export function AnalysisSummary({ summary }: AnalysisSummaryProps) {
  const { overallGrowthScore, bestChannel, topOpportunity, topRisk, nextAction } = summary;

  const getScoreColor = (score: number | null) => {
    if (score == null) return 'text-gray-400';
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-blue-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreLabel = (score: number | null) => {
    if (score == null) return 'Not measured';
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };

  return (
    <Card className="bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-pink-500/10 border-purple-500/20 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          Growth Analysis Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Overall Growth Score */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-2">Overall Growth Score</div>
              <div className={`text-3xl font-display font-bold ${getScoreColor(overallGrowthScore)}`}>
                {overallGrowthScore != null ? overallGrowthScore : '—'}
                {overallGrowthScore != null && <span className="text-lg text-muted-foreground">/100</span>}
              </div>
              {overallGrowthScore != null && <Progress value={overallGrowthScore} className="mt-3 h-2" />}
              <Badge variant="outline" className="mt-2 text-xs">
                {getScoreLabel(overallGrowthScore)}
              </Badge>
            </CardContent>
          </Card>

          {/* Best Channel */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Target className="w-3 h-3" />
                Best Channel
              </div>
              <div className="text-lg font-semibold text-white mb-1">{bestChannel || 'Not measured'}</div>
              <div className="text-xs text-muted-foreground">Highest fit for your audience</div>
            </CardContent>
          </Card>

          {/* Top Opportunity */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Top Opportunity
              </div>
              <div className="text-sm font-semibold text-green-400 mb-1">{topOpportunity || 'Not measured'}</div>
              <div className="text-xs text-muted-foreground">Primary growth driver</div>
            </CardContent>
          </Card>

          {/* Top Risk */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Top Risk
              </div>
              <div className="text-sm font-semibold text-yellow-400 mb-1">{topRisk || 'Not measured'}</div>
              <div className="text-xs text-muted-foreground">Main challenge to address</div>
            </CardContent>
          </Card>

          {/* Next Action */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Next Action
              </div>
              <div className="text-sm font-semibold text-purple-400 mb-1">{nextAction || 'Not measured'}</div>
              <div className="text-xs text-muted-foreground">Recommended next step</div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
