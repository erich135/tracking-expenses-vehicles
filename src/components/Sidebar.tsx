import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Car, 
  Plus, 
  FileText, 
  BarChart3, 
  Settings,
  X,
  Eye,
  Shield,
  Upload
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAdmin?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeTab, onTabChange, isAdmin }) => {
  const menuItems = [
    { id: 'add-expense', label: 'Add Expense', icon: Plus },
    { id: 'view-expenses', label: 'View Expenses', icon: Eye },
    { id: 'vehicles', label: 'Manage Vehicles', icon: Car },
    { id: 'upload', label: 'Data Upload', icon: Upload },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (isAdmin) {
    menuItems.push({ id: 'admin', label: 'Admin Panel', icon: Shield });
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 h-full w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out z-50",
        "lg:translate-x-0 lg:static lg:z-auto",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold">Menu</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="lg:hidden text-white hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start text-left",
                  activeTab === item.id 
                    ? "bg-slate-800 text-white" 
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
                onClick={() => {
                  onTabChange(item.id);
                  onClose();
                }}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;