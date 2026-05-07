import { policies, supportedFrameworks } from '../data/policies.js';

export interface FrameworkCoverage {
  frameworkId: string;
  frameworkName: string;
  controlsTracked: number;
  controlsCovered: number;
  coveragePct: number;
  policiesContributing: string[];
  uncoveredControls: string[];
}

export interface ComplianceCoverageReport {
  totalPolicies: number;
  enabledPolicies: number;
  frameworks: FrameworkCoverage[];
  generatedAt: string;
}

// Mock the "expected control surface" per framework so the dashboard has real numbers
const expectedControls: Record<string, string[]> = {
  soc2: [
    'soc2:cc1.4', 'soc2:cc4.1', 'soc2:cc6.1', 'soc2:cc6.2', 'soc2:cc6.3', 'soc2:cc6.6',
    'soc2:cc6.7', 'soc2:cc7.2', 'soc2:cc7.4', 'soc2:cc8.1',
    'soc2:cc1.1', 'soc2:cc2.1', 'soc2:cc3.1', 'soc2:cc5.1',
  ],
  iso27001: [
    'iso27001:a.5.1.1', 'iso27001:a.8.2.3', 'iso27001:a.9.2.1', 'iso27001:a.9.2.5',
    'iso27001:a.9.4.1', 'iso27001:a.9.4.3', 'iso27001:a.12.1.2', 'iso27001:a.12.4.1',
    'iso27001:a.5.10', 'iso27001:a.5.12', 'iso27001:a.5.34', 'iso27001:a.6.3',
    'iso27001:a.7.5', 'iso27001:a.8.1', 'iso27001:a.8.5', 'iso27001:a.8.7',
    'iso27001:a.8.10', 'iso27001:a.8.13', 'iso27001:a.8.15', 'iso27001:a.8.16',
    'iso27001:a.8.20', 'iso27001:a.8.24',
  ],
  'eu-ai-act': [
    'eu-ai-act:art12', 'eu-ai-act:art13', 'eu-ai-act:art14', 'eu-ai-act:art16',
    'eu-ai-act:art52', 'eu-ai-act:annex3', 'eu-ai-act:art10', 'eu-ai-act:art15',
  ],
  'pci-dss-4.0': [
    'pci-dss:3.2', 'pci-dss:3.4', 'pci-dss:3.5', 'pci-dss:7.1',
    'pci-dss:8.2.1', 'pci-dss:9.7', 'pci-dss:10.5', 'pci-dss:10.7',
    'pci-dss:1.1', 'pci-dss:2.2', 'pci-dss:6.4', 'pci-dss:11.5',
  ],
  gdpr: [
    'gdpr:art30', 'gdpr:art32', 'gdpr:art44',
    'gdpr:art5', 'gdpr:art25', 'gdpr:art33',
  ],
  hipaa: [
    'hipaa:164.312(a)', 'hipaa:164.312(a)(2)(iv)',
    'hipaa:164.308(a)(1)', 'hipaa:164.310(a)(1)',
  ],
  'nist800-53': [
    'nist800-53:ac-2', 'nist800-53:ac-3',
    'nist800-53:au-2', 'nist800-53:au-9', 'nist800-53:cm-2', 'nist800-53:cp-2',
    'nist800-53:ia-2', 'nist800-53:sc-7', 'nist800-53:si-3', 'nist800-53:si-4',
  ],
  'nist-ai-rmf': [
    'nist-ai-rmf:govern-1', 'nist-ai-rmf:map-2',
    'nist-ai-rmf:measure-2', 'nist-ai-rmf:manage-1',
  ],
};

export function buildComplianceCoverage(): ComplianceCoverageReport {
  const enabledPolicies = policies.filter((p) => p.enabled);
  const allTags = new Set<string>();
  const tagToPolicies = new Map<string, string[]>();

  for (const p of enabledPolicies) {
    for (const tag of p.complianceTags) {
      allTags.add(tag);
      const list = tagToPolicies.get(tag) ?? [];
      list.push(p.id);
      tagToPolicies.set(tag, list);
    }
  }

  const frameworks: FrameworkCoverage[] = supportedFrameworks.map((fw) => {
    const expected = expectedControls[fw.id] ?? [];
    const covered = expected.filter((c) => allTags.has(c));
    const uncovered = expected.filter((c) => !allTags.has(c));
    const contributing = Array.from(
      new Set(covered.flatMap((c) => tagToPolicies.get(c) ?? []))
    );
    return {
      frameworkId: fw.id,
      frameworkName: fw.name,
      controlsTracked: expected.length,
      controlsCovered: covered.length,
      coveragePct: expected.length === 0 ? 0 : Math.round((covered.length / expected.length) * 100),
      policiesContributing: contributing,
      uncoveredControls: uncovered,
    };
  });

  return {
    totalPolicies: policies.length,
    enabledPolicies: enabledPolicies.length,
    frameworks,
    generatedAt: new Date().toISOString(),
  };
}
