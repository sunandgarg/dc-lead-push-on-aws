import { useState } from "react";
import { Save, RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert } from "../Alert";
import { UserManagement } from "../admin/UserManagement";
import { IntegrationsSettings } from "./IntegrationsSettings";
import { CRMSettings } from "./CRMSettings";
import { ApiWhitelistSection } from "./ApiWhitelistSection";
import { FeatureToggles } from "../admin/FeatureToggles";
import { AdminDataPurge } from "./AdminDataPurge";
import { DbImportExport } from "./DbImportExport";
import { AdminRateLimitControl } from "./AdminRateLimitControl";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface SettingsTabProps {
  defaultLeadsPerMinute: number;
  onSaveSettings: (settings: { defaultLeadsPerMinute: number }) => void;
  onClearAllData: () => void;
}

export function SettingsTab({ defaultLeadsPerMinute, onSaveSettings, onClearAllData }: SettingsTabProps) {
  const [leadsPerMinute, setLeadsPerMinute] = useState(defaultLeadsPerMinute);
  const [alert, setAlert] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const { isAdmin } = useAdminAuth();

  const handleSave = () => {
    onSaveSettings({ defaultLeadsPerMinute: leadsPerMinute });
    setAlert({ type: "success", message: "Settings saved successfully!" });
  };

  const handleClearData = () => {
    if (showConfirmClear) {
      onClearAllData();
      setShowConfirmClear(false);
      setAlert({ type: "success", message: "All data cleared successfully." });
    } else {
      setShowConfirmClear(true);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {alert && (
        <div className="mb-6">
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        </div>
      )}

      <div className="mb-8">
        <h2 className="font-display text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground">Configure global application settings</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="api-whitelist">API Whitelist</TabsTrigger>
          {isAdmin && <TabsTrigger value="feature-toggles">Feature Toggles</TabsTrigger>}
          {isAdmin && <TabsTrigger value="integrations">Integrations</TabsTrigger>}
          {isAdmin && <TabsTrigger value="crm">CRM Settings</TabsTrigger>}
          {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Rate Limiting Settings */}
            <div className="card-elevated p-6">
              <h3 className="font-medium text-foreground mb-4">Rate Limiting</h3>
              <p className="text-sm text-muted-foreground mb-6">Control how many leads are processed per minute.</p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-muted-foreground mb-2">Default Leads Per Minute</label>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={leadsPerMinute}
                  onChange={(e) => setLeadsPerMinute(Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-muted-foreground">1</span>
                  <span className="text-lg font-display font-bold text-primary">{leadsPerMinute}</span>
                  <span className="text-xs text-muted-foreground">60</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-accent/50 mb-6">
                <p className="text-sm text-foreground">
                  <strong>Interval:</strong> {Math.round(60 / leadsPerMinute)} seconds per lead
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  At this rate, 100 leads will take ~{Math.round(100 / leadsPerMinute)} minutes
                </p>
              </div>

              <button onClick={handleSave} className="btn-primary flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Settings
              </button>
            </div>

            {/* Data Management */}
            <div className="card-elevated p-6">
              <h3 className="font-medium text-foreground mb-4">Data Management</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Manage your stored data including universities, logs, and settings.
              </p>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <RotateCcw className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Local Storage</p>
                      <p className="text-xs text-muted-foreground">All data is stored in your browser</p>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-destructive mb-1">Danger Zone</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Clear all universities, logs, and settings.
                        </p>
                        {showConfirmClear ? (
                          <div className="flex gap-2">
                            <button
                              onClick={handleClearData}
                              className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-medium text-sm"
                            >
                              Yes, Clear Everything
                            </button>
                            <button
                              onClick={() => setShowConfirmClear(false)}
                              className="px-4 py-2 rounded-lg border border-border text-foreground font-medium text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={handleClearData}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                            Clear All Data
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* About */}
            <div className="card-elevated p-6 lg:col-span-2">
              <h3 className="font-medium text-foreground mb-4">About</h3>
              <div className="prose prose-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">DekhoCampus Lead Upload Manager</strong> - Educational CRM
                </p>
                <ul className="mt-4 space-y-2">
                  <li>✓ Manage unlimited university API configurations</li>
                  <li>✓ Upload leads via CSV with flexible column mapping</li>
                  <li>✓ Rate-limited processing to prevent API blocks</li>
                  <li>✓ Real-time status tracking and detailed logs</li>
                  <li>✓ Complete CRM with pipeline management</li>
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="api-whitelist">
          <ApiWhitelistSection />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="feature-toggles">
            <div className="card-elevated p-6">
              <FeatureToggles />
            </div>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="integrations">
            <IntegrationsSettings />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="crm">
            <CRMSettings isAdmin={isAdmin} />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="admin">
            <div className="space-y-6">
              <ApiWhitelistSection />
              <AdminRateLimitControl />
              <div className="card-elevated p-6">
                <UserManagement />
              </div>
              <AdminDataPurge />
              <DbImportExport />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
