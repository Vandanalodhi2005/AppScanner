/**
 * test-cleanup-validation.js
 *
 * Validates cleanup function logic without attempting actual file deletion.
 * Tests path validation, authorization checks, and reporting.
 */

const fs = require('fs');
const path = require('path');

// Mock the cleanup report generation logic
function validateCleanupEntry(entry, approvedRoots) {
  const issues = [];

  // 1. Entry type check
  if (!entry.uri) {
    issues.push('Entry has invalid or missing URI');
    return { valid: false, issues };
  }

  // 2. Authorization boundary check
  const entryNormalized = entry.uri.toLowerCase().replace(/^file:\/\/\//, '');
  const isAuthorized = approvedRoots.some(
    (root) =>
      entryNormalized === root || entryNormalized.startsWith(`${root}/`)
  );

  if (!isAuthorized) {
    issues.push('File does not belong to an approved scan root');
    return { valid: false, issues };
  }

  // 3. Path traversal guard
  if (entry.relativePath.includes('..') || entry.relativePath.includes('\0')) {
    issues.push('Relative path contains traversal segments');
    return { valid: false, issues };
  }

  // 4. Would check directory existence here
  // Skipped in unit test - checks would be performed at runtime

  // 5. Timestamp validation
  if (entry.lastModified !== null && typeof entry.lastModified === 'number') {
    const now = Date.now();
    if (Math.abs(now - entry.lastModified) > 3000) {
      issues.push('File modification time changed after scan');
      return { valid: false, issues };
    }
  }

  return { valid: true, issues: [] };
}

console.log('======================================================');
console.log('🧪 Cleanup Function Validation Tests');
console.log('======================================================\n');

const testRoots = [
  'c:/users/test/appdata/local/temp'.toLowerCase(),
  'c:/users/test/appdata/local/microsoft/windows/inetcache'.toLowerCase(),
];

const passedTests = [];
const failedTests = [];

function recordPass(name) {
  passedTests.push(name);
  console.log(`✅ PASS: ${name}`);
}

function recordFail(name, error) {
  failedTests.push({ name, error });
  console.log(`❌ FAIL: ${name} -> ${error}`);
}

// Test 1: Valid file within approved root
try {
  const entry = {
    id: 'file:///c:/users/test/appdata/local/temp/file1.tmp',
    uri: 'file:///c:/users/test/appdata/local/temp/file1.tmp',
    relativePath: 'file1.tmp',
    lastModified: Date.now(),
  };

  const result = validateCleanupEntry(entry, testRoots);
  if (result.valid && result.issues.length === 0) {
    recordPass('Valid file within approved root accepted');
  } else {
    recordFail('Valid file within approved root', new Error(result.issues[0]));
  }
} catch (e) {
  recordFail('Valid file test', e);
}

// Test 2: File outside approved roots rejected
try {
  const entry = {
    id: 'file:///c:/windows/temp/system.tmp',
    uri: 'file:///c:/windows/temp/system.tmp',
    relativePath: 'system.tmp',
    lastModified: Date.now(),
  };

  const result = validateCleanupEntry(entry, testRoots);
  if (!result.valid && result.issues.length > 0) {
    recordPass('File outside approved root rejected');
  } else {
    recordFail('File outside approved root rejection', new Error('Should have rejected'));
  }
} catch (e) {
  recordFail('Unauthorized file test', e);
}

// Test 3: Path traversal rejected
try {
  const entry = {
    id: 'file:///c:/users/test/appdata/local/temp/../../../windows/file.tmp',
    uri: 'file:///c:/users/test/appdata/local/temp/../../../windows/file.tmp',
    relativePath: '../../../windows/file.tmp',
    lastModified: Date.now(),
  };

  const result = validateCleanupEntry(entry, testRoots);
  if (!result.valid && result.issues.length > 0) {
    recordPass('Path traversal (..) rejected');
  } else {
    recordFail('Path traversal rejection', new Error('Should have rejected'));
  }
} catch (e) {
  recordFail('Path traversal test', e);
}

// Test 4: Null character rejected
try {
  const entry = {
    id: 'file:///c:/users/test/appdata/local/temp/file\0.tmp',
    uri: 'file:///c:/users/test/appdata/local/temp/file.tmp',
    relativePath: 'file\0.tmp',
    lastModified: Date.now(),
  };

  const result = validateCleanupEntry(entry, testRoots);
  if (!result.valid && result.issues.length > 0) {
    recordPass('Null character in path rejected');
  } else {
    recordFail('Null character rejection', new Error('Should have rejected'));
  }
} catch (e) {
  recordFail('Null character test', e);
}

// Test 5: Missing URI rejected
try {
  const entry = {
    id: 'file1',
    uri: '',
    relativePath: 'file1.tmp',
    lastModified: Date.now(),
  };

  const result = validateCleanupEntry(entry, testRoots);
  if (!result.valid && result.issues.length > 0) {
    recordPass('Missing URI rejected');
  } else {
    recordFail('Missing URI rejection', new Error('Should have rejected'));
  }
} catch (e) {
  recordFail('Missing URI test', e);
}

// Test 6: Nested path within approved root accepted
try {
  const entry = {
    id: 'file:///c:/users/test/appdata/local/temp/nested/folder/file.tmp',
    uri: 'file:///c:/users/test/appdata/local/temp/nested/folder/file.tmp',
    relativePath: 'nested/folder/file.tmp',
    lastModified: Date.now(),
  };

  const result = validateCleanupEntry(entry, testRoots);
  if (result.valid && result.issues.length === 0) {
    recordPass('Nested path within approved root accepted');
  } else {
    recordFail('Nested path validation', new Error(result.issues[0]));
  }
} catch (e) {
  recordFail('Nested path test', e);
}

console.log('\n======================================================');
console.log(`Summary: ${passedTests.length} passed, ${failedTests.length} failed.`);
console.log('======================================================\n');

if (failedTests.length > 0) {
  process.exit(1);
}
