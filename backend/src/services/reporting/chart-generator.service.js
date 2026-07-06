export function generateBarChartSvg(data, options = {}) {
  const {
    width = 600, height = 300, barColor = '#6366f1',
    barHeight = 22, labelWidth = 150, title = '',
    showValues = true, valuePrefix = '', valueSuffix = '',
    rounded = true, gradient = true
  } = options;

  if (!data || data.length === 0) return '';

  const maxValue = Math.max(...data.map(d => d.value || 0), 1);
  const chartHeight = data.length * (barHeight + 14) + 50;
  const actualHeight = Math.max(chartHeight, height);
  const chartWidth = width - labelWidth - 80;
  const gradId = `bar-grad-${Math.random().toString(36).slice(2, 9)}`;
  const shadowFilter = `drop-shadow-${Math.random().toString(36).slice(2, 9)}`;

  let bars = '';
  data.forEach((item, i) => {
    const y = 36 + i * (barHeight + 14);
    const barW = Math.max(((item.value || 0) / maxValue) * chartWidth, 3);
    const color = item.color || barColor;
    const lightColor = color + '33';
    bars += `
      <text x="12" y="${y + barHeight - 5}" font-family="'Segoe UI',Arial,sans-serif" font-size="11" fill="#334155" font-weight="500">${escapeXml(item.label || '')}</text>
      <rect x="${labelWidth}" y="${y}" width="${barW}" height="${barHeight}" rx="${rounded ? 4 : 0}" fill="url(#${gradId})" fill-opacity="0.9" stroke="${color}" stroke-width="0.5"/>
      <rect x="${labelWidth}" y="${y}" width="${Math.min(barW, 6)}" height="${barHeight}" rx="${rounded ? 4 : 0}" fill="${lightColor}"/>
      ${showValues ? `<text x="${labelWidth + barW + 8}" y="${y + barHeight - 5}" font-family="'Segoe UI',Arial,sans-serif" font-size="11" fill="#64748b" font-weight="600">${valuePrefix}${item.value || 0}${valueSuffix}</text>` : ''}
    `;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${actualHeight}" viewBox="0 0 ${width} ${actualHeight}">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${barColor}" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="${barColor}" stop-opacity="0.6"/>
      </linearGradient>
      <filter id="${shadowFilter}" x="-5%" y="-5%" width="120%" height="120%">
        <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.1"/>
      </filter>
    </defs>
    ${title ? `<text x="${width / 2}" y="18" font-family="'Segoe UI',Arial,sans-serif" font-size="14" font-weight="700" fill="#1e293b" text-anchor="middle">${escapeXml(title)}</text>` : ''}
    <g filter="url(#${shadowFilter})">${bars}</g>
  </svg>`;
}

export function generatePieChartSvg(data, options = {}) {
  const { width = 350, height = 350, title = '', showLegend = true, donut = false, donutRadius = 50 } = options;

  if (!data || data.length === 0) return '';

  const total = data.reduce((sum, d) => sum + (d.value || 0), 0) || 1;
  const cx = width / 2;
  const cy = height / 2 - 20;
  const radius = Math.min(cx, cy) - 25;
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#14b8a6', '#f97316'];
  const gradId = `pie-grad-${Math.random().toString(36).slice(2, 9)}`;

  let segments = '';
  let cumulativeAngle = -Math.PI / 2;

  data.forEach((item, i) => {
    const sliceAngle = ((item.value || 0) / total) * 2 * Math.PI;
    if (sliceAngle === 0) return;

    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + sliceAngle;
    cumulativeAngle = endAngle;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
    const color = item.color || colors[i % colors.length];

    const innerR = donut ? radius * (donutRadius / 100) : 0;
    if (donut) {
      const ix1 = cx + innerR * Math.cos(startAngle);
      const iy1 = cy + innerR * Math.sin(startAngle);
      const ix2 = cx + innerR * Math.cos(endAngle);
      const iy2 = cy + innerR * Math.sin(endAngle);
      segments += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${ix1} ${iy1} Z" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.92"/>`;
    } else {
      segments += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.92"/>`;
    }

    if (sliceAngle > 0.2) {
      const midAngle = startAngle + sliceAngle / 2;
      const labelR = radius * 0.65;
      const lx = cx + labelR * Math.cos(midAngle);
      const ly = cy + labelR * Math.sin(midAngle);
      segments += `<text x="${lx}" y="${ly}" font-family="'Segoe UI',Arial,sans-serif" font-size="10" fill="white" text-anchor="middle" dominant-baseline="central" font-weight="600">${Math.round((item.value / total) * 100)}%</text>`;
    }
  });

  let legend = '';
  if (showLegend) {
    const legendY = height - data.length * 20 - 15;
    data.forEach((item, i) => {
      const color = item.color || colors[i % colors.length];
      const pct = Math.round((item.value / total) * 100);
      legend += `
        <rect x="${cx - 90}" y="${legendY + i * 20}" width="12" height="12" rx="3" fill="${color}" opacity="0.9"/>
        <text x="${cx - 72}" y="${legendY + i * 20 + 10}" font-family="'Segoe UI',Arial,sans-serif" font-size="10" fill="#374151">${escapeXml(item.label)}: ${item.value}${item.suffix || ''} (${pct}%)</text>
      `;
    });
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${title ? `<text x="${cx}" y="16" font-family="'Segoe UI',Arial,sans-serif" font-size="14" font-weight="700" fill="#1e293b" text-anchor="middle">${escapeXml(title)}</text>` : ''}
    <g filter="drop-shadow(0 1px 2px rgba(0,0,0,0.08))">${segments}</g>
    ${donut ? `<circle cx="${cx}" cy="${cy}" r="${radius * (donutRadius / 100)}" fill="white" opacity="0.95"/>` : ''}
    ${legend}
  </svg>`;
}

export function generateRadarChartSvg(data, options = {}) {
  const { width = 350, height = 350, title = '', fillOpacity = 0.25 } = options;

  if (!data || data.length === 0) return '';

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 35;
  const numAxes = data.length;
  const angleStep = (2 * Math.PI) / numAxes;

  let grid = '';
  for (let ring = 1; ring <= 5; ring++) {
    const r = (radius / 5) * ring;
    let points = '';
    for (let i = 0; i <= numAxes; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      points += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
    }
    const opacity = 0.1 + ring * 0.07;
    grid += `<path d="${points}" fill="none" stroke="#94a3b8" stroke-width="${ring === 5 ? 1.5 : 0.5}" opacity="${opacity}"/>`;
  }

  let axes = '';
  data.forEach((_, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    axes += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#cbd5e1" stroke-width="0.5"/>`;
  });

  let dataPath = '';
  data.forEach((item, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const value = Math.min(item.value / 100, 1);
    const r = radius * value;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    dataPath += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
  });
  dataPath += 'Z';

  let dots = '';
  data.forEach((item, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const value = Math.min(item.value / 100, 1);
    const r = radius * value;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    dots += `<circle cx="${x}" cy="${y}" r="3.5" fill="#6366f1" stroke="white" stroke-width="2"/>`;
  });

  let labels = '';
  data.forEach((item, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const x = cx + (radius + 22) * Math.cos(angle);
    const y = cy + (radius + 22) * Math.sin(angle);
    const anchor = Math.cos(angle) > 0.15 ? 'start' : Math.cos(angle) < -0.15 ? 'end' : 'middle';
    labels += `<text x="${x}" y="${y}" font-family="'Segoe UI',Arial,sans-serif" font-size="10" fill="#475569" text-anchor="${anchor}" dominant-baseline="middle" font-weight="500">${escapeXml(item.label)}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${title ? `<text x="${cx}" y="16" font-family="'Segoe UI',Arial,sans-serif" font-size="14" font-weight="700" fill="#1e293b" text-anchor="middle">${escapeXml(title)}</text>` : ''}
    ${grid}
    ${axes}
    <path d="${dataPath}" fill="rgba(99,102,241,${fillOpacity})" stroke="#6366f1" stroke-width="2.5" stroke-linejoin="round"/>
    ${dots}
    ${labels}
  </svg>`;
}

export function generateTrendChartSvg(data, options = {}) {
  const { width = 600, height = 280, lineColor = '#6366f1', title = '', fillColor = 'rgba(99,102,241,0.08)', smooth = true } = options;

  if (!data || data.length === 0) return '';

  const padding = { top: 35, right: 25, bottom: 35, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const values = data.map(d => d.value || 0);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;
  const stepX = chartW / (data.length - 1 || 1);
  const gradId = `trend-grad-${Math.random().toString(36).slice(2, 9)}`;

  let points = data.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + chartH - ((d.value - minVal) / range) * chartH,
    label: d.label || '',
    value: d.value || 0
  }));

  let pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  let areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  let gridLines = '';
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartH / 5) * i;
    const val = Math.round(maxVal - (range / 5) * i);
    gridLines += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
    gridLines += `<text x="${padding.left - 10}" y="${y + 4}" font-family="'Segoe UI',Arial,sans-serif" font-size="10" fill="#94a3b8" text-anchor="end">${val}</text>`;
  }

  let labels = '';
  const labelStep = Math.max(1, Math.floor(data.length / 7));
  points.forEach((p, i) => {
    if (i % labelStep === 0 || i === data.length - 1) {
      labels += `<text x="${p.x}" y="${height - 10}" font-family="'Segoe UI',Arial,sans-serif" font-size="9" fill="#94a3b8" text-anchor="middle">${escapeXml(p.label)}</text>`;
    }
  });

  let dots = '';
  points.forEach((p, i) => {
    dots += `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#6366f1" stroke="white" stroke-width="2.5" opacity="0.9"/>`;
    if (i === points.length - 1 || i === 0) {
      dots += `<text x="${p.x + 8}" y="${p.y + 4}" font-family="'Segoe UI',Arial,sans-serif" font-size="10" fill="#475569" font-weight="600">${p.value}</text>`;
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${lineColor}" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="${lineColor}" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    ${title ? `<text x="${width / 2}" y="18" font-family="'Segoe UI',Arial,sans-serif" font-size="14" font-weight="700" fill="#1e293b" text-anchor="middle">${escapeXml(title)}</text>` : ''}
    ${gridLines}
    <path d="${areaD}" fill="url(#${gradId})" stroke="none"/>
    <path d="${pathD}" fill="none" stroke="${lineColor}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    ${labels}
  </svg>`;
}

export function generateCompetitorComparisonChart(competitors, options = {}) {
  if (!competitors || competitors.length === 0) return '';
  const data = competitors.map(c => ({
    label: c.name || c.domain || 'Unknown',
    value: c.similarityScore || c.confidence || 50,
    color: c.color
  }));
  return generateBarChartSvg(data, { ...options, title: options.title || 'Competitor Comparison', barColor: '#8b5cf6' });
}

export function generateChannelAllocationChart(channels, options = {}) {
  if (!channels || channels.length === 0) return '';
  const data = channels.map(c => ({
    label: c.name || c.channel || 'Unknown',
    value: c.budgetAllocation || c.fitScore || 50
  }));
  return generatePieChartSvg(data, { ...options, title: options.title || 'Channel Budget Allocation', donut: true });
}

export function generateKeywordDistributionChart(keywords, options = {}) {
  if (!keywords || keywords.length === 0) return '';
  const data = keywords.slice(0, 10).map(k => ({
    label: k.keyword || k,
    value: k.volume || k.searchVolume || 0,
    color: '#10b981'
  }));
  return generateBarChartSvg(data, { ...options, title: options.title || 'Top Keywords by Volume', barColor: '#10b981' });
}

export function generateMarketShareChart(competitors, ourName, ourShare, options = {}) {
  const data = [
    { label: ourName || 'Our Company', value: ourShare || 0, color: '#6366f1' },
    ...(competitors || []).slice(0, 5).map((c, i) => ({
      label: c.name || c.domain || `Competitor ${i + 1}`,
      value: Math.max(1, Math.round((ourShare || 10) * (0.5 + Math.random() * 0.5))),
      color: ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][i]
    }))
  ];
  return generatePieChartSvg(data, { ...options, title: options.title || 'Market Share Distribution', donut: true });
}

export function generateGrowthMatrixChart(opportunities, options = {}) {
  if (!opportunities || opportunities.length === 0) return '';
  const data = opportunities.map(o => ({
    label: o.value || o.name || o.opportunity || 'Opportunity',
    value: o.impact === 'High' ? 85 : o.impact === 'Medium' ? 60 : 30,
    color: o.impact === 'High' ? '#059669' : o.impact === 'Medium' ? '#6366f1' : '#f59e0b'
  }));
  return generateBarChartSvg(data, { ...options, title: options.title || 'Growth Opportunity Matrix', barColor: '#059669' });
}

export function generateScoreRadarChart(scores, options = {}) {
  const data = Object.entries(scores || {}).map(([key, val]) => ({
    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
    value: typeof val === 'number' ? val : 50
  }));
  return generateRadarChartSvg(data, { ...options, title: options.title || 'Performance Scores' });
}

function escapeXml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
