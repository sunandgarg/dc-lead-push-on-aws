import { memo, useMemo, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LeadPushHub } from "./LeadPushHub";
import { appCache } from "@/hooks/useAppCache";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import UniversitiesView from "@/components/leadpush/UniversitiesView";
import UTMLinksView from "@/components/leadpush/UTMLinksView";
import UploadLeadsView from "@/components/leadpush/UploadLeadsView";
import UploadHistoryView from "@/components/leadpush/UploadHistoryView";
import ActiveTasksView from "@/components/leadpush/ActiveTasksView";
import MultiPushView from "@/components/leadpush/multipush/MultiPushView";
import PurgeUniversityCacheView from "@/components/leadpush/PurgeUniversityCacheView";
import LandingPagesView from "@/components/leadpush/LandingPagesView";
import LeadPushAdminDashboard from "@/components/leadpush/admin/LeadPushAdminDashboard";

interface LeadPushModuleProps {
  universities: any[];
  logs: any[];
  batches: any[];
  onUniversitiesChange: () => void;
  onAddUniversity: () => void;
  onEditUniversity: (uni: any) => void;
  onDeleteUniversity: (id: string) => void;
  onSelectUploadUniversity: (uni: any) => void;
  selectedUploadUniversity: any | null;
  onBulkImport?: (configs: any[]) => void;
}

export function LeadPushModule({
  universities,
  logs,
  batches,
  onUniversitiesChange,
  onAddUniversity,
  onEditUniversity,
  onDeleteUniversity,
  onSelectUploadUniversity,
  selectedUploadUniversity,
  onBulkImport,
}: LeadPushModuleProps) {
  const location = useLocation();
  const { isAdmin } = useAdminAuth();

  const { activeView } = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts[0] === "lead-push" && parts[1]) {
      return { activeView: parts[1] };
    }
    return { activeView: "hub" };
  }, [location.pathname]);

  useEffect(() => {
    if (activeView !== "hub") {
      appCache.setUniversitySubRoute(activeView);
    }
  }, [activeView]);

  const userAllowedLeadPushViews = useMemo(() => new Set(["hub", "upload", "active-tasks"]), []);
  if (!isAdmin && !userAllowedLeadPushViews.has(activeView)) {
    return <Navigate to="/lead-push/upload" replace />;
  }

  const hubStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalLeadsToday = (batches || [])
      .filter((batch) => new Date(batch.created_at) >= today)
      .reduce((sum, batch) => sum + (batch.total_leads || 0), 0);

    const totalSuccess = (batches || []).reduce((sum, batch) => sum + (batch.success_count || 0), 0);
    const totalFailed = (batches || []).reduce(
      (sum, batch) => sum + (batch.fail_count || 0) + (batch.duplicate_count || 0),
      0,
    );
    const processed = totalSuccess + totalFailed;

    const pendingLeads = (batches || [])
      .filter((batch) => ["processing", "pending", "paused"].includes(batch.status))
      .reduce(
        (sum, batch) =>
          sum +
          Math.max(
            (batch.total_leads || 0) - (batch.success_count || 0) - (batch.fail_count || 0) - (batch.duplicate_count || 0),
            0,
          ),
        0,
      );

    return {
      totalUniversities: universities.length,
      totalLeadsToday,
      successRate: processed > 0 ? Math.round((totalSuccess / processed) * 100) : 0,
      pendingLeads,
    };
  }, [universities, batches]);

  switch (activeView) {
    case "universities":
      return (
        <UniversitiesView
          universities={universities}
          onAdd={onAddUniversity}
          onEdit={onEditUniversity}
          onDelete={onDeleteUniversity}
          onRefresh={onUniversitiesChange}
          onBulkImport={onBulkImport}
        />
      );
    case "utm":
      return <UTMLinksView universities={universities} onRefresh={onUniversitiesChange} />;
    case "upload":
      return (
        <UploadLeadsView
          universities={universities}
          selectedUniversity={selectedUploadUniversity}
          onSelectUniversity={onSelectUploadUniversity}
        />
      );
    case "history":
      return <UploadHistoryView universities={universities} />;
    case "active-tasks":
      return <ActiveTasksView />;
    case "multi-push":
      return <MultiPushView universities={universities} />;
    case "landing-pages":
      return <LandingPagesView universities={universities} />;
    case "purge-cache":
      return <PurgeUniversityCacheView universities={universities} />;
    case "admin":
      return <LeadPushAdminDashboard />;
    case "hub":
    default:
      return <LeadPushHub stats={hubStats} />;
  }
}

export default memo(LeadPushModule);
