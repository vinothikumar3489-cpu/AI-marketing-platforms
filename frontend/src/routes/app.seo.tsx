import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Section } from "@/components/ui-kit";
import { getActiveProject, setActiveProjectId } from "@/lib/project-store";
import { api } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, AlertTriangle, TrendingUp, Target, FileText, Lightbulb } from "lucide-react";
import { toast, Toaster } from 'sonner';

export const Route = createFileRoute("/app/seo")({ component: SeoIntelligencePage });

function SeoIntelligencePage() {
  const [project, setProject] = useState(getActiveProject());
  const [website, setWebsite] = useState(project?.websiteUrl || "");
  const [loading, setLoading] = useState(false);
  const [seoData, setSeoData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const load = () => {
      const p = getActiveProject();
      setProject(p);
      setWebsite(p?.websiteUrl || "");
      if (p?.id) fetchSavedAnalysis(p.id);
    };
    load();
    window.addEventListener("marketform-chat-change", load);
    return () => window.removeEventListener("marketform-chat-change", load);
  }, []);

  async function fetchSavedAnalysis(chatId: string) {
    try {
      const res = await api.get(`/api/chats/${chatId}/seo-intelligence`);
      if (res && (res.seoIntelligence || res.data?.seoIntelligence)) {
        setSeoData(res.seoIntelligence || res.data?.seoIntelligence);
      } else {
        setSeoData(null);
      }
    } catch (err) {
      console.error("Failed to fetch SEO data:", err);
      setSeoData(null);
    }
  }

  async function runAnalysis() {
    let activeProject = project;

    if (!activeProject?.id || activeProject.id.startsWith('temp-')) {
      try {
        const chatTitle = website ? website.replace(/^https?:\/\//, '').split('/')[0] : 'SEO Analysis';
        const res = await api.post('/api/chats', { title: chatTitle });
        const chat = res.data || res.chat || res;
        if (!chat?.id) throw new Error('No chat ID returned');
        setActiveProjectId(chat.id);
        activeProject = { id: chat.id, productName: chatTitle, websiteUrl: website, description: '', industry: '', targetAudience: '', pricing: '', competitors: '', createdAt: '', updatedAt: '' } as any;
        setProject(activeProject);
        window.dispatchEvent(new Event('marketform-chat-change'));
      } catch (err: any) {
        toast.error('Failed to create project: ' + (err.message || 'Unknown error'));
        return;
      }
    }

    if (!activeProject?.id) {
      toast.error('Select or create a project first.');
      return;
    }

    if (!website) {
      toast.error('Please enter a website URL.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/api/chats/${activeProject.id}/seo-intelligence/run`, {
        websiteUrl: website,
        productName: activeProject.productName || 'Product',
        industry: activeProject.industry || 'General'
      });
      
      if (res.success || res.data?.success) {
        setSeoData(res.seoIntelligence || res.data?.seoIntelligence);
        setActiveTab("overview");
      } else {
        toast.error((res.error || res.data?.error) || "Failed to run SEO analysis");
      }
    } catch (err: any) {
      console.error("SEO analysis error:", err);
      toast.error(err.response?.data?.message || "Failed to run SEO analysis. Check console for details.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader 
        eyebrow="AI Intelligence Module" 
        title="SEO Intelligence" 
        description="Comprehensive SEO analysis with keyword opportunities, competitor insights, content gaps, and actionable growth recommendations."
      />

      <Section 
        title="Run SEO Analysis" 
        description="Enter your website URL to generate a complete SEO intelligence report including technical audit, keywords, competitors, and 30/60/90 day action plans."
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-semibold mb-2 text-white">Website URL</label>
            <input 
              value={website} 
              onChange={(e) => setWebsite(e.target.value)} 
              placeholder="https://yourwebsite.com" 
              className="w-full h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40"
            />
          </div>
          <div className="flex items-end">
            <button 
              onClick={runAnalysis} 
              disabled={loading || !website}
              className="w-full px-6 h-12 rounded-xl gradient-brand text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Analyzing..." : "Run SEO Analysis"}
            </button>
          </div>
        </div>
      </Section>

      {seoData ? (
        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10 gap-2 bg-white/5 p-2 rounded-xl">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="technical" className="text-xs">Technical</TabsTrigger>
              <TabsTrigger value="keywords" className="text-xs">Keywords</TabsTrigger>
              <TabsTrigger value="competitors" className="text-xs">Competitors</TabsTrigger>
              <TabsTrigger value="content" className="text-xs">Content</TabsTrigger>
              <TabsTrigger value="ai" className="text-xs">AI Visibility</TabsTrigger>
              <TabsTrigger value="landing" className="text-xs">Landing Page</TabsTrigger>
              <TabsTrigger value="blogs" className="text-xs">Blog Ideas</TabsTrigger>
              <TabsTrigger value="action" className="text-xs">Action Plan</TabsTrigger>
              <TabsTrigger value="providers" className="text-xs">Providers</TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="mt-6 space-y-6">
              <OverviewTab data={seoData} />
            </TabsContent>

            {/* TECHNICAL AUDIT TAB */}
            <TabsContent value="technical" className="mt-6">
              <TechnicalAuditTab data={seoData.technicalAudit} detailedAudit={seoData.technicalAuditDetail} />
            </TabsContent>

            {/* KEYWORDS TAB */}
            <TabsContent value="keywords" className="mt-6">
              <KeywordsTab data={seoData.keywordOpportunities} />
            </TabsContent>

            {/* COMPETITORS TAB */}
            <TabsContent value="competitors" className="mt-6">
              <CompetitorsTab data={seoData.competitorIntelligence} />
            </TabsContent>

            {/* CONTENT GAPS TAB */}
            <TabsContent value="content" className="mt-6">
              <ContentGapsTab data={seoData.contentGaps} />
            </TabsContent>

            {/* AI VISIBILITY TAB */}
            <TabsContent value="ai" className="mt-6">
              <AIVisibilityTab data={seoData.aiVisibility} />
            </TabsContent>

            {/* LANDING PAGE TAB */}
            <TabsContent value="landing" className="mt-6">
              <LandingPageTab data={seoData.landingPageOptimization} />
            </TabsContent>

            {/* BLOG IDEAS TAB */}
            <TabsContent value="blogs" className="mt-6">
              <BlogIdeasTab data={seoData.blogOpportunities} />
            </TabsContent>

            {/* ACTION PLAN TAB */}
            <TabsContent value="action" className="mt-6">
              <ActionPlanTab data={seoData.actionPlan} />
            </TabsContent>

            {/* PROVIDERS TAB */}
            <TabsContent value="providers" className="mt-6">
              <ProvidersTab metadata={seoData.metadata} />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="mt-6 glass rounded-2xl p-8 text-center">
          <div className="text-muted-foreground mb-2">No SEO analysis yet</div>
          <div className="text-sm text-muted-foreground">Run an analysis above to see comprehensive SEO intelligence</div>
        </div>
      )}
      <Toaster theme="dark" position="bottom-right" />
    </>
  );
}

