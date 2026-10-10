import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Creates temporary test fixture files safely inside ScannerApp's own cache.
 * Useful for automated or manual verification of the Auto Scanner & Cleanup flow.
 */
export async function createCacheTestFixtures(): Promise<{ createdCount: number; dirUri: string }> {
  if (Platform.OS !== 'android') {
    return { createdCount: 0, dirUri: '' };
  }

  const cacheDir = Paths.cache;
  const fixtureDir = new Directory(cacheDir, 'test-scanner-fixtures');

  if (!fixtureDir.exists) {
    fixtureDir.create();
  }

  // Create test files
  const file1 = new File(fixtureDir, 'cache_sample_1.tmp');
  if (!file1.exists) {
    file1.create();
    file1.write('ScannerApp temporary cache test artifact 1.\n'.repeat(40));
  }

  const file2 = new File(fixtureDir, 'network_cache_2.log');
  if (!file2.exists) {
    file2.create();
    file2.write('ScannerApp network cache log data artifact 2.\n'.repeat(60));
  }

  const nestedDir = new Directory(fixtureDir, 'nested_thumbs');
  if (!nestedDir.exists) {
    nestedDir.create();
  }

  const file3 = new File(nestedDir, 'thumb_3.bin');
  if (!file3.exists) {
    file3.create();
    file3.write('Binary thumbnail mock stream test artifact 3.\n'.repeat(100));
  }

  return {
    createdCount: 3,
    dirUri: fixtureDir.uri,
  };
}
