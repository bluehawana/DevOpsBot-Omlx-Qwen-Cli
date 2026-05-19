import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { findCodeFiles, readFiles, fileToRelative, parseJSON, getDiffs, getStagedFiles, getUnstagedFiles } = await import('./reviewer.js');
const { isGitAvailable, execGit } = await import('./github.js');

describe('reviewer.js', () => {
  describe('findCodeFiles', () => {
    it('finds .js files in src', () => {
      const files = findCodeFiles(join(__dirname));
      assert.ok(files.length > 0, 'should find at least one file');
      const hasJs = files.some(f => f.endsWith('.js'));
      assert.ok(hasJs, 'should find .js files');
    });

    it('excludes node_modules', () => {
      const files = findCodeFiles('.');
      assert.ok(!files.some(f => f.includes('node_modules')), 'should exclude node_modules');
    });

    it('only includes code file extensions', () => {
      const { extname } = require('path');
      const files = findCodeFiles('.');
      const nonCodeExts = files.filter(f => {
        const ext = extname(f).toLowerCase();
        const codeExts = ['.js', '.ts', '.jsx', '.tsx', '.py', '.yaml', '.yml', '.json', '.toml', '.md', '.sh'];
        return !codeExts.includes(ext) && ext !== '' && f !== '.' && f !== '..';
      });
      assert.ok(nonCodeExts.length === 0, `found non-code extensions: ${nonCodeExts.slice(0, 5).join(', ')}`);
    });
  });

  describe('readFiles', () => {
    it('reads files and returns content', () => {
      const files = findCodeFiles('.');
      const firstFive = files.slice(0, 5);
      const contents = readFiles(firstFive);
      assert.equal(Object.keys(contents).length, firstFive.length);
    });
  });

  describe('fileToRelative', () => {
    it('converts absolute to relative paths', () => {
      const files = findCodeFiles('.');
      const jsFile = files.find(f => f.endsWith('.js'));
      const abs = jsFile.startsWith('/') ? jsFile : join(process.cwd(), jsFile);
      const contents = { [abs]: 'content' };
      const rel = fileToRelative(contents);
      const keys = Object.keys(rel);
      assert.ok(keys.length > 0, 'should have at least one key');
      assert.ok(keys[0].endsWith('.js'), `relative path should end with .js: ${keys[0]}`);
    });
  });

  describe('parseJSON', () => {
    it('parses clean JSON', () => {
      const result = parseJSON('{"key": "value", "num": 42}');
      assert.deepStrictEqual(result, { key: 'value', num: 42 });
    });

    it('extracts JSON from markdown', () => {
      const result = parseJSON('```json\n{"hello": true}\n```');
      assert.strictEqual(result.hello, true);
    });

    it('extracts JSON with surrounding text', () => {
      const result = parseJSON('Here is the result:\n{"title": "test"}\n\nDone!');
      assert.strictEqual(result.title, 'test');
    });

    it('returns error object on bad JSON', () => {
      const result = parseJSON('{"broken": }');
      assert.ok('error' in result, 'should have error property');
    });
  });

  describe('isGitAvailable', () => {
    it('detects git', () => {
      assert.ok(isGitAvailable(), 'git should be available');
    });
  });

  describe('getDiffs', () => {
    it('returns results', () => {
      const result = getDiffs();
      assert.ok('files' in result, 'should have files key');
      assert.ok('ok' in result, 'should have ok key');
    });
  });

  describe('getStagedFiles', () => {
    it('returns an array', () => {
      const files = getStagedFiles();
      assert.ok(Array.isArray(files), 'should return an array');
    });
  });

  describe('getUnstagedFiles', () => {
    it('returns an array', () => {
      const files = getUnstagedFiles();
      assert.ok(Array.isArray(files), 'should return an array');
    });
  });

  describe('end-to-end review', () => {
    it('returns structured result', async () => {
      const files = readFiles(['src/cli.js']);
      const result = await import('./reviewer.js').then(m => m.reviewCode(files, 'qwen3.6'));
      // result is a Promise
      assert.ok(result, 'review result should exist');
    });
  });

  describe('A/B model comparison', () => {
    it('reviews same file with qwen3.6 and different results', async () => {
      const files = readFiles(['src/reviewer.js']);
      const { reviewCode } = await import('./reviewer.js');
      const [modelA, modelB] = await Promise.all([
        reviewCode(files, 'qwen3.6'),
        reviewCode(files, 'qwen3.6'),
      ]);
      assert.ok(modelA.title, 'model A should have title');
      assert.ok(modelB.title, 'model B should have title');
      assert.ok(modelA.score, 'model A should have score');
      assert.ok(modelB.score, 'model B should have score');
    });
  });
});
