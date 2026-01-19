import { useState } from "react";
import { Layout } from "@/components/layout";
import { PageHeader, Button, Input, Select, Card } from "@/components/ui-components";
import { useStock, useStockTransaction } from "@/hooks/use-stock";
import { useItems } from "@/hooks/use-items";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Minus, Archive } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function StockManagement() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(today);
  const [isTxnOpen, setIsTxnOpen] = useState(false);

  const { data: stock = [], isLoading } = useStock(date);
  
  return (
    <Layout>
      <PageHeader 
        title="Inventory Status" 
        description={`Stock overview for ${date}`}
        action={
          <div className="flex gap-2">
            <Input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="w-auto"
            />
            <Button onClick={() => setIsTxnOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Transaction
            </Button>
          </div>
        }
      />

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/30">
              <tr className="text-left">
                <th className="p-4 text-sm font-bold text-muted-foreground uppercase tracking-wider">Item Name</th>
                <th className="p-4 text-sm font-bold text-muted-foreground text-center">Opening</th>
                <th className="p-4 text-sm font-bold text-muted-foreground text-center text-green-600">Purchased</th>
                <th className="p-4 text-sm font-bold text-muted-foreground text-center text-blue-600">Sold</th>
                <th className="p-4 text-sm font-bold text-muted-foreground text-center text-red-500">Wastage</th>
                <th className="p-4 text-sm font-bold text-muted-foreground text-center bg-primary/5">Closing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stock.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium text-foreground">{s.item?.name}</td>
                  <td className="p-4 text-center text-muted-foreground">{s.openingStock}</td>
                  <td className="p-4 text-center font-medium text-green-600">
                    {Number(s.purchased || 0) > 0 ? `+${Number(s.purchased || 0)}` : '-'}
                  </td>
                  <td className="p-4 text-center font-medium text-blue-600">
                    {Number(s.sold || 0) > 0 ? `-${Number(s.sold || 0)}` : '-'}
                  </td>
                  <td className="p-4 text-center font-medium text-red-500">
                    {Number(s.wastage || 0) > 0 ? `-${Number(s.wastage || 0)}` : '-'}
                  </td>
                  <td className="p-4 text-center font-bold text-foreground bg-primary/5">
                    {s.closingStock}
                  </td>
                </tr>
              ))}
              {stock.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No stock data for this date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <TransactionDialog open={isTxnOpen} onOpenChange={setIsTxnOpen} />
    </Layout>
  );
}

function TransactionDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const { data: items = [] } = useItems();
  const transaction = useStockTransaction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
      await transaction.mutateAsync({
        itemId: Number(formData.get("itemId")),
        type: formData.get("type") as any,
        quantity: Number(formData.get("quantity")),
        date: new Date().toISOString()
      });
      
      toast({ title: "Transaction Saved" });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Stock Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Transaction Type</label>
            <Select name="type" required>
              <option value="purchase">Purchase (Stock In)</option>
              <option value="wastage">Wastage (Stock Out)</option>
              <option value="opening">Correction / Opening Stock</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Item</label>
            <Select name="itemId" required>
              <option value="">Select Item...</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
            <Input name="quantity" type="number" min="1" required />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" isLoading={transaction.isPending}>
              Save Transaction
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
