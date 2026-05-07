import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildComplianceCoverage } from '../src/engine/compliance-mapper';

test('compliance: report includes all supported frameworks', () => {
  const r = buildComplianceCoverage();
  const ids = r.frameworks.map((f) => f.frameworkId);
  assert.ok(ids.includes('soc2'));
  assert.ok(ids.includes('eu-ai-act'));
  assert.ok(ids.includes('iso27001'));
  assert.ok(ids.includes('pci-dss-4.0'));
});

test('compliance: SOC 2 coverage > 0', () => {
  const r = buildComplianceCoverage();
  const soc2 = r.frameworks.find((f) => f.frameworkId === 'soc2');
  assert.ok(soc2);
  assert.ok(soc2!.coveragePct > 0, 'SOC 2 should have at least some coverage');
});

test('compliance: every framework has uncovered controls listed', () => {
  const r = buildComplianceCoverage();
  for (const f of r.frameworks) {
    assert.equal(
      f.controlsCovered + f.uncoveredControls.length,
      f.controlsTracked,
      `Framework ${f.frameworkId} math mismatch`
    );
  }
});
