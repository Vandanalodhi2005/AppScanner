import type { ScanResult } from '@/types/storage';

let currentScanResult: ScanResult | null = null;

export function setCurrentScanResult(result: ScanResult): void {
  currentScanResult = result;
}

export function getCurrentScanResult(): ScanResult | null {
  return currentScanResult;
}
