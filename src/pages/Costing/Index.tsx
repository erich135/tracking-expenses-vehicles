import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function CostingLandingPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Costing Menu</h1>
      
      <Card>
        <CardContent className="space-y-4 pt-4">
          <Button className="w-full" onClick={() => navigate('/costing/add')}>
            ➕ Add Transactions
          </Button>

          <Button className="w-full" onClick={() => navigate('/costing/list')}>
            📋 View Transactions
          </Button>

          <Button className="w-full" onClick={() => navigate('/costing/reports')}>
            📊 Costing Reports
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
