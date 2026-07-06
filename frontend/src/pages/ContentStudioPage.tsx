import AIContentStudio from '../components/AIContentStudio';
import { Card, PageHeader } from '../components/UI';

export default function ContentStudioPage() {
  return (
    <div>
      <PageHeader
        eyebrow="AI-powered Content & Campaign Studio"
        title="Content & Campaign Studio"
        subtitle="Generate, preview, and manage content assets, emails, social posts, creatives, videos, and campaign plans."
      />
      <Card>
        <AIContentStudio />
      </Card>
    </div>
  );
}
