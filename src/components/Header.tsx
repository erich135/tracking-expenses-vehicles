import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { User, LogOut, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import NotificationIcon from './NotificationIcon';

interface HeaderProps {
  user?: any;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: 'Success', description: 'Logged out successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">Vehicle Expense Tracker</h1>
          </div>
          
          {user && (
            <div className="flex items-center gap-4">
              <NotificationIcon />
              
              <Card className="p-2">
                <CardContent className="flex items-center gap-2 p-0">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">{user.email}</span>
                </CardContent>
              </Card>
              
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;