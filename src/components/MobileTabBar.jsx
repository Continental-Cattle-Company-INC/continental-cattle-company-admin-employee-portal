import { Link } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Beef, Settings } from 'lucide-react';

const MOBILE_TABS = [
  { label: 'Home', icon: LayoutDashboard, path: '/' },
  { label: 'Market', icon: TrendingUp, path: '/market' },
  { label: 'Lots', icon: Beef, path: '/lots' },
  { label: 'Menu', icon: Settings, path: '/settings' },
];

export default function MobileTabBar({ location }) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex items-center justify-around safe-area-bottom z-50">
      {MOBILE_TABS.map(tab => {
        const isActive = location.pathname === tab.path;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors ${
              isActive
                ? 'text-primary border-t-2 border-primary bg-primary/5'
                : 'text-muted-foreground'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 text-center">{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}