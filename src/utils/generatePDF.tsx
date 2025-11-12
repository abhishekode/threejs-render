import { pdf } from "@react-pdf/renderer";
import { GroceryItem } from "@/types";
import GroceryListPDF from "@/components/Grocery/GroceryListPDF";

export const generateGroceryPDF = async (items: GroceryItem[], title: string ) => {
  const blob = await pdf(<GroceryListPDF items={items} title={title} />).toBlob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}-list.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};
