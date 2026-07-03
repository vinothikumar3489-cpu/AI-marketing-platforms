import { createFileRoute } from '@tanstack/react-router';
import { SolutionGeneratorPage } from '@/modules/workflow/SolutionGeneratorPage';

export const Route = createFileRoute('/app/solution-generator')({
  component: SolutionGeneratorPage,
});
