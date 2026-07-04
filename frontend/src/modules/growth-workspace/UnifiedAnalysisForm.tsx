import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rocket, Building2, Globe, Target, TrendingUp, Users, DollarSign } from 'lucide-react';

interface UnifiedAnalysisFormProps {
  onSubmit: (data: any) => void;
  loading: boolean;
  savedInput?: any;
}

export function UnifiedAnalysisForm({ onSubmit, loading, savedInput }: UnifiedAnalysisFormProps) {
  const [formData, setFormData] = useState({
    productName: '',
    companyName: '',
    websiteUrl: '',
    description: '',
    industry: '',
    targetAudience: '',
    targetCountry: '',
    businessStage: '',
    businessGoal: '',
    campaignGoal: '',
    preferredChannels: '',
    budgetRange: '',
    duration: '',
    tone: '',
    competitors: '',
    competitorUrls: ''
  });

  useEffect(() => {
    if (savedInput) {
      setFormData(prev => ({ ...prev, ...savedInput }));
    }
  }, [savedInput]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section A: Product Basics */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-purple-400" />
            Product Basics
          </CardTitle>
          <CardDescription>Core information about your product</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-white">
              Product Name <Badge variant="destructive" className="ml-1">Required</Badge>
            </label>
            <input
              type="text"
              value={formData.productName}
              onChange={(e) => handleChange('productName', e.target.value)}
              placeholder="e.g., Resume Builder"
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-white">Company Name</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              placeholder="e.g., Resume.io"
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2 text-white">
              Website URL <Badge variant="destructive" className="ml-1">Required</Badge>
            </label>
            <input
              type="url"
              value={formData.websiteUrl}
              onChange={(e) => handleChange('websiteUrl', e.target.value)}
              placeholder="https://yourwebsite.com"
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2 text-white">Product Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief description of what your product does and who it's for"
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section B: Market Context */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            Market Context
          </CardTitle>
          <CardDescription>Market and audience information</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-white">Industry</label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => handleChange('industry', e.target.value)}
              placeholder="e.g., HR Technology"
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-white">Target Audience</label>
            <input
              type="text"
              value={formData.targetAudience}
              onChange={(e) => handleChange('targetAudience', e.target.value)}
              placeholder="e.g., Students and freshers"
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-white">Target Country</label>
            <input
              type="text"
              value={formData.targetCountry}
              onChange={(e) => handleChange('targetCountry', e.target.value)}
              placeholder="e.g., India"
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-white">Business Stage</label>
            <select
              value={formData.businessStage}
              onChange={(e) => handleChange('businessStage', e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white"
            >
              <option value="Pre-launch">Pre-launch</option>
              <option value="Early-stage SaaS">Early-stage SaaS</option>
              <option value="Growth-stage">Growth-stage</option>
              <option value="Mature">Mature</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Section C: Growth Goal */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Growth Goal
          </CardTitle>
          <CardDescription>Campaign objectives and strategy</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2 text-white">Business Goal</label>
            <input
              type="text"
              value={formData.businessGoal}
              onChange={(e) => handleChange('businessGoal', e.target.value)}
              placeholder="e.g., Acquire 10,000 student users in 3 months"
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-white">Campaign Goal</label>
            <input
              type="text"
              value={formData.campaignGoal}
              onChange={(e) => handleChange('campaignGoal', e.target.value)}
              placeholder="e.g., Get more student users"
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-white">Preferred Channel</label>
            <select
              value={formData.preferredChannels}
              onChange={(e) => handleChange('preferredChannels', e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white"
            >
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Twitter">Twitter</option>
              <option value="TikTok">TikTok</option>
              <option value="Google Ads">Google Ads</option>
              <option value="Email">Email</option>
              <option value="SEO/Content">SEO/Content</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-white">Budget Range</label>
            <select
              value={formData.budgetRange}
              onChange={(e) => handleChange('budgetRange', e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white"
            >
              <option value="$0-$1000">$0 - $1,000</option>
              <option value="$1000-$5000">$1,000 - $5,000</option>
              <option value="$5000-$10000">$5,000 - $10,000</option>
              <option value="$10000-$50000">$10,000 - $50,000</option>
              <option value="$50000+">$50,000+</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-white">Campaign Duration</label>
            <select
              value={formData.duration}
              onChange={(e) => handleChange('duration', e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white"
            >
              <option value="7 days">7 days</option>
              <option value="14 days">14 days</option>
              <option value="30 days">30 days</option>
              <option value="60 days">60 days</option>
              <option value="90 days">90 days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-white">Tone</label>
            <select
              value={formData.tone}
              onChange={(e) => handleChange('tone', e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white"
            >
              <option value="Professional">Professional</option>
              <option value="Friendly">Friendly</option>
              <option value="Friendly and professional">Friendly and professional</option>
              <option value="Casual">Casual</option>
              <option value="Bold and edgy">Bold and edgy</option>
              <option value="Inspirational">Inspirational</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Section D: Competitor Context */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-400" />
            Competitor Context
          </CardTitle>
          <CardDescription>Known competitors (optional)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-white">Competitor Names</label>
            <input
              type="text"
              value={formData.competitors}
              onChange={(e) => handleChange('competitors', e.target.value)}
              placeholder="e.g., Canva Resume Builder, Novoresume, Zety"
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40"
            />
            <p className="text-xs text-muted-foreground mt-1">Comma-separated list of competitor names</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-white">Competitor URLs (Optional)</label>
            <textarea
              value={formData.competitorUrls}
              onChange={(e) => handleChange('competitorUrls', e.target.value)}
              placeholder="https://competitor1.com, https://competitor2.com"
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40"
            />
            <p className="text-xs text-muted-foreground mt-1">Comma-separated URLs</p>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-4">
        <div className="text-sm text-muted-foreground">
          <Badge variant="outline" className="mr-2">8 Modules</Badge>
          All analysis modules will use this unified input
        </div>
        <Button
          type="submit"
          disabled={loading}
          size="lg"
          className="gradient-brand text-white font-semibold px-8 h-12 rounded-xl"
        >
          {loading ? (
            <>
              <span className="mr-2">≡ƒöä</span>
              Running Analysis...
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4 mr-2" />
              Run Full Analysis
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
