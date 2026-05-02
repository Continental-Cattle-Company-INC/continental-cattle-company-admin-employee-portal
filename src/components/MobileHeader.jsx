import { Link } from 'react-router-dom';

export default function MobileHeader() {
  return (
    <div className="md:hidden sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded overflow-hidden bg-[#D2782A] flex-shrink-0">
          <img
            src="https://media.base44.com/images/public/69f4e0f8f8f460e805a3eb84/d924dd25e_IMG_6891.png"
            alt="Logo"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <div className="font-bebas text-primary text-xs leading-tight">CONTINENTAL</div>
          <div className="text-muted-foreground text-[10px]">Cattle Co</div>
        </div>
      </Link>
    </div>
  );
}