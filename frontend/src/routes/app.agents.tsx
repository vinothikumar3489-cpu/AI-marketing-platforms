import { createFileRoute } from "@tanstack/react-router";
import AgentsPage from '@/modules/agents/AgentsPage';

export const Route = createFileRoute("/app/agents")({ component: AgentsPage });
