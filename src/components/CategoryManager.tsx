import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/contexts/AppContext';

const CategoryManager: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useAppContext();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast({ title: 'Error', description: 'Category name cannot be empty', variant: 'destructive' });
      return;
    }
    
    if (categories.includes(newCategoryName.trim())) {
      toast({ title: 'Error', description: 'Category already exists', variant: 'destructive' });
      return;
    }

    addCategory(newCategoryName.trim());
    toast({ title: 'Success', description: 'Category added successfully' });
    setNewCategoryName('');
    setIsAddDialogOpen(false);
  };

  const handleEditCategory = (oldName: string) => {
    if (!editCategoryName.trim()) {
      toast({ title: 'Error', description: 'Category name cannot be empty', variant: 'destructive' });
      return;
    }
    
    if (categories.includes(editCategoryName.trim()) && editCategoryName.trim() !== oldName) {
      toast({ title: 'Error', description: 'Category already exists', variant: 'destructive' });
      return;
    }

    updateCategory(oldName, editCategoryName.trim());
    toast({ title: 'Success', description: 'Category updated successfully' });
    setEditingCategory(null);
    setEditCategoryName('');
  };

  const handleDeleteCategory = (categoryName: string) => {
    deleteCategory(categoryName);
    toast({ title: 'Success', description: 'Category deleted successfully' });
  };

  const startEditing = (categoryName: string) => {
    setEditingCategory(categoryName);
    setEditCategoryName(categoryName);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Expense Categories</CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="categoryName">Category Name</Label>
                  <Input
                    id="categoryName"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Enter category name"
                  />
                </div>
                <Button onClick={handleAddCategory} className="w-full">
                  Add Category
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <div key={category} className="flex items-center gap-2">
              {editingCategory === category ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    className="h-8 w-32"
                  />
                  <Button size="sm" onClick={() => handleEditCategory(category)}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {category}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => startEditing(category)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 p-0 hover:bg-transparent text-red-500"
                    onClick={() => handleDeleteCategory(category)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          ))}
        </div>
        {categories.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No categories added yet. Click "Add Category" to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryManager;