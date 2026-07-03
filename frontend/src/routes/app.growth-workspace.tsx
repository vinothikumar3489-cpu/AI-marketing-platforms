import { createFileRoute } from '@tanstack/react-router';
import { GrowthWorkspacePage } from '@/modules/growth-workspace/GrowthWorkspacePage';

export const Route = createFileRoute('/app/growth-workspace')({
  component: GrowthWorkspacePage
});
