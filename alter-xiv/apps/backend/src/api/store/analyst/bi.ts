export const QUERIES: Array<{ keywords: string[]; description: string; sql: string; columns: string[] }> = [
  {
    keywords: ['chapter', 'margin', 'revenue', 'best', 'earning', 'price'],
    description: 'Pricing by chapter (margin proxy)',
    sql: `SELECT p.metadata->>'chapter' AS chapter,
           COUNT(DISTINCT p.id) AS products,
           ROUND(AVG(pr.amount) / 100.0, 2) AS avg_price_usd,
           ROUND(MAX(pr.amount) / 100.0, 2) AS max_price_usd
         FROM product p
         JOIN product_variant pv ON pv.product_id = p.id AND pv.deleted_at IS NULL
         JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
         JOIN price_set ps ON ps.id = pvps.price_set_id
         JOIN price pr ON pr.price_set_id = ps.id AND pr.currency_code = 'usd'
         WHERE p.deleted_at IS NULL
         GROUP BY p.metadata->>'chapter'
         ORDER BY avg_price_usd DESC`,
    columns: ['chapter', 'products', 'avg_price_usd', 'max_price_usd'],
  },
  {
    keywords: ['conversion', 'funnel', 'checkout', 'rate'],
    description: 'Conversion funnel (last 7 days)',
    sql: `SELECT type, COUNT(DISTINCT visitor_id) AS unique_visitors, COUNT(*) AS events
         FROM signal_event
         WHERE ts > now() - interval '7 days'
           AND type IN ('product_view','add_to_cart','checkout_step','purchase')
         GROUP BY type
         ORDER BY CASE type WHEN 'product_view' THEN 1 WHEN 'add_to_cart' THEN 2
           WHEN 'checkout_step' THEN 3 WHEN 'purchase' THEN 4 END`,
    columns: ['type', 'unique_visitors', 'events'],
  },
  {
    keywords: ['visitor', 'segment', 'audience', 'distribution'],
    description: 'Visitor segment distribution',
    sql: `SELECT segment, COUNT(*) AS count,
           ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS pct
         FROM visitor_profile GROUP BY segment ORDER BY count DESC`,
    columns: ['segment', 'count', 'pct'],
  },
  {
    keywords: ['drop', 'units', 'sell-through', 'inventory'],
    description: 'Drop sell-through',
    sql: `SELECT name, chapter, status, units_total, units_remaining,
           ROUND(CASE WHEN units_total > 0 THEN
             (1.0 - units_remaining::numeric / units_total::numeric) * 100 ELSE 0 END, 1) AS pct_sold
         FROM "drop" ORDER BY pct_sold DESC`,
    columns: ['name', 'chapter', 'status', 'units_total', 'units_remaining', 'pct_sold'],
  },
  {
    keywords: ['product', 'popular', 'trending', 'viewed'],
    description: 'Top products by engagement',
    sql: `SELECT p.title, p.metadata->>'chapter' AS chapter, COUNT(*) AS signals,
           SUM(CASE WHEN se.type='add_to_cart' THEN 1 ELSE 0 END) AS cart_adds
         FROM signal_event se JOIN product p ON p.id = se.entity_id AND p.deleted_at IS NULL
         WHERE se.ts > now() - interval '7 days'
         GROUP BY p.id, p.title, p.metadata ORDER BY signals DESC LIMIT 10`,
    columns: ['title', 'chapter', 'signals', 'cart_adds'],
  },
  {
    keywords: ['audit', 'health', 'introspection', 'finding'],
    description: 'Recent audit findings',
    sql: `SELECT type, severity, COUNT(*) AS count FROM audit
         WHERE created_at > now() - interval '7 days' GROUP BY type, severity
         ORDER BY CASE severity WHEN 'error' THEN 1 WHEN 'warn' THEN 2 WHEN 'info' THEN 3 END`,
    columns: ['type', 'severity', 'count'],
  },
];

export function matchQuery(question: string) {
  const q = question.toLowerCase();
  type Scored = typeof QUERIES[0] & { score: number };
  return QUERIES.reduce<Scored>((best, cur) => {
    const score = cur.keywords.filter(kw => q.includes(kw)).length;
    return score > best.score ? { ...cur, score } : best;
  }, { ...QUERIES[0], score: 0 });
}

export function buildInsight(q: string, rows: any[], cols: string[]): string {
  if (!rows.length) return 'No data available.';
  const top = rows[0];
  if (q.includes('margin') || q.includes('chapter') || q.includes('earning')) {
    const label = cols.find(c => typeof top[c] === 'string') ?? 'chapter';
    const val = cols.find(c => c.includes('price') || c.includes('usd'));
    return val ? `Best: ${top[label]} (avg $${top[val]})` : `Top: ${top[label]}`;
  }
  if (q.includes('conversion') || q.includes('funnel')) {
    const views = rows.find(r => r.type === 'product_view')?.unique_visitors ?? 0;
    const buys = rows.find(r => r.type === 'purchase')?.unique_visitors ?? 0;
    return views ? `Conversion: ${((buys / views) * 100).toFixed(1)}% (${buys}/${views} visitors)` : 'No purchases yet.';
  }
  if (q.includes('segment') || q.includes('audience')) return `Largest: ${top?.segment} (${top?.pct}%)`;
  if (q.includes('drop') || q.includes('sell') || q.includes('inventory')) {
    return `${top?.name}: ${top?.pct_sold}% sold (${top?.units_remaining}/${top?.units_total} remaining, ${top?.status})`;
  }
  if (q.includes('audit') || q.includes('finding') || q.includes('health')) {
    const errors = rows.filter(r => r.severity === 'error' || r.severity === 'warn');
    return errors.length ? `${errors.length} warning(s). Top: ${errors[0].type} ${errors[0].severity} (${errors[0].count})` : `${rows.length} info findings`;
  }
  return `${rows.length} results. Top: ${JSON.stringify(top).slice(0, 120)}`;
}

export function buildChart(cols: string[], rows: any[]) {
  const isNumeric = (v: any) => typeof v === 'number' || (typeof v === 'string' && v !== '' && !isNaN(Number(v)));
  const numCols = cols.filter(c => isNumeric(rows[0]?.[c]) && typeof rows[0]?.[c] !== 'boolean');
  const labelCol = cols.find(c => !isNumeric(rows[0]?.[c])) ?? cols[0];
  return {
    type: numCols.length ? 'bar' : 'table',
    x: labelCol,
    y: numCols,
    data: rows.slice(0, 10),
  };
}
