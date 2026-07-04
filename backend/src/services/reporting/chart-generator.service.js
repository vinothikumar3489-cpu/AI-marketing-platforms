export function generateBarChartSvg(data, options = {}) {
  const {
    width = 600, height = 300, barColor = '#6366f1',
    barHeight = 20, labelWidth = 150, title = '',
    showValues = true, valuePrefix = '', valueSuffix = ''
  } = options;

  if (!data || data.length === 0) return '';

  const maxValue = Math.max(...data.map(d => d.value || 0), 1);
  const chartHeight = data.length * (barHeight + 12) + 40;
  const actualHeight = Math.max(chartHeight, height);
  const chartWidth = width - labelWidth - 60;

  let bars = '';
  data.forEach((item, i) => {
    const y = 30 + i * (barHeight + 12);
    const barW = Math.max(((item.value || 0) / maxValue) * chartWidth, 2);
    bars += `
      <text x="10" y="${y + barHeight - 4}" font-family="Arial" font-size="11" fill="#374151">${item.label || ''}</text>
      <rect x="${labelWidth}" y="${y}" width="${barW}" height="${barHeight}" rx="3" fill="${item.color || barColor}" opacity="0.85"/>
      ${showValues ? `<text x="${labelWidth + barW + 6}" y="${y + barHeight - 4}" font-family="Arial" font-size="11" fill="#6b7280">${valuePrefix}${item.value || 0}${valueSuffix}</text>` : ''}
    `;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${actualHeight}" viewBox="0 0 ${width} ${actualHeight}">
    ${title ? `<text x="${width / 2}" y="16" font-family="Arial" font-size="13" font-weight="bold" fill="#111827" text-anchor="middle">${title}</text>` : ''}
    ${bars}
  </svg>`;
}

export function generatePieChartSvg(data, options = {}) {
  const { width = 300, height = 300, title = '', showLegend = true } = options;

  if (!data || data.length === 0) return '';

  const total = data.reduce((sum, d) => sum + (d.value || 0), 0) || 1;
  const cx = width / 2;
  const cy = height / 2 - 20;
  const radius = Math.min(cx, cy) - 20;
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

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

    segments += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z" fill="${color}" stroke="white" stroke-width="1"/>`;
  });

  let legend = '';
  if (showLegend) {
    const legendY = height - data.length * 18 - 10;
    data.forEach((item, i) => {
      const color = item.color || colors[i % colors.length];
      legend += `
        <rect x="${cx - 80}" y="${legendY + i * 18}" width="10" height="10" rx="2" fill="${color}"/>
        <text x="${cx - 64}" y="${legendY + i * 18 + 9}" font-family="Arial" font-size="10" fill="#374151">${item.label}: ${item.value}${item.suffix || ''}</text>
      `;
    });
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${title ? `<text x="${cx}" y="14" font-family="Arial" font-size="13" font-weight="bold" fill="#111827" text-anchor="middle">${title}</text>` : ''}
    ${segments}
    ${legend}
  </svg>`;
}

export function generateRadarChartSvg(data, options = {}) {
  const { width = 300, height = 300, title = '' } = options;

  if (!data || data.length === 0) return '';

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 30;
  const numAxes = data.length;
  const angleStep = (2 * Math.PI) / numAxes;

  let grid = '';
  for (let ring = 1; ring <= 4; ring++) {
    const r = (radius / 4) * ring;
    let points = '';
    for (let i = 0; i <= numAxes; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      points += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
    }
    grid += `<path d="${points}" fill="none" stroke="#e5e7eb" stroke-width="1"/>`;
  }

  let axes = '';
  data.forEach((_, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    axes += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
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

  let labels = '';
  data.forEach((item, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const x = cx + (radius + 18) * Math.cos(angle);
    const y = cy + (radius + 18) * Math.sin(angle);
    const anchor = Math.cos(angle) > 0.1 ? 'start' : Math.cos(angle) < -0.1 ? 'end' : 'middle';
    labels += `<text x="${x}" y="${y}" font-family="Arial" font-size="10" fill="#374151" text-anchor="${anchor}">${item.label}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${title ? `<text x="${cx}" y="14" font-family="Arial" font-size="13" font-weight="bold" fill="#111827" text-anchor="middle">${title}</text>` : ''}
    ${grid}
    ${axes}
    <path d="${dataPath}" fill="rgba(99,102,241,0.2)" stroke="#6366f1" stroke-width="2"/>
    ${labels}
  </svg>`;
}

export function generateTrendChartSvg(data, options = {}) {
  const { width = 600, height = 250, lineColor = '#6366f1', title = '', fillColor = 'rgba(99,102,241,0.1)' } = options;

  if (!data || data.length === 0) return '';

  const padding = { top: 30, right: 20, bottom: 30, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const values = data.map(d => d.value || 0);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;
  const stepX = chartW / (data.length - 1 || 1);

  let points = data.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + chartH - ((d.value - minVal) / range) * chartH,
    label: d.label || '',
    value: d.value || 0
  }));

  let pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  let areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  let gridLines = '';
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    const val = Math.round(maxVal - (range / 4) * i);
    gridLines += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#f3f4f6" stroke-width="1"/>`;
    gridLines += `<text x="${padding.left - 8}" y="${y + 4}" font-family="Arial" font-size="10" fill="#9ca3af" text-anchor="end">${val}</text>`;
  }

  let labels = '';
  const labelStep = Math.max(1, Math.floor(data.length / 6));
  points.forEach((p, i) => {
    if (i % labelStep === 0 || i === data.length - 1) {
      labels += `<text x="${p.x}" y="${height - 8}" font-family="Arial" font-size="9" fill="#9ca3af" text-anchor="middle">${p.label}</text>`;
    }
  });

  let dots = '';
  points.forEach(p => {
    dots += `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#6366f1" stroke="white" stroke-width="1.5"/>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${title ? `<text x="${width / 2}" y="16" font-family="Arial" font-size="13" font-weight="bold" fill="#111827" text-anchor="middle">${title}</text>` : ''}
    ${gridLines}
    <path d="${areaD}" fill="${fillColor}" stroke="none"/>
    <path d="${pathD}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linejoin="round"/>
    ${dots}
    ${labels}
  </svg>`;
}

export function generateCompetitorComparisonChart(competitors, options = {}) {
  if (!competitors || competitors.length === 0) return '';
  const data = competitors.map(c => ({
    label: c.name || c.domain || 'Unknown',
    value: c.similarityScore || c.confidence || 50
  }));
  return generateBarChartSvg(data, { ...options, title: options.title || 'Competitor Comparison', barColor: '#8b5cf6' });
}

export function generateChannelAllocationChart(channels, options = {}) {
  if (!channels || channels.length === 0) return '';
  const data = channels.map(c => ({
    label: c.name || c.channel || 'Unknown',
    value: c.budgetAllocation || c.fitScore || 50
  }));
  return generatePieChartSvg(data, { ...options, title: options.title || 'Channel Budget Allocation' });
}

export function generateKeywordDistributionChart(keywords, options = {}) {
  if (!keywords || keywords.length === 0) return '';
  const data = keywords.slice(0, 10).map(k => ({
    label: k.keyword || k,
    value: k.volume || k.searchVolume || 0
  }));
  return generateBarChartSvg(data, { ...options, title: options.title || 'Top Keywords by Volume', barColor: '#10b981' });
}

export function generateMarketShareChart(competitors, ourName, ourShare, options = {}) {
  const data = [
    { label: ourName || 'Our Company', value: ourShare || 0, color: '#6366f1' },
    ...(competitors || []).slice(0, 4).map((c, i) => ({
      label: c.name || c.domain || `Competitor ${i + 1}`,
      value: Math.max(1, Math.round((ourShare || 10) * (0.5 + Math.random() * 0.5))),
      color: ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][i]
    }))
  ];
  return generatePieChartSvg(data, { ...options, title: options.title || 'Market Share Distribution' });
}

export function generateGrowthMatrixChart(opportunities, options = {}) {
  if (!opportunities || opportunities.length === 0) return '';
  const data = opportunities.map(o => ({
    label: o.value || o.name || o.opportunity || 'Opportunity',
    value: o.impact === 'High' ? 85 : o.impact === 'Medium' ? 60 : 30
  }));
  return generateBarChartSvg(data, { ...options, title: options.title || 'Growth Opportunity Matrix', barColor: '#10b981' });
}

export function generateScoreRadarChart(scores, options = {}) {
  const data = Object.entries(scores || {}).map(([key, val]) => ({
    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
    value: typeof val === 'number' ? val : 50
  }));
  return generateRadarChartSvg(data, { ...options, title: options.title || 'Performance Scores' });
}
