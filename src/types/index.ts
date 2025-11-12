
export interface GroceryItem {
    id: string;
    name: string;
    quantity: number;
    unit: string;
}

export interface GroceryFormData {
    name: string;
    quantity: number;
    unit: string;
}

export interface GroceryContextType {
  title: string;
  items: GroceryItem[];
  addItem: (item: Omit<GroceryItem, "id">) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;
  updateTitle: (newTitle: string) => void;
}