// ============================================
// OVERVIEW TAB COMPONENT
// ============================================

function OverviewTab({ data }: { data: any }) {
  const overview = data.seoOverview || {};
  const seoScore = data.seoScore || overview.seoScore || 0;
  const scoreBreakdown = data.scoreBreakdown || null;

  return (
    <div className="space-y-6">
      {/* Multi-Dimensional Score Cards */}
      {scoreBreakdown ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-blue-300">Overall</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-display font-bold text-blue-400">{scoreBreakdown.overallScore || 0}</div>
                <Progress value={scoreBreakdown.overallScore || 0} className="mt-2 h-1" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-green-300">Technical</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-display font-bold text-green-400">{scoreBreakdown.technicalScore || 0}</div>
                <Progress value={scoreBreakdown.technicalScore || 0} className="mt-2 h-1" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-purple-300">On-Page</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-display font-bold text-purple-400">{scoreBreakdown.onPageScore || 0}</div>
                <Progress value={scoreBreakdown.onPageScore || 0} className="mt-2 h-1" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-yellow-300">Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-display font-bold text-yellow-400">{scoreBreakdown.contentScore || 0}</div>
                <Progress value={scoreBreakdown.contentScore || 0} className="mt-2 h-1" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-orange-300">Authority</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-display font-bold text-orange-400">{scoreBreakdown.authorityScore || 0}</div>
                <Progress value={scoreBreakdown.authorityScore || 0} className="mt-2 h-1" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 border-pink-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-pink-300">AI Visibility</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-display font-bold text-pink-400">{scoreBreakdown.aiVisibilityScore || 0}</div>
                <Progress value={scoreBreakdown.aiVisibilityScore || 0} className="mt-2 h-1" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-cyan-300">Local SEO</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-display font-bold text-cyan-400">{scoreBreakdown.localSeoScore || 0}</div>
                <Progress value={scoreBreakdown.localSeoScore || 0} className="mt-2 h-1" />
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        /* Fallback: Single Score Card */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">SEO Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-display font-bold">{seoScore}<span className="text-2xl text-muted-foreground">/100</span></div>
              <Progress value={seoScore} className="mt-4" />
              <div className="mt-2 text-xs text-muted-foreground">
                {seoScore >= 80 ? 'Excellent' : seoScore >= 60 ? 'Good' : seoScore >= 40 ? 'Fair' : 'Needs Work'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Strengths and Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(overview.strengths || []).map((strength: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{strength}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Weaknesses & Areas for Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(overview.weaknesses || []).map((weakness: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{weakness}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {overview.overallAssessment && (
        <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Overall Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{overview.overallAssessment}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// TECHNICAL AUDIT TAB COMPONENT
// ============================================

function TechnicalAuditTab({ data, detailedAudit }: { data: any; detailedAudit?: any }) {
  if (!data && !detailedAudit) return <div className="text-muted-foreground">No technical audit data available</div>;

  // Check if we have the new detailed audit structure
  const hasDetailedAudit = detailedAudit && detailedAudit.scores;

  if (hasDetailedAudit) {
    // NEW: Enhanced Technical Audit Display
    const audit = detailedAudit;
    
    return (
      <div className="space-y-6">
        {/* Score Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Overall</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{audit.scores.overall}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Title</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{audit.scores.title}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Meta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{audit.scores.meta}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Security</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{audit.scores.security}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Mobile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{audit.scores.mobile}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Headings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{audit.scores.headings}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Schema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{audit.scores.schema}</div>
            </CardContent>
          </Card>
        </div>

        {/* Issues by Priority */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white/5 border-red-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <XCircle className="w-5 h-5" />
                Critical Issues ({audit.issues.critical.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {audit.issues.critical.length === 0 ? (
                <div className="text-sm text-muted-foreground">No critical issues found!</div>
              ) : (
                <ul className="space-y-2">
                  {audit.issues.critical.map((issue: any, i: number) => (
                    <li key={i} className="text-sm">
                      <div className="font-medium text-red-400">{issue.issue}</div>
                      <div className="text-xs text-muted-foreground mt-1">{issue.recommendation}</div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-yellow-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-400">
                <AlertTriangle className="w-5 h-5" />
                High Priority ({audit.issues.high.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {audit.issues.high.length === 0 ? (
                <div className="text-sm text-muted-foreground">No high priority issues</div>
              ) : (
                <ul className="space-y-2">
                  {audit.issues.high.map((issue: any, i: number) => (
                    <li key={i} className="text-sm">
                      <div className="font-medium text-yellow-400">{issue.issue}</div>
                      <div className="text-xs text-muted-foreground mt-1">{issue.recommendation}</div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-orange-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-400">
                <AlertTriangle className="w-5 h-5" />
                Medium Priority ({audit.issues.medium.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {audit.issues.medium.length === 0 ? (
                <div className="text-sm text-muted-foreground">No medium priority issues</div>
              ) : (
                <ul className="space-y-2">
                  {audit.issues.medium.slice(0, 5).map((issue: any, i: number) => (
                    <li key={i} className="text-sm">
                      <div className="font-medium text-orange-400">{issue.issue}</div>
                      <div className="text-xs text-muted-foreground mt-1">{issue.recommendation}</div>
                    </li>
                  ))}
                  {audit.issues.medium.length > 5 && (
                    <li className="text-xs text-muted-foreground">+ {audit.issues.medium.length - 5} more...</li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Top Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {audit.recommendations.slice(0, 10).map((rec: any, i: number) => (
                  <li key={i} className="text-sm">
                    <Badge variant={
                      rec.priority === 'critical' ? 'destructive' :
                      rec.priority === 'high' ? 'default' :
                      'secondary'
                    } className="text-xs mb-1">
                      {rec.priority}
                    </Badge>
                    <div className="mt-1">{rec.recommendation}</div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // FALLBACK: Old Structure
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-white/5 border-red-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <XCircle className="w-5 h-5" />
            Critical Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(data.criticalIssues || []).length === 0 ? (
            <div className="text-sm text-muted-foreground">No critical issues found!</div>
          ) : (
            <ul className="space-y-2">
              {data.criticalIssues.map((issue: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-red-400">G��</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-yellow-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-400">
            <AlertTriangle className="w-5 h-5" />
            Warnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(data.warnings || []).length === 0 ? (
            <div className="text-sm text-muted-foreground">No warnings</div>
          ) : (
            <ul className="space-y-2">
              {data.warnings.map((warning: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-yellow-400">G��</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-green-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="w-5 h-5" />
            Passed Checks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(data.passedChecks || []).map((check: string, i: number) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-green-400">G��</span>
                <span>{check}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(data.recommendations || []).map((rec: string, i: number) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-blue-400">G��</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// KEYWORDS TAB COMPONENT
// ============================================

function KeywordsTab({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className="text-muted-foreground">No keyword data available</div>;

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle>Keyword Opportunities ({data.length})</CardTitle>
        <CardDescription>Target keywords ranked by opportunity and difficulty</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-white/10">
                <th className="pb-2">Keyword</th>
                <th className="pb-2">Intent</th>
                <th className="pb-2">Difficulty</th>
                <th className="pb-2">Opportunity</th>
                <th className="pb-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {data.map((kw: any, i: number) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-3 font-medium">{kw.keyword}</td>
                  <td>
                    <Badge variant={kw.intent === 'commercial' ? 'default' : 'secondary'}>
                      {kw.intent}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={
                      kw.difficulty === 'easy' ? 'default' : 
                      kw.difficulty === 'medium' ? 'secondary' : 
                      'destructive'
                    }>
                      {kw.difficulty}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={
                      kw.opportunity === 'high' ? 'default' : 
                      kw.opportunity === 'medium' ? 'secondary' : 
                      'outline'
                    }>
                      {kw.opportunity}
                    </Badge>
                  </td>
                  <td className="text-xs text-muted-foreground">{kw.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// COMPETITORS TAB COMPONENT
// ============================================

function CompetitorsTab({ data }: { data: any }) {
  if (!data) return <div className="text-muted-foreground">No competitor data available</div>;

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Direct Competitors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(data.directCompetitors || []).map((comp: string, i: number) => (
              <Badge key={i} variant="outline" className="text-sm">{comp}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Keyword Gaps</CardTitle>
          <CardDescription>Keywords your competitors rank for but you don't</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(data.keywordGaps || []).map((kw: string, i: number) => (
              <div key={i} className="px-3 py-2 bg-white/5 rounded-lg border border-white/10 text-sm">
                {kw}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Content Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(data.contentGaps || []).map((gap: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-blue-400">G��</span>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Ranking Advantages</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(data.rankingAdvantages || []).map((adv: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>{adv}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================
// CONTENT GAPS TAB COMPONENT
// ============================================

function ContentGapsTab({ data }: { data: any }) {
  if (!data) return <div className="text-muted-foreground">No content gap data available</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Missing Topics</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(data.missingTopics || []).map((topic: string, i: number) => (
              <li key={i} className="text-sm">{topic}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Comparison Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(data.comparisonPages || []).map((page: string, i: number) => (
              <li key={i} className="text-sm">{page}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Use Case Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(data.useCasePages || []).map((page: string, i: number) => (
              <li key={i} className="text-sm">{page}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Educational Content</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(data.educationalContent || []).map((content: string, i: number) => (
              <li key={i} className="text-sm">{content}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// AI VISIBILITY TAB COMPONENT
// ============================================

function AIVisibilityTab({ data }: { data: any }) {
  if (!data) return <div className="text-muted-foreground">No AI visibility data available</div>;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
        <CardHeader>
          <CardTitle>AI Visibility Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{data.aiVisibilityScore || 0}<span className="text-xl text-muted-foreground">/100</span></div>
          <Progress value={data.aiVisibilityScore || 0} className="mt-4" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-sm">ChatGPT Optimization</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(data.chatgptOptimization || []).map((tip: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-green-400">G��</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-sm">Gemini Optimization</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(data.geminiOptimization || []).map((tip: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-blue-400">G��</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-sm">Perplexity Optimization</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(data.perplexityOptimization || []).map((tip: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-purple-400">G��</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================
// LANDING PAGE TAB COMPONENT
// ============================================

function LandingPageTab({ data }: { data: any }) {
  if (!data) return <div className="text-muted-foreground">No landing page data available</div>;

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Headline Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(data.headlineSuggestions || []).map((headline: string, i: number) => (
              <div key={i} className="text-lg font-semibold bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-4 py-3 rounded-lg border border-purple-500/20">
                {headline}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>CTA Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(data.ctaSuggestions || []).map((cta: string, i: number) => (
              <div key={i} className="bg-green-500/10 text-green-400 px-4 py-3 rounded-lg border border-green-500/30 text-center font-medium">
                {cta}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Trust Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(data.trustSignals || []).map((signal: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-blue-400">G��</span>
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Conversion Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(data.conversionTips || []).map((tip: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-green-400">G��</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================
// BLOG IDEAS TAB COMPONENT
// ============================================

function BlogIdeasTab({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className="text-muted-foreground">No blog ideas available</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.map((blog: any, i: number) => (
        <Card key={i} className="bg-white/5 border-white/10 hover:border-purple-500/30 transition-colors">
          <CardHeader>
            <CardTitle className="text-sm">{blog.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">{blog.keyword}</Badge>
              <Badge variant={blog.intent === 'commercial' ? 'default' : 'secondary'} className="text-xs">
                {blog.intent}
              </Badge>
              <Badge variant={
                blog.difficulty === 'easy' ? 'default' : 
                blog.difficulty === 'medium' ? 'secondary' : 
                'destructive'
              } className="text-xs">
                {blog.difficulty}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// ACTION PLAN TAB COMPONENT
// ============================================

function ActionPlanTab({ data }: { data: any }) {
  if (!data) return <div className="text-muted-foreground">No action plan available</div>;

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            30-Day Action Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(data.day30 || []).map((action: string, i: number) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-green-400 font-bold">{i + 1}.</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            60-Day Action Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(data.day60 || []).map((action: string, i: number) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-blue-400 font-bold">{i + 1}.</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            90-Day Action Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(data.day90 || []).map((action: string, i: number) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-purple-400 font-bold">{i + 1}.</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// PROVIDERS TAB COMPONENT
// ============================================

function ProvidersTab({ metadata }: { metadata: any }) {
  if (!metadata) return <div className="text-muted-foreground">No metadata available</div>;

  const providers = metadata.providers || {};
  const warnings = metadata.warnings || [];
  const analyzedAt = metadata.analyzedAt;

  return (
    <div className="space-y-6">
      {/* Provider Badges */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Data Providers</CardTitle>
          <CardDescription>Services used to collect and analyze SEO data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-2">Scraping Provider</div>
              <Badge variant={providers.scraping === 'firecrawl' ? 'default' : 'secondary'} className="text-sm">
                {providers.scraping || 'basic fetch'}
              </Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-2">Research Provider</div>
              <Badge variant={providers.research ? 'default' : 'outline'} className="text-sm">
                {providers.research || 'none'}
              </Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-2">AI Provider</div>
              <Badge variant={providers.ai === 'groq' ? 'default' : 'secondary'} className="text-sm">
                {providers.ai || 'rule-based'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="w-5 h-5" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {warnings.map((warning: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-yellow-400">G��</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Analysis Metadata */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Analysis Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {analyzedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Analyzed At:</span>
                <span>{new Date(analyzedAt).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Scraping Method:</span>
              <span>{providers.scraping === 'firecrawl' ? 'Firecrawl API (Premium)' : 'Basic HTTP Fetch (Fallback)'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">AI Analysis:</span>
              <span>{providers.ai === 'groq' ? 'Groq AI (llama-3.3-70b)' : 'Rule-Based Engine'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Research API:</span>
              <span>{providers.research === 'tavily' ? 'Tavily Search API' : 'Not Used'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Quality Indicators */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <CardHeader>
          <CardTitle>Data Quality</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Technical Audit</span>
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">SEO Score Calculation</span>
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Content Analysis</span>
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Recommendations</span>
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
          <CardTitle>Provider Information</CardTitle>
          <CardDescription>Services used for this SEO analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-purple-500/10 px-4 py-3 rounded-lg border border-purple-500/30">
              <div className="text-xs text-muted-foreground mb-1">Scraping</div>
              <div className="text-sm font-medium text-purple-400">{providers.scraping || 'basic'}</div>
            </div>
            <div className="bg-blue-500/10 px-4 py-3 rounded-lg border border-blue-500/30">
              <div className="text-xs text-muted-foreground mb-1">Research</div>
              <div className="text-sm font-medium text-blue-400">{providers.research || 'none'}</div>
            </div>
            <div className="bg-green-500/10 px-4 py-3 rounded-lg border border-green-500/30">
              <div className="text-xs text-muted-foreground mb-1">AI Analysis</div>
              <div className="text-sm font-medium text-green-400">{providers.ai || 'rule-based'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {warnings.length > 0 && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="w-5 h-5" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {warnings.map((warning: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-yellow-400">G��</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Analysis Timestamp</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Analyzed: {metadata.analyzedAt ? new Date(metadata.analyzedAt).toLocaleString() : 'Unknown'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
          </div>
        </CardContent>
      </Card>

      {/* Data Quality Indicators */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <CardHeader>
          <CardTitle>Data Quality</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Technical Audit</span>
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">SEO Score Calculation</span>
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Content Analysis</span>
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Recommendations</span>
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
