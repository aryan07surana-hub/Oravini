import ClientLayout from "@/components/layout/ClientLayout";
import { CRMSuiteInner } from "@/pages/admin/AdminCRMSuite";

/**
 * Tier 5 (Elite) clients see the same CRM workspace as admins,
 * but data is automatically scoped to records they own. Admin-only
 * actions like "Pull platform leads", "Sync Tier 5", "Find duplicates",
 * and the API Keys panel are hidden when isAdmin=false.
 */
export default function ClientCRM() {
  return (
    <ClientLayout>
      <CRMSuiteInner isAdmin={false} />
    </ClientLayout>
  );
}
