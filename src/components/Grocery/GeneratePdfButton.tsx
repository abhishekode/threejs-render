
import React from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGrocery } from '@/context/GroceryContext';
import { toast } from 'sonner';
import { generateGroceryPDF } from '@/utils/generatePDF';

interface GeneratePdfButtonProps {
    mobile?: boolean;
}

const GeneratePdfButton: React.FC<GeneratePdfButtonProps> = ({ mobile = false }) => {
    const { items, title } = useGrocery();

    const handleGeneratePdf = async () => {
        const validItems = items.filter(item => item.name.trim() !== '' && item.quantity > 0);
        if (validItems.length > 0) {
            await generateGroceryPDF(validItems, title);
            toast.success("PDF generated successfully! 📄");
        } else {
            toast.error("Please add at least one valid item to generate a PDF.");
        }
    };

    if (mobile) {
        return (
            <div className="sticky bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 sm:hidden">
                <Button
                    onClick={handleGeneratePdf}
                    disabled={items.length === 0}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                    <FileDown className="w-4 h-4 mr-2" />
                    Generate PDF
                </Button>
            </div>
        );
    }

    return (
        <div className="hidden sm:block fixed bottom-8 right-8">
            <Button
                onClick={handleGeneratePdf}
                disabled={items.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-lg hover:scale-105 transition-transform"
                size="lg"
            >
                <FileDown className="w-5 h-5 mr-2" />
                Generate PDF
            </Button>
        </div>
    );
};

export default GeneratePdfButton;
