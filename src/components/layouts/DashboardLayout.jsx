import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home as HomeIcon, BarChart2, Settings, Car, Wrench, FileText, LogOut, Database, Building } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const navItems = [
    { name: 'Home', icon: HomeIcon, path: '/', exact: true },
    { name: 'Costing', icon: FileText, sublinks: [{ name: 'Add New', path: '/costing/add' }, { name: 'View Entries', path: '/costing/view' }], permission: 'costing' },
    { name: 'Vehicle Expenses', icon: Car, sublinks: [{ name: 'Add Expense', path: '/vehicle-expenses/add' }, { name: 'View Expenses', path: '/vehicle-expenses/view' }, { name: 'Manage Vehicles', path: '/vehicles/manage' }], permission: 'vehicle_expenses' },
    { name: 'Workshop', icon: Wrench, sublinks: [{ name: 'Add New Job', path: '/workshop-jobs/add' }, { name: 'View Jobs', path: '/workshop-jobs/view' }], permission: 'workshop_jobs' },
    { name: 'Rental', icon: Building, sublinks: [
        { name: 'View Machines', path: '/rental/view' },
        { name: 'Add Income', path: '/rental/income/add' },
        { name: 'Add Expense', path: '/rental/expense/add' },
    ], permission: 'rental' },
    
{
  name: 'SLA',
  icon: Building,
  sublinks: [
    { name: 'View SLA Equipment', path: '/sla/equipment' },
    { name: 'Add SLA Expense', path: '/sla/add-expense' },
    { name: 'Add SLA Income', path: '/sla/add-income' },
    
  ],
  permission: 'sla'
},

    { name: 'Reports', icon: BarChart2, path: '/reports', permission: 'reports' },
    { name: 'Maintenance', icon: Database, sublinks: [
        { name: 'Customers', path: '/maintenance/customers' },
        { name: 'Suppliers', path: '/maintenance/suppliers' },
        { name: 'Technicians', path: '/maintenance/technicians' },
        { name: 'Parts', path: '/maintenance/parts' },
    ], permission: 'maintenance' },
    { name: 'Settings', icon: Settings, path: '/settings', adminOnly: true },
];

const Sidebar = () => {
    const { signOut, userProfile } = useAuth();
    const location = useLocation();

    const hasPermission = (item) => {
        if (item.adminOnly) {
            return userProfile?.is_admin;
        }
        if (!item.permission) { // For items like Home
            return true;
        }
        if (userProfile?.is_admin) return true;
        return (userProfile?.permissions || []).includes(item.permission);
    };
    
    const visibleNavItems = navItems.filter(hasPermission);

    return (
        <div className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
            <div className="p-4 flex justify-center items-center border-b border-gray-700">
                <img src="https://horizons-cdn.hostinger.com/bda8c80c-e734-409b-a672-4fa843b3b414/be1ac99c0184750332a8355755d81cd9.png" alt="Company Logo" className="h-16" />
            </div>
            <nav className="flex-1 p-2">
                <ul>
                    {visibleNavItems.map((item) => (
                        <li key={item.name} className="mb-2">
                            {item.sublinks ? (
                                <AccordionItem item={item} location={location} />
                            ) : (
                                <Link to={item.path} className={`flex items-center p-2 rounded-md hover:bg-gray-700 ${location.pathname === item.path ? 'bg-gray-700' : ''}`}>
                                    <item.icon className="mr-3" />
                                    {item.name}
                                </Link>
                            )}
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="p-2 border-t border-gray-700">
                <button onClick={signOut} className="w-full flex items-center p-2 rounded-md text-red-400 hover:bg-red-500 hover:text-white">
                    <LogOut className="mr-3" />
                    Logout
                </button>
            </div>
        </div>
    );
};

const AccordionItem = ({ item, location }) => {
    const isActiveParent = item.sublinks.some(sublink => location.pathname.startsWith(sublink.path.split('/').slice(0,2).join('/')));
    const [isOpen, setIsOpen] = React.useState(isActiveParent);

    React.useEffect(() => {
        if (isActiveParent) {
            setIsOpen(true);
        }
    }, [location.pathname, isActiveParent]);

    return (
        <div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex justify-between items-center p-2 rounded-md hover:bg-gray-700 ${isActiveParent ? 'bg-gray-800' : ''}`}
            >
                <div className="flex items-center">
                    <item.icon className="mr-3" />
                    {item.name}
                </div>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </motion.div>
            </button>
            <motion.div
                initial={false}
                animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                className="overflow-hidden"
            >
                <ul className="pl-8 pt-2">
                    {item.sublinks.map((sublink) => (
                        <li key={sublink.name} className="mb-2">
                            <Link to={sublink.path} className={`block p-2 rounded-md hover:bg-gray-700 ${location.pathname === sublink.path ? 'bg-gray-600' : ''}`}>
                                {sublink.name}
                            </Link>
                        </li>
                    ))}
                </ul>
            </motion.div>
        </div>
    );
};

const DashboardLayout = () => {
    return (
        <div className="flex bg-gray-100 dark:bg-slate-950/95">
            <Sidebar />
            <main className="flex-1 p-8 overflow-auto h-screen">
                <Outlet />
            </main>
        </div>
    );
};

export default DashboardLayout;