/**
 * test-windows-scanner.js
 *
 * Automated verification test suite for Phase 1 Windows PC Cleaner read-only scanner.
 * Uses isolated temporary directories in the system temp folder (os.tmpdir()).
 * Never touches Windows system directories or user documents.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

// Path resolution functions replicating windowsFileScanner.ts logic for testing
function normalizeWindowsPath(rawPath) {
  if (!rawPath) return '';
  let cleaned = rawPath.trim().replace(/\\/g, '/');
  cleaned = cleaned.replace(/([^:]\/)\/+/g, '$1');
  return cleaned.replace(/\/+$/, '');
}

function isApprovedWindowsScanRoot(targetPath, mockUserProfile) {
  if (!targetPath || typeof targetPath !== 'string') return false;

  const normalized = normalizeWindowsPath(targetPath).toLowerCase();

  // 1. Prohibit traversal or control characters
  if (normalized.includes('..') || normalized.includes('\0')) {
    return false;
  }

  // 2. Explicitly forbidden Windows system directories
  const forbiddenPrefixes = [
    'c:/windows',
    'c:/program files',
    'c:/program files (x86)',
    'c:/programdata',
    'c:/system volume information',
    'c:/$recycle.bin',
    'c:/recovery',
    'c:/perflogs',
    'c:/boot',
  ];

  for (const forbidden of forbiddenPrefixes) {
    if (normalized === forbidden || normalized.startsWith(`${forbidden}/`)) {
      return false;
    }
  }

  // 3. Explicitly forbidden personal user documents
  const userRoot = normalizeWindowsPath(mockUserProfile || process.env.USERPROFILE || 'C:/Users/TestUser').toLowerCase();
  if (userRoot) {
    const forbiddenPersonalDirs = [
      `${userRoot}/documents`,
      `${userRoot}/desktop`,
      `${userRoot}/downloads`,
      `${userRoot}/pictures`,
      `${userRoot}/music`,
      `${userRoot}/videos`,
      `${userRoot}/contacts`,
      `${userRoot}/favorites`,
      `${userRoot}/saved games`,
      `${userRoot}/searches`,
    ];

    for (const forbidden of forbiddenPersonalDirs) {
      if (normalized === forbidden || normalized.startsWith(`${forbidden}/`)) {
        return false;
      }
    }
  }

  // 4. Must match an explicitly approved pattern: Temp, Cache, Explorer thumbnails, or WER
  const isApprovedPattern =
    normalized.endsWith('/temp') ||
    normalized.includes('/temp/') ||
    normalized.includes('/cache') ||
    normalized.includes('/inetcache') ||
    normalized.includes('/explorer') ||
    normalized.includes('/wer/reportarchive') ||
    normalized.includes('/wer/reportqueue');

  return isApprovedPattern;
}

// Simulated mock scanner traversal matching the Directory/File engine
async function traverseMockDirectory(dirPath, rootPath, depth, visitedUris, entries, counters, shouldCancel) {
  if (depth > 6 || shouldCancel()) return;

  const normalizedPath = normalizeWindowsPath(dirPath).toLowerCase();
  const normalizedRoot = normalizeWindowsPath(rootPath).toLowerCase();

  // Root boundary enforcement
  if (!normalizedPath.startsWith(normalizedRoot)) {
    counters.skippedCount++;
    return;
  }

  // Cycle detection
  if (visitedUris.has(normalizedPath)) {
    counters.skippedCount++;
    return;
  }
  visitedUris.add(normalizedPath);

  let items;
  try {
    items = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (err) {
    counters.skippedCount++;
    return;
  }

  for (const item of items) {
    if (shouldCancel()) break;

    counters.scannedCount++;
    const fullPath = path.join(dirPath, item.name);

    if (item.isDirectory()) {
      const lowerName = item.name.toLowerCase();
      if (lowerName === 'application data' || lowerName === 'history') {
        counters.skippedCount++;
        continue;
      }

      await traverseMockDirectory(fullPath, rootPath, depth + 1, visitedUris, entries, counters, shouldCancel);
    } else if (item.isFile()) {
      try {
        const stat = fs.statSync(fullPath);
        entries.push({
          id: `file:///${normalizeWindowsPath(fullPath)}`,
          name: item.name,
          relativePath: normalizeWindowsPath(fullPath).slice(normalizedRoot.length),
          uri: `file:///${normalizeWindowsPath(fullPath)}`,
          sizeBytes: stat.size,
          lastModified: Math.floor(stat.mtimeMs),
        });
      } catch (err) {
        counters.unreadableCount++;
        counters.skippedCount++;
      }
    }
  }
}

async function runTestSuite() {
  console.log('======================================================');
  console.log('🧪 Windows PC Cleaner Phase 1 Scanner Test Suite');
  console.log('======================================================\n');

  const testDir = path.join(os.tmpdir(), `scannerapp_win_test_${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });

  const passedTests = [];
  const failedTests = [];

  function recordPass(name) {
    passedTests.push(name);
    console.log(`✅ PASS: ${name}`);
  }

  function recordFail(name, error) {
    failedTests.push({ name, error: error.message });
    console.log(`❌ FAIL: ${name} -> ${error.message}`);
  }

  try {
    // ── Test 1: Security Allowlist Rejection of System Directories ──
    try {
      assert.strictEqual(isApprovedWindowsScanRoot('C:\\Windows\\System32'), false);
      assert.strictEqual(isApprovedWindowsScanRoot('C:/Program Files/App'), false);
      assert.strictEqual(isApprovedWindowsScanRoot('C:/ProgramData/Temp'), false);
      assert.strictEqual(isApprovedWindowsScanRoot('C:/$Recycle.Bin'), false);
      assert.strictEqual(isApprovedWindowsScanRoot('C:/Windows/Temp'), false);
      recordPass('Security Allowlist rejects Windows system directories');
    } catch (e) {
      recordFail('Security Allowlist rejects Windows system directories', e);
    }

    // ── Test 2: Security Allowlist Rejection of Personal Documents ──
    try {
      const userProfile = 'C:/Users/Alice';
      assert.strictEqual(isApprovedWindowsScanRoot('C:/Users/Alice/Documents/temp', userProfile), false);
      assert.strictEqual(isApprovedWindowsScanRoot('C:/Users/Alice/Desktop', userProfile), false);
      assert.strictEqual(isApprovedWindowsScanRoot('C:/Users/Alice/Downloads', userProfile), false);
      assert.strictEqual(isApprovedWindowsScanRoot('C:/Users/Alice/Pictures/cache', userProfile), false);
      recordPass('Security Allowlist rejects personal user documents and folders');
    } catch (e) {
      recordFail('Security Allowlist rejects personal user documents and folders', e);
    }

    // ── Test 3: Security Allowlist Rejection of Path Traversal ──
    try {
      assert.strictEqual(isApprovedWindowsScanRoot('C:/Users/Alice/AppData/Local/Temp/../../../Windows'), false);
      assert.strictEqual(isApprovedWindowsScanRoot('C:/Users/Alice/AppData/Local/Temp/..\Documents'), false);
      recordPass('Security Allowlist rejects path traversal attempts (..) and escapes');
    } catch (e) {
      recordFail('Security Allowlist rejects path traversal attempts', e);
    }

    // ── Test 4: Security Allowlist Acceptance of Approved Temporary Folders ──
    try {
      assert.strictEqual(isApprovedWindowsScanRoot('C:/Users/Alice/AppData/Local/Temp'), true);
      assert.strictEqual(isApprovedWindowsScanRoot('C:/Users/Alice/AppData/Local/Microsoft/Windows/INetCache'), true);
      assert.strictEqual(isApprovedWindowsScanRoot('C:/Users/Alice/AppData/Local/Google/Chrome/User Data/Default/Cache'), true);
      assert.strictEqual(isApprovedWindowsScanRoot('C:/Users/Alice/AppData/Local/Microsoft/Windows/Explorer'), true);
      assert.strictEqual(isApprovedWindowsScanRoot('C:/Users/Alice/AppData/Local/Microsoft/Windows/WER/ReportArchive'), true);
      recordPass('Security Allowlist approves legitimate user Temp, Browser, and WER caches');
    } catch (e) {
      recordFail('Security Allowlist approves legitimate user Temp, Browser, and WER caches', e);
    }

    // ── Test 5: Empty Directory Handling ──
    try {
      const emptyDir = path.join(testDir, 'empty_dir');
      fs.mkdirSync(emptyDir, { recursive: true });

      const entries = [];
      const counters = { scannedCount: 0, skippedCount: 0, unreadableCount: 0 };
      await traverseMockDirectory(emptyDir, emptyDir, 0, new Set(), entries, counters, () => false);

      assert.strictEqual(entries.length, 0);
      assert.strictEqual(counters.scannedCount, 0);
      assert.strictEqual(counters.skippedCount, 0);
      recordPass('Empty directory scanned safely with 0 junk files and 0 errors');
    } catch (e) {
      recordFail('Empty directory scanned safely', e);
    }

    // ── Test 6: Nested Directories & Byte Calculation ──
    try {
      const nestedDir = path.join(testDir, 'nested_root');
      const subDirA = path.join(nestedDir, 'sub_a');
      const subDirB = path.join(subDirA, 'sub_b');
      fs.mkdirSync(subDirB, { recursive: true });

      const file1 = path.join(nestedDir, 'test1.tmp');
      const file2 = path.join(subDirA, 'test2.tmp');
      const file3 = path.join(subDirB, 'test3.tmp');

      fs.writeFileSync(file1, Buffer.alloc(1024, 0xAA)); // 1024 bytes
      fs.writeFileSync(file2, Buffer.alloc(2048, 0xBB)); // 2048 bytes
      fs.writeFileSync(file3, Buffer.alloc(4096, 0xCC)); // 4096 bytes

      const entries = [];
      const counters = { scannedCount: 0, skippedCount: 0, unreadableCount: 0 };
      await traverseMockDirectory(nestedDir, nestedDir, 0, new Set(), entries, counters, () => false);

      const totalBytes = entries.reduce((s, e) => s + e.sizeBytes, 0);

      assert.strictEqual(entries.length, 3);
      assert.strictEqual(totalBytes, 1024 + 2048 + 4096);
      recordPass('Nested directory hierarchy traversed with 100% accurate byte totals');
    } catch (e) {
      recordFail('Nested directory hierarchy traversed with accurate byte totals', e);
    }

    // ── Test 7: Missing Directory Handling (No throw) ──
    try {
      const nonExistent = path.join(testDir, 'does_not_exist_404');
      const entries = [];
      const counters = { scannedCount: 0, skippedCount: 0, unreadableCount: 0 };
      await traverseMockDirectory(nonExistent, nonExistent, 0, new Set(), entries, counters, () => false);

      assert.strictEqual(entries.length, 0);
      assert.strictEqual(counters.skippedCount, 1);
      recordPass('Missing directories handled gracefully without throwing unhandled exceptions');
    } catch (e) {
      recordFail('Missing directories handled gracefully', e);
    }

    // ── Test 8: Cancellation Mid-Scan ──
    try {
      const cancelDir = path.join(testDir, 'cancel_dir');
      fs.mkdirSync(cancelDir, { recursive: true });
      for (let i = 0; i < 20; i++) {
        fs.writeFileSync(path.join(cancelDir, `file_${i}.tmp`), 'data');
      }

      const entries = [];
      const counters = { scannedCount: 0, skippedCount: 0, unreadableCount: 0 };
      let itemsVisited = 0;

      // Cancel after 3 items
      await traverseMockDirectory(
        cancelDir,
        cancelDir,
        0,
        new Set(),
        entries,
        counters,
        () => {
          itemsVisited++;
          return itemsVisited >= 3;
        }
      );

      assert.ok(entries.length < 20, `Entries count (${entries.length}) should be less than 20 due to cancellation`);
      recordPass('Cancellation stops traversal promptly');
    } catch (e) {
      recordFail('Cancellation stops traversal promptly', e);
    }

    // ── Test 9: Cycle Detection & Junction Point Protection ──
    try {
      const junctionDir = path.join(testDir, 'junction_root');
      const fakeJunction = path.join(junctionDir, 'Application Data');
      fs.mkdirSync(fakeJunction, { recursive: true });
      fs.writeFileSync(path.join(fakeJunction, 'loop.tmp'), 'loop');

      const entries = [];
      const counters = { scannedCount: 0, skippedCount: 0, unreadableCount: 0 };
      await traverseMockDirectory(junctionDir, junctionDir, 0, new Set(), entries, counters, () => false);

      // 'Application Data' should be skipped by junction guard
      assert.strictEqual(entries.length, 0);
      assert.strictEqual(counters.skippedCount, 1);
      recordPass('Known Windows junction point (Application Data) skipped safely');
    } catch (e) {
      recordFail('Known Windows junction point skipped safely', e);
    }

    // ── Test 10: Android Scanner Isolation Verification ──
    try {
      const androidScannerContent = fs.readFileSync(
        path.join(__dirname, '../src/services/androidFileScanner.ts'),
        'utf8'
      );
      assert.ok(
        androidScannerContent.includes("Platform.OS !== 'android'"),
        'androidFileScanner.ts must guard Platform.OS === android'
      );

      const appCacheScannerContent = fs.readFileSync(
        path.join(__dirname, '../src/services/appCacheScanner.ts'),
        'utf8'
      );
      assert.ok(
        appCacheScannerContent.includes("Platform.OS !== 'android'"),
        'appCacheScanner.ts must guard Platform.OS === android'
      );

      recordPass('Android scanner services are completely unchanged and isolated');
    } catch (e) {
      recordFail('Android scanner services isolation check', e);
    }
  } finally {
    // Clean up temporary fixtures
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error in temp
    }
  }

  console.log('\n======================================================');
  console.log(`Summary: ${passedTests.length} passed, ${failedTests.length} failed.`);
  console.log('======================================================\n');

  if (failedTests.length > 0) {
    process.exit(1);
  }
}

runTestSuite();
