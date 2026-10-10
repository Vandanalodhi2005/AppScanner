import type { ScanResult } from '@/types/storage';

let currentScanResult: ScanResult | null = null;
const scanHistory: ScanResult[] = [];

export function setCurrentScanResult(result: ScanResult): void {
  currentScanResult = result;
  if (result.status === 'completed' || result.status === 'partial') {
    // Avoid duplicate insertions of the same scan
    const exists = scanHistory.some((s) => s.startedAt === result.startedAt);
    if (!exists) {
      scanHistory.unshift(result);
    }
  }
}

export function getCurrentScanResult(): ScanResult | null {
  return currentScanResult;
}

export function getScanHistory(): ScanResult[] {
  return [...scanHistory];
}

export function clearScanHistory(): void {
  scanHistory.length = 0;
}

