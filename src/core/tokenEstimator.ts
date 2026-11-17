import type { MetricProvenance, MetricValue } from '../shared/types';

/**
 * Local heuristic token estimator.
 * Always returns Estimated provenance — never claim Real for this path.
 */
export function estimateTokensFromText(text: string, charsPerToken = 4): MetricValue {
  const safeCpt = Math.max(2, Math.min(8, charsPerToken));
  const chars = [...text].length;
  const tokens = Math.ceil(chars / safeCpt);
  return {
    tokens,
    bytes: Buffer.byteLength(text, 'utf8'),
    provenance: 'Estimated',
    source: `local-chars/${safeCpt}`,
    confidence: 0.55,
    notes: 'Character heuristic only. Not a model tokenizer and not billed usage.'
  };
}

export function estimateTokensFromBytes(bytes: number, charsPerToken = 4): MetricValue {
  const safeCpt = Math.max(2, Math.min(8, charsPerToken));
  const tokens = Math.ceil(bytes / safeCpt);
  return {
    tokens,
    bytes,
    provenance: 'Estimated',
    source: `local-bytes/${safeCpt}`,
    confidence: 0.45,
    notes: 'Byte-length heuristic approximating UTF-8 text tokens.'
  };
}

export function unavailableMetric(source: string, notes: string): MetricValue {
  return {
    tokens: null,
    bytes: null,
    provenance: 'Unavailable',
    source,
    confidence: 0,
    notes
  };
}

export function realMetric(
  tokens: number | null,
  source: string,
  confidence: number,
  notes?: string,
  bytes?: number | null
): MetricValue {
  return {
    tokens,
    bytes: bytes ?? null,
    provenance: 'Real',
    source,
    confidence,
    notes
  };
}

export function importedMetric(
  tokens: number | null,
  source: string,
  confidence: number,
  notes?: string
): MetricValue {
  return {
    tokens,
    provenance: 'Imported',
    source,
    confidence,
    notes
  };
}

export function sumMetrics(parts: MetricValue[], source: string): MetricValue {
  const usable = parts.filter((p) => p.tokens !== null);
  if (usable.length === 0) {
    const allUnavailable = parts.every((p) => p.provenance === 'Unavailable');
    return unavailableMetric(
      source,
      allUnavailable
        ? 'No category values available.'
        : 'Components exist but none expose countable tokens yet.'
    );
  }

  const tokens = usable.reduce((acc, p) => acc + (p.tokens ?? 0), 0);
  const bytes = usable.every((p) => typeof p.bytes === 'number')
    ? usable.reduce((acc, p) => acc + (p.bytes ?? 0), 0)
    : null;

  const provenances = new Set(usable.map((p) => p.provenance));
  let provenance: MetricProvenance = 'Estimated';
  if (provenances.size === 1) {
    provenance = [...provenances][0];
  } else if (provenances.has('Imported') && !provenances.has('Estimated')) {
    provenance = 'Imported';
  } else if (provenances.has('Real') && provenances.size === 1) {
    provenance = 'Real';
  } else {
    provenance = 'Estimated';
  }

  const confidence =
    usable.reduce((acc, p) => acc + p.confidence, 0) / Math.max(1, usable.length);

  return {
    tokens,
    bytes,
    provenance,
    source,
    confidence: Number(confidence.toFixed(2)),
    notes:
      provenances.size > 1
        ? `Mixed provenance (${[...provenances].join(', ')}); total labeled ${provenance}.`
        : undefined
  };
}

export function formatTokens(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return String(value);
}
