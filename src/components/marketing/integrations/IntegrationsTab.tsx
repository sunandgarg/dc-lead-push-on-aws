import { CustomIntegrationBuilder } from './CustomIntegrationBuilder';

export function IntegrationsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Integrations</h2>
        <p className="text-muted-foreground">Connect custom APIs and manage webhooks</p>
      </div>

      <CustomIntegrationBuilder />
    </div>
  );
}
