(async () => {
  const ui = window.evidenceUi;
  try {
    const [summary, library, decisionList, coverage] = await Promise.all([
      ui.fetchJson('/api/dashboard/summary'), ui.fetchJson('/api/policies'),
      ui.fetchJson('/api/decisions'), ui.fetchJson('/api/compliance/coverage'),
    ]);
    ui.metric('Authored policies', library.count, `${summary.library.enabledPolicies} enabled in fixture`);
    ui.metric('Fixture packs', summary.library.activePacks, 'Names are examples, not certifications');
    ui.metric('Seeded decisions', decisionList.count, 'No new evaluations are persisted');
    ui.metric('Framework tag sets', coverage.frameworks.length, 'Illustrative mapping, not control coverage');
    ui.table(['Policy', 'Action', 'Severity', 'Owner'], library.policies.slice(0, 10).map((policy) => [
      `${policy.id} · ${policy.name}`, policy.action, policy.severity, policy.ownerTeam,
    ]));
    decisionList.decisions.forEach((decision) => ui.item(
      `${decision.outcome.toUpperCase()} · ${decision.decisionId}`,
      `${decision.agentId} · ${decision.contextType} · ${decision.policiesFired.join(', ') || 'no policy fired'}`,
    ));
    ui.state('LOCAL FIXTURE API · 4 endpoints responded');
  } catch (error) {
    ui.state(`API unavailable: ${error.message}`, true);
  }
})();
