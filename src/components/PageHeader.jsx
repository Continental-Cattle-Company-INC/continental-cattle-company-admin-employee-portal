import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PAGE_TITLES = {
  '/market': 'Market Inputs',
  '/roi-ladder': 'ROI Ladder',
  '/cutout': 'Cutout Engine',
  '/enterprise': 'Enterprise Model',
  '/playbook': 'Weekly Playbook',
  '/lots': 'Cattle Lots',
  '/sensitivity': 'Sensitivity Analysis',
  '/trucking': 'Trucking Economics',
  '/global': 'Global Intel',
  '/document': 'Master Document',
  '/approvals': 'Approvals',
  '/settings': 'Settings',
  '/purchase-calculator': 'Purchase Calculator',
  '/programs': 'Operational Programs',
  '/entity-financials': 'Entity Financials',
  '/feed-health': 'Feed & Health',
  '/trade-analytics': 'Trade Analytics',
  '/carcass-quality': 'Carcass Quality',
  '/sync-monitor': 'Sync Monitor',
  '/ai-control': 'AI Control Center',
  '/master-control': 'Master Control',
  '/validation': 'Validation Dashboard',
  '/system-health': 'System Health',
  '/ai-management': 'AI Management',
  '/ai-admin': 'AI Admin Control',
  '/bank-linking': 'Bank Linking',
  '/financial-intelligence': 'Financial Intelligence',
  '/field-rep': 'Field Rep Portal',
  '/corporate-structure': 'Corporate Structure',
  '/commodity-sourcing': 'Commodity Sourcing',
  '/feedlot-ops': 'Feedlot Ops',
  '/ai-feed-planner': 'AI Feed Planner',
  '/staff-portal': 'Staff Portal',
  '/maintenance': 'Maintenance',
  '/alerts': 'Alerts',
  '/ai-ops-advisor': 'AI Ops Advisor',
  '/lot-performance': 'Lot Performance',
  '/marketplace': 'Live Marketplace',
  '/load-board': 'Load Board',
  '/my-listings': 'My Listings',
  '/attorney-portal': 'Legal & Financial',
  '/platform-docs': 'Platform Docs',
  '/system-status': 'System Status',
};

export default function PageHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'Page';

  return (
    <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 md:hidden">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 hover:bg-secondary rounded-lg transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-bebas text-lg text-foreground tracking-wide">{title}</h1>
      </div>
    </div>
  );
}