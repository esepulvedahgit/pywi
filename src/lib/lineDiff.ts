/**
 * Minimal LCS-based line diff.
 * Returns an array of diff rows for rendering a before/after comparison.
 */

export type DiffRowType = 'context' | 'added' | 'removed';

export interface DiffRow {
  type: DiffRowType;
  text: string;
}

/** Compute a standard LCS length table for two string arrays. */
function lcsTable(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

/** Backtrack the LCS table to produce diff rows. */
function backtrack(dp: number[][], a: string[], b: string[], i: number, j: number, rows: DiffRow[]): void {
  if (i === 0 && j === 0) return;
  if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
    backtrack(dp, a, b, i - 1, j - 1, rows);
    rows.push({ type: 'context', text: a[i - 1] });
  } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
    backtrack(dp, a, b, i, j - 1, rows);
    rows.push({ type: 'added', text: b[j - 1] });
  } else {
    backtrack(dp, a, b, i - 1, j, rows);
    rows.push({ type: 'removed', text: a[i - 1] });
  }
}

/**
 * Compute a line-level diff between `before` and `after`.
 * @param before  Original text (e.g. current selection or file)
 * @param after   Proposed replacement text
 * @param contextLines  Number of unchanged lines to show around changes (default 3)
 */
export function lineDiff(before: string, after: string, contextLines = 3): DiffRow[] {
  const a = before.split('\n');
  const b = after.split('\n');

  // Guard against very large inputs to keep UI responsive
  if (a.length > 500 || b.length > 500) {
    // Fall back to a simple "all removed / all added" view
    const rows: DiffRow[] = [];
    a.forEach(t => rows.push({ type: 'removed', text: t }));
    b.forEach(t => rows.push({ type: 'added', text: t }));
    return rows;
  }

  const dp = lcsTable(a, b);
  const rawRows: DiffRow[] = [];
  backtrack(dp, a, b, a.length, b.length, rawRows);

  if (contextLines <= 0) return rawRows;

  // Compress context: keep only `contextLines` unchanged lines around changes
  const hasChange = rawRows.some(r => r.type !== 'context');
  if (!hasChange) return rawRows; // identical content

  const compressed: DiffRow[] = [];
  for (let i = 0; i < rawRows.length; i++) {
    if (rawRows[i].type !== 'context') {
      compressed.push(rawRows[i]);
    } else {
      // Include context line if it's near a changed line
      const nearBefore = rawRows.slice(Math.max(0, i - contextLines), i).some(r => r.type !== 'context');
      const nearAfter = rawRows.slice(i + 1, i + 1 + contextLines).some(r => r.type !== 'context');
      if (nearBefore || nearAfter) {
        compressed.push(rawRows[i]);
      } else if (compressed.length > 0 && compressed[compressed.length - 1].type !== 'context') {
        // Separator between hunks
        compressed.push({ type: 'context', text: '…' });
      }
    }
  }

  return compressed;
}
