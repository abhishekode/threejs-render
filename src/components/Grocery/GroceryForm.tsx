
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGrocery } from '@/context/GroceryContext';
import { GroceryFormData } from '@/types';
import { UNITS } from '@/constants';
import { toast } from 'sonner';

const GroceryForm: React.FC = () => {
  const { addItem } = useGrocery();
  
  const { control, handleSubmit, reset, setError, formState: { errors } } = useForm<GroceryFormData>({
    defaultValues: {
      name: '',
      quantity: undefined,
      unit: 'kg',
    },
  });

  const onSubmit = (data: GroceryFormData) => {
    if (!data.name.trim()) {
      setError('name', { message: 'Please enter an item name' });
      return;
    }
    
    addItem({
      name: data.name.trim(),
      quantity: data.quantity,
      unit: data.unit,
    });
    toast.success("Item added!");
    
    reset({ name: '', quantity: undefined, unit: 'kg' });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
        <div className="sm:col-span-5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Item Name
          </label>
          <Controller
            name="name"
            control={control}
            rules={{ required: 'Item name is required' }}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="e.g., Apples"
                className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
              />
            )}
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Qty
          </label>
          <Controller
            name="quantity"
            control={control}
            rules={{ 
              required: 'Quantity is required',
              min: { value: 1, message: 'Must be at least 1' }
            }}
            render={({ field }) => (
               <Input
                type="number"
                min="1"
                value={field.value ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  field.onChange(val === '' ? undefined : parseFloat(val));
                }}
                placeholder="Enter quantity"
                className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
              />
            )}
          />
          {errors.quantity && (
            <p className="text-sm text-red-600 mt-1">{errors.quantity.message}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Unit
          </label>
          <Controller
            name="unit"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="sm:col-span-3">
          <Button 
            onClick={handleSubmit(onSubmit)}
            type="button"
            className="w-full h-10 bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GroceryForm;