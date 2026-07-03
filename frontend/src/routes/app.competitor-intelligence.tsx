import { createFileRoute } from "@tanstack/react-router";
import { CompetitorIntelligencePage } from "@/modules/competitor-intelligence/CompetitorIntelligencePage";

export const Route = createFileRoute("/app/competitor-intelligence")({ component: CompetitorIntelligencePage });
