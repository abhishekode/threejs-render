
import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGrocery } from '@/context/GroceryContext';

const GroceryList: React.FC = () => {
  const { items, removeItem } = useGrocery();

  if (items.length === 0) {
    return (
      <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400">
          No items yet. Add your first grocery item!
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
        Your Grocery List ({items.length} items)
      </h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
          >
            <div className="flex-1">
              <span className="font-medium text-slate-800 dark:text-white">
                {item.name}
              </span>
              <span className="ml-3 text-sm text-slate-600 dark:text-slate-300">
                {item.quantity} {item.unit}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeItem(item.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GroceryList;