import { createFileRoute } from "@tanstack/react-router";
import { CampaignIntelligencePage } from "@/modules/campaign-intelligence/CampaignIntelligencePage";

export const Route = createFileRoute("/app/campaign-intelligence")({ component: CampaignIntelligencePage });
