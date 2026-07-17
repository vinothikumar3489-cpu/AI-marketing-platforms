/**
 * Tests for Execution Summary and Tab Quality (Phase 20)
 * Validates tab quality rules and execution summary generation
 */

import { getExecutionSummary } from '../execution/marketing-execution.service.js';

describe('Execution Summary and Tab Quality', () => {
  describe('getExecutionSummary', () => {
    it('should return empty summary for null data', () => {
      const result = getExecutionSummary(null);
      
      expect(result).toBeDefined();
      expect(result.total).toBe(0);
      expect(result.modules).toEqual([]);
      expect(result.tabQuality).toEqual({});
    });

    it('should return empty summary for undefined data', () => {
      const result = getExecutionSummary(undefined);
      
      expect(result).toBeDefined();
      expect(result.total).toBe(0);
      expect(result.modules).toEqual([]);
      expect(result.tabQuality).toEqual({});
    });

    it('should include Content Studio as core tab always', () => {
      const data = {
        contentStudio: { totalGenerated: 0 }
      };
      
      const result = getExecutionSummary(data);
      
      expect(result.tabQuality.contentStudio).toBeDefined();
      expect(result.tabQuality.contentStudio.core).toBe(true);
      expect(result.tabQuality.contentStudio.shouldShow).toBe(true);
    });

    it('should include Email Campaigns as core tab always', () => {
      const data = {
        emailCampaigns: { totalGenerated: 0 }
      };
      
      const result = getExecutionSummary(data);
      
      expect(result.tabQuality.emailCampaigns).toBeDefined();
      expect(result.tabQuality.emailCampaigns.core).toBe(true);
      expect(result.tabQuality.emailCampaigns.shouldShow).toBe(true);
    });

    it('should include Campaign Plans as core tab always', () => {
      const data = {
        campaignPlans: { totalGenerated: 0 }
      };
      
      const result = getExecutionSummary(data);
      
      expect(result.tabQuality.campaignPlans).toBeDefined();
      expect(result.tabQuality.campaignPlans.core).toBe(true);
      expect(result.tabQuality.campaignPlans.shouldShow).toBe(true);
    });

    it('should hide Creative Studio if less than 2 briefs', () => {
      const data = {
        creativeStudio: { totalGenerated: 1 }
      };
      
      const result = getExecutionSummary(data);
      
      expect(result.tabQuality.creativeStudio).toBeDefined();
      expect(result.tabQuality.creativeStudio.core).toBe(false);
      expect(result.tabQuality.creativeStudio.shouldShow).toBe(false);
      expect(result.tabQuality.creativeStudio.reason).toContain('minimum 2 required');
    });

    it('should show Creative Studio if 2 or more briefs', () => {
      const data = {
        creativeStudio: { totalGenerated: 2 }
      };
      
      const result = getExecutionSummary(data);
      
      expect(result.tabQuality.creativeStudio).toBeDefined();
      expect(result.tabQuality.creativeStudio.shouldShow).toBe(true);
      expect(result.tabQuality.creativeStudio.dataQuality).toBe('good');
    });

    it('should hide Video Studio if less than 2 scripts', () => {
      const data = {
        videoStudio: { totalGenerated: 1 }
      };
      
      const result = getExecutionSummary(data);
      
      expect(result.tabQuality.videoStudio).toBeDefined();
      expect(result.tabQuality.videoStudio.core).toBe(false);
      expect(result.tabQuality.videoStudio.shouldShow).toBe(false);
      expect(result.tabQuality.videoStudio.reason).toContain('minimum 2 required');
    });

    it('should show Video Studio if 2 or more scripts', () => {
      const data = {
        videoStudio: { totalGenerated: 2 }
      };
      
      const result = getExecutionSummary(data);
      
      expect(result.tabQuality.videoStudio).toBeDefined();
      expect(result.tabQuality.videoStudio.shouldShow).toBe(true);
      expect(result.tabQuality.videoStudio.dataQuality).toBe('good');
    });

    it('should hide Social Calendar if less than 5 entries', () => {
      const data = {
        socialCalendars: { totalGenerated: 4 }
      };
      
      const result = getExecutionSummary(data);
      
      expect(result.tabQuality.socialCalendars).toBeDefined();
      expect(result.tabQuality.socialCalendars.core).toBe(false);
      expect(result.tabQuality.socialCalendars.shouldShow).toBe(false);
      expect(result.tabQuality.socialCalendars.reason).toContain('minimum 5 required');
    });

    it('should show Social Calendar if 5 or more entries', () => {
      const data = {
        socialCalendars: { totalGenerated: 5 }
      };
      
      const result = getExecutionSummary(data);
      
      expect(result.tabQuality.socialCalendars).toBeDefined();
      expect(result.tabQuality.socialCalendars.shouldShow).toBe(true);
      expect(result.tabQuality.socialCalendars.dataQuality).toBe('good');
    });

    it('should calculate total correctly from modules with data', () => {
      const data = {
        contentStudio: { totalGenerated: 5 },
        emailCampaigns: { totalGenerated: 3 },
        creativeStudio: { totalGenerated: 2 }
      };
      
      const result = getExecutionSummary(data);
      
      expect(result.total).toBe(10); // 5 + 3 + 2
      expect(result.modules.length).toBe(3);
    });

    it('should only include modules with data in modules array', () => {
      const data = {
        contentStudio: { totalGenerated: 5 },
        emailCampaigns: { totalGenerated: 0 },
        creativeStudio: { totalGenerated: 2 },
        videoStudio: { totalGenerated: 0 }
      };
      
      const result = getExecutionSummary(data);
      
      expect(result.modules.length).toBe(2);
      expect(result.modules.find(m => m.name === 'Content Studio')).toBeDefined();
      expect(result.modules.find(m => m.name === 'Creative Studio')).toBeDefined();
    });

    it('should set data quality to empty for core tabs with no data', () => {
      const data = {
        contentStudio: { totalGenerated: 0 },
        emailCampaigns: { totalGenerated: 0 }
      };
      
      const result = getExecutionSummary(data);
      
      expect(result.tabQuality.contentStudio.dataQuality).toBe('empty');
      expect(result.tabQuality.emailCampaigns.dataQuality).toBe('empty');
    });

    it('should set data quality to good for tabs with sufficient data', () => {
      const data = {
        contentStudio: { totalGenerated: 5 },
        creativeStudio: { totalGenerated: 3 }
      };
      
      const result = getExecutionSummary(data);
      
      expect(result.tabQuality.contentStudio.dataQuality).toBe('good');
      expect(result.tabQuality.creativeStudio.dataQuality).toBe('good');
    });

    it('should set data quality to low for non-core tabs with insufficient data', () => {
      const data = {
        creativeStudio: { totalGenerated: 1 },
        videoStudio: { totalGenerated: 1 },
        socialCalendars: { totalGenerated: 3 }
      };
      
      const result = getExecutionSummary(data);
      
      expect(result.tabQuality.creativeStudio.dataQuality).toBe('low');
      expect(result.tabQuality.videoStudio.dataQuality).toBe('low');
      expect(result.tabQuality.socialCalendars.dataQuality).toBe('low');
    });

    it('should include item count in tab quality', () => {
      const data = {
        contentStudio: { totalGenerated: 5 },
        creativeStudio: { totalGenerated: 2 }
      };
      
      const result = getExecutionSummary(data);
      
      expect(result.tabQuality.contentStudio.itemCount).toBe(5);
      expect(result.tabQuality.creativeStudio.itemCount).toBe(2);
    });

    it('should handle all modules with zero data', () => {
      const data = {
        contentStudio: { totalGenerated: 0 },
        emailCampaigns: { totalGenerated: 0 },
        creativeStudio: { totalGenerated: 0 },
        videoStudio: { totalGenerated: 0 },
        campaignPlans: { totalGenerated: 0 },
        socialCalendars: { totalGenerated: 0 }
      };
      
      const result = getExecutionSummary(data);
      
      expect(result.total).toBe(0);
      expect(result.modules).toEqual([]);
      expect(Object.keys(result.tabQuality).length).toBe(6);
    });

    it('should handle all modules with maximum data', () => {
      const data = {
        contentStudio: { totalGenerated: 10 },
        emailCampaigns: { totalGenerated: 8 },
        creativeStudio: { totalGenerated: 5 },
        videoStudio: { totalGenerated: 4 },
        campaignPlans: { totalGenerated: 6 },
        socialCalendars: { totalGenerated: 10 }
      };
      
      const result = getExecutionSummary(data);
      
      expect(result.total).toBe(43);
      expect(result.modules.length).toBe(6);
      Object.values(result.tabQuality).forEach(quality => {
        expect(quality.shouldShow).toBe(true);
      });
    });
  });

  describe('Tab Quality Rules', () => {
    it('should enforce minimum threshold for Creative Studio', () => {
      const data = { creativeStudio: { totalGenerated: 1 } };
      const result = getExecutionSummary(data);
      
      expect(result.tabQuality.creativeStudio.shouldShow).toBe(false);
      
      const data2 = { creativeStudio: { totalGenerated: 2 } };
      const result2 = getExecutionSummary(data2);
      
      expect(result2.tabQuality.creativeStudio.shouldShow).toBe(true);
    });

    it('should enforce minimum threshold for Video Studio', () => {
      const data = { videoStudio: { totalGenerated: 1 } };
      const result = getExecutionSummary(data);
      
      expect(result.tabQuality.videoStudio.shouldShow).toBe(false);
      
      const data2 = { videoStudio: { totalGenerated: 2 } };
      const result2 = getExecutionSummary(data2);
      
      expect(result2.tabQuality.videoStudio.shouldShow).toBe(true);
    });

    it('should enforce minimum threshold for Social Calendar', () => {
      const data = { socialCalendars: { totalGenerated: 4 } };
      const result = getExecutionSummary(data);
      
      expect(result.tabQuality.socialCalendars.shouldShow).toBe(false);
      
      const data2 = { socialCalendars: { totalGenerated: 5 } };
      const result2 = getExecutionSummary(data2);
      
      expect(result2.tabQuality.socialCalendars.shouldShow).toBe(true);
    });

    it('should not enforce thresholds for core tabs', () => {
      const data = {
        contentStudio: { totalGenerated: 0 },
        emailCampaigns: { totalGenerated: 0 },
        campaignPlans: { totalGenerated: 0 }
      };
      
      const result = getExecutionSummary(data);
      
      expect(result.tabQuality.contentStudio.shouldShow).toBe(true);
      expect(result.tabQuality.emailCampaigns.shouldShow).toBe(true);
      expect(result.tabQuality.campaignPlans.shouldShow).toBe(true);
    });
  });
});
