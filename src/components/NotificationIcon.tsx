import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  message: string;
  data: {
    regNumber: string;
    fleetNumber: string;
    make: string;
    model: string;
    latestKmPerLiter: number;
    previousKmPerLiter: number;
    percentageDiff: number;
  };
  created_at: string;
}

const NotificationIcon: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast({ title: 'Notification deleted' });
    } catch (error) {
      toast({ title: 'Error deleting notification', variant: 'destructive' });
    }
  };

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="relative"
        >
          <Bell className={`h-5 w-5 ${notifications.length > 0 ? 'text-red-500 animate-pulse' : ''}`} />
          {notifications.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500">
              {notifications.length}
            </Badge>
          )}
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fuel Efficiency Alerts</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No notifications</p>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className="border rounded-lg p-4 mb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-600 mb-2">{notification.message}</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><strong>Reg Number:</strong> {notification.data.regNumber}</div>
                        <div><strong>Fleet Number:</strong> {notification.data.fleetNumber}</div>
                        <div><strong>Make:</strong> {notification.data.make}</div>
                        <div><strong>Model:</strong> {notification.data.model}</div>
                        <div><strong>Latest Km/L:</strong> {notification.data.latestKmPerLiter.toFixed(2)}</div>
                        <div><strong>Previous Km/L:</strong> {notification.data.previousKmPerLiter.toFixed(2)}</div>
                        <div className="col-span-2"><strong>Difference:</strong> <span className="text-red-600">{notification.data.percentageDiff.toFixed(1)}%</span></div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteNotification(notification.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NotificationIcon;