import { useState } from "react";
import { Layout } from "@/components/layout";
import { PageHeader, Button, Input, Select, Card } from "@/components/ui-components";
import { useStock, useStockTransaction } from "@/hooks/use-stock";
import { useItems, useCreateItem, useUpdateItem, useDeleteItem } from "@/hooks/use-items";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Minus, Archive } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function StockManagement() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(today);
  const [isTxnOpen, setIsTxnOpen] = useState(false);
  // added here
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);

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
              <Plus className="w-4 h-4 mr-2" /> Top Up Stock
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsAddItemOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Inventory
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsManageOpen(true)}>
                Manage
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
      {isAddItemOpen && (
          <AddInventoryItemDialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen} />
        )}
        {isManageOpen && (
          <ManageInventoryDialog open={isManageOpen} onOpenChange={setIsManageOpen} />
        )}
    </Layout>
  );
}

function ManageInventoryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: items = [] } = useItems();
  const ingredients = items.filter(i => i.isIngredient);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Manage Inventory Items</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {ingredients.map(item => (
            <InventoryItemRow key={item.id} item={item} />
          ))}
          {ingredients.length === 0 && (
            <p className="text-sm text-muted-foreground">No inventory items yet.</p>
          )}
        </div>
        <div className="pt-3 flex justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InventoryItemRow({ item }: { item: any }) {
  const { toast } = useToast();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: item.name,
    category: item.category,
    unit: item.unit || "pcs",
    costPrice: Number(item.costPrice),
    sellingPrice: Number(item.sellingPrice || 0),
    minStock: Number(item.minStock || 0),
    isActive: Boolean(item.isActive),
  });
  const save = async () => {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        name: form.name,
        category: form.category,
        costPrice: form.costPrice,
        sellingPrice: form.sellingPrice,
        minStock: form.minStock,
        isActive: form.isActive,
        unit: form.unit,
        isIngredient: true,
      } as any);
      toast({ title: "Inventory Updated" });
      setEditing(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };
  const remove = async () => {
    if (!confirm(`Delete ${item.name}?`)) return;
    try {
      await deleteItem.mutateAsync(item.id);
      toast({ title: "Inventory Deleted" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };
  return (
    <div className="p-3 border border-border rounded-xl">
      {!editing ? (
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{item.name}</div>
            <div className="text-xs text-muted-foreground">
              {item.category} • {item.unit || "pcs"} • Min {item.minStock || 0}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
            <Button variant="outline" onClick={remove}>Delete</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-3">
            <label className="block text-xs mb-1">Name</label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs mb-1">Category</label>
            <Select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {["Supplies","Ingredients","Drinks","Snacks","Main"].map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs mb-1">Unit</label>
            <Select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
              {["pcs","ml","g"].map(u => <option key={u} value={u}>{u}</option>)}
            </Select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs mb-1">Cost</label>
            <Input type="number" step="0.01" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: Number(e.target.value) })} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs mb-1">Min Stock</label>
            <Input type="number" value={form.minStock} onChange={e => setForm({ ...form, minStock: Number(e.target.value) })} />
          </div>
          <div className="col-span-1">
            <label className="block text-xs mb-1">Active</label>
            <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
          </div>
          <div className="col-span-12 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      )}
    </div>
  );
}
function TransactionDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const { data: items = [] } = useItems();
  const transaction = useStockTransaction();
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const ingredients = items.filter(i => i.isIngredient);

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
            <div className="flex gap-1">
              <Select name="itemId" required className="flex-1">
                <option value="">Select Inventory Item...</option>
                {ingredients.map(item => (
                  <option key={item.id} value={item.id}>{item.name} ({item.unit || "pcs"})</option>
                ))}
              </Select>
              {/* <Button type="button" variant="outline" onClick={() => setIsAddItemOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Inventory
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsManageOpen(true)}>
                Manage
              </Button> */}
            </div>
            {ingredients.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No inventory items yet. Add one using “Add Inventory”.</p>
            )}
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
        {isAddItemOpen && (
          <AddInventoryItemDialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen} />
        )}
        {isManageOpen && (
          <ManageInventoryDialog open={isManageOpen} onOpenChange={setIsManageOpen} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddInventoryItemDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createItem = useCreateItem();
  const { toast } = useToast();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      name: String(formData.get("name") || ""),
      category: String(formData.get("category") || "Supplies"),
      unit: String(formData.get("unit") || "pcs"),
      costPrice: Number(formData.get("costPrice") || 0),
      sellingPrice: Number(formData.get("sellingPrice") || 0),
      minStock: Number(formData.get("minStock") || 0),
      isIngredient: true,
      isActive: false,
    } as any;
    try {
      await createItem.mutateAsync(data);
      toast({ title: "Inventory Item Added" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add Inventory Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-3">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <Input name="name" required placeholder="e.g. Milk" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Category</label>
              <Select name="category" defaultValue="Supplies">
                {["Supplies","Ingredients","Drinks","Snacks","Main"].map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-sm mb-1">Unit</label>
              <Select name="unit" defaultValue="pcs">
                {["pcs","ml","g"].map(u => <option key={u} value={u}>{u}</option>)}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm mb-1">Cost (NPR)</label>
              <Input name="costPrice" type="number" step="0.01" required />
            </div>
            <input type="hidden" name="sellingPrice" value="0" />
          </div>
          <div>
            <label className="block text-sm mb-1">Min Stock</label>
            <Input name="minStock" type="number" defaultValue={0} />
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" isLoading={createItem.isPending}>Add</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
