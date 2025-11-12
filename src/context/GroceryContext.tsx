import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { GroceryItem, GroceryContextType } from "@/types";

const GroceryContext = createContext<GroceryContextType | undefined>(undefined);

export const GroceryProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [title, setTitle] = useState<string>("मेरी ग्रोसरी लिस्ट");

  // 🧠 Load from sessionStorage
  useEffect(() => {
    try {
      const savedData = sessionStorage.getItem("groceryData");
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed.items)) setItems(parsed.items);
        if (typeof parsed.title === "string") setTitle(parsed.title);
      }
    } catch (error) {
      console.error("Error loading grocery data:", error);
    }
  }, []);

  // 💾 Save to sessionStorage
  useEffect(() => {
    const dataToSave = { items, title };
    sessionStorage.setItem("groceryData", JSON.stringify(dataToSave));
  }, [items, title]);

  // ➕ Add Item
  const addItem = useCallback((item: Omit<GroceryItem, "id">) => {
    const newItem: GroceryItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      ...item,
    };
    setItems((prev) => [...prev, newItem]);
  }, []);

  // ❌ Remove Item
  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // 🧹 Clear all
  const clearItems = useCallback(() => {
    setItems([]);
  }, []);

  // 🏷️ Update Title
  const updateTitle = useCallback((newTitle: string) => {
    setTitle(newTitle);
  }, []);

  return (
    <GroceryContext.Provider
      value={{ title, items, addItem, removeItem, clearItems, updateTitle }}
    >
      {children}
    </GroceryContext.Provider>
  );
};

// 🔌 Hook for using the context
export const useGrocery = () => {
  const context = useContext(GroceryContext);
  if (!context) {
    throw new Error("useGrocery must be used within a GroceryProvider");
  }
  return context;
};
