import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/components/ui/use-toast';
import { EXPENSE_CATEGORIES, ExpenseCategory } from '@/types';

interface AppContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  categories: ExpenseCategory[];
  addCategory: (category: string) => void;
  updateCategory: (oldName: string, newName: string) => void;
  deleteCategory: (category: string) => void;
}

const defaultAppContext: AppContextType = {
  sidebarOpen: false,
  toggleSidebar: () => {},
  categories: EXPENSE_CATEGORIES,
  addCategory: () => {},
  updateCategory: () => {},
  deleteCategory: () => {},
};

const AppContext = createContext<AppContextType>(defaultAppContext);

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>(EXPENSE_CATEGORIES);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const addCategory = (category: string) => {
    if (!categories.includes(category as ExpenseCategory)) {
      setCategories(prev => [...prev, category as ExpenseCategory]);
    }
  };

  const updateCategory = (oldName: string, newName: string) => {
    setCategories(prev => prev.map(cat => cat === oldName ? newName as ExpenseCategory : cat));
  };

  const deleteCategory = (category: string) => {
    setCategories(prev => prev.filter(cat => cat !== category));
  };

  return (
    <AppContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};