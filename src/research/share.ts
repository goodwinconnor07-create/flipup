import type { ResearchReviewPacket } from './reviewPacket';
import { parseMetadata, parseResearchHand, type ResearchReport } from './protocol';
export const RESEARCH_SHARE_FORMAT = 'flipup-research-share-1' as const;
const PART_CHARACTERS = 24000;
const MAX_BYTES = 64 * 1024 * 1024;
interface SharePart {
  format: typeof RESEARCH_SHARE_FORMAT;
  encoding: 'gzip-base64' | 'json-base64';
  part: number;
  total: number;
  hands: number;
  checksum: string;
  data: string;
}
async function boundedBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array<ArrayBuffer>> {
  const reader = stream.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new Error('This report is too large to copy. Use Download full report instead.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
async function checksum(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((n) => n.toString(16).padStart(2, '0')).join('');
}
function base64(bytes: Uint8Array): string {
  const pieces: string[] = [];
  for (let i = 0; i < bytes.length; i += 8192) pieces.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
  return btoa(pieces.join(''));
}
/** Lossless clipboard transport. Contains the report, never its bearer key or private review URL. */
export async function encodeResearchShare(report: ResearchReport, partCharacters = PART_CHARACTERS): Promise<string[]> {
  return encodeResearchPayload(
    { metadata: report.metadata, expiresAt: report.expiresAt, hands: report.hands },
    report.hands.length,
    partCharacters,
  );
}
export async function encodeResearchPayload(payload: object, hands: number, partCharacters = PART_CHARACTERS): Promise<string[]> {
  if (!Number.isSafeInteger(partCharacters) || partCharacters < 256 || partCharacters > PART_CHARACTERS)
    throw new Error('Invalid copy part size.');
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  if (bytes.length > MAX_BYTES) throw new Error('This report is too large to copy. Use Download full report instead.');
  const encoding = typeof CompressionStream === 'function' ? 'gzip-base64' : 'json-base64';
  const compressed =
    encoding === 'gzip-base64' ? await boundedBytes(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))) : bytes;
  const data = base64(compressed),
    digest = await checksum(bytes),
    total = Math.max(1, Math.ceil(data.length / partCharacters));
  return Array.from({ length: total }, (_, i) =>
    JSON.stringify({
      format: RESEARCH_SHARE_FORMAT,
      encoding,
      part: i + 1,
      total,
      hands,
      checksum: digest,
      data: data.slice(i * partCharacters, (i + 1) * partCharacters),
    } satisfies SharePart),
  );
}
/** Require a complete, consistent set and verify the original bytes before reviewing or replaying. */
export async function decodeResearchPacket(texts: string[]): Promise<ResearchReport | ResearchReviewPacket> {
  if (!texts.length || texts.length > 4096) throw new Error('Provide all copied research parts.');
  const parts = texts.map((text) => JSON.parse(text) as SharePart),
    first = parts[0];
  for (const p of parts) {
    if (
      p.format !== RESEARCH_SHARE_FORMAT ||
      !['gzip-base64', 'json-base64'].includes(p.encoding) ||
      !Number.isInteger(p.total) ||
      p.total < 1 ||
      p.total > 4096 ||
      !Number.isInteger(p.part) ||
      p.part < 1 ||
      p.part > p.total ||
      !Number.isInteger(p.hands) ||
      p.hands < 0 ||
      p.hands > 120 ||
      typeof p.data !== 'string' ||
      typeof p.checksum !== 'string' ||
      !/^[a-f0-9]{64}$/.test(p.checksum)
    )
      throw new Error('Invalid research copy part.');
    if (p.checksum !== first.checksum || p.total !== first.total || p.encoding !== first.encoding || p.hands !== first.hands)
      throw new Error('These parts belong to different report copies. Copy every part from the same report.');
  }
  if (parts.length !== first.total || new Set(parts.map((p) => p.part)).size !== first.total)
    throw new Error('Research parts are missing or duplicated. Provide each numbered part once.');
  const data = parts
    .sort((a, b) => a.part - b.part)
    .map((p) => p.data)
    .join('');
  if (data.length > Math.ceil((MAX_BYTES * 4) / 3) + 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data) || data.length % 4)
    throw new Error('Invalid encoded research data.');
  const compressed = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  if (first.encoding === 'gzip-base64' && typeof DecompressionStream !== 'function')
    throw new Error('Use a runtime with gzip decompression support to review this report.');
  const bytes =
    first.encoding === 'gzip-base64'
      ? await boundedBytes(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip')))
      : compressed;
  if ((await checksum(bytes)) !== first.checksum) throw new Error('The copied report changed or was cut off. Copy the parts again.');
  const decoded = JSON.parse(new TextDecoder().decode(bytes)) as ResearchReport | ResearchReviewPacket;
  const metadata = parseMetadata(decoded.metadata);
  if (
    !metadata ||
    !Array.isArray(decoded.hands) ||
    decoded.hands.length !== first.hands ||
    decoded.hands.length > metadata.limit ||
    new Set(decoded.hands.map((h) => h.index)).size !== decoded.hands.length
  )
    throw new Error('The copied report is not a valid research session.');
  if ('format' in decoded && decoded.format === 'flipup-research-review-1') {
    if (
      !decoded.summary ||
      decoded.hands.some(
        (h) =>
          !Number.isInteger(h.index) || h.index < 0 || h.index >= metadata.limit || !Array.isArray(h.events) || !Array.isArray(h.decisions),
      )
    )
      throw new Error('Invalid research review packet.');
    return decoded;
  }
  const report = decoded as ResearchReport;
  if (report.hands.some((h) => !parseResearchHand(h, metadata))) throw new Error('The copied report is not a valid research session.');
  return report;
}
export async function decodeResearchShare(texts: string[]): Promise<ResearchReport> {
  const decoded = await decodeResearchPacket(texts);
  if ('format' in decoded) throw new Error('Exact replay needs the full replay packet, not the smaller review copy.');
  return decoded;
}
