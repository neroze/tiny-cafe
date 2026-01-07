import { useState } from "react";
import { Layout } from "@/components/layout";
import { PageHeader, Button, Input, Select, Card } from "@/components/ui-components";
import { useItems, useCreateItem, useUpdateItem, useDeleteItem } from "@/hooks/use-items";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, X, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { InsertItem } from "@shared/routes";

export default function MenuItems() {
  const { data: items = [], isLoading } = useItems();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InsertItem & { id?: number } | null>(null);

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const openEdit = (item: any) => {
    // Convert cents to standard units for editing
    setEditingItem({
      ...item,
      costPrice: item.costPrice / 100,
      sellingPrice: item.sellingPrice / 100,
    });
    setIsDialogOpen(true);
  };

  return (
    <Layout>
      <PageHeader 
        title="Menu Management" 
        description="Manage your items, prices, and categories."
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Item
          </Button>
        }
      />

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input 
          placeholder="Search items..." 
          className="pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => (
          <ItemCard key={item.id} item={item} onEdit={() => openEdit(item)} />
        ))}
        {filteredItems.length === 0 && !isLoading && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-2xl border border-dashed border-border">
            No items found. Add one to get started!
          </div>
        )}
      </div>

      <ItemDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        initialData={editingItem} 
      />
    </Layout>
  );
}

function ItemCard({ item, onEdit }: { item: any, onEdit: () => void }) {
  const { toast } = useToast();
  const deleteItem = useDeleteItem();

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this item?")) {
      try {
        await deleteItem.mutateAsync(item.id);
        toast({ title: "Item deleted" });
      } catch (err) {
        toast({ variant: "destructive", title: "Failed to delete" });
      }
    }
  };

  return (
    <div className="bg-card rounded-2xl p-6 border border-border hover:shadow-lg transition-all duration-300 group relative">
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-2 bg-secondary rounded-lg hover:bg-primary hover:text-white transition-colors">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={handleDelete} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <span className="inline-block px-3 py-1 bg-secondary text-xs font-bold uppercase tracking-wider rounded-full mb-3 text-muted-foreground">
        {item.category}
      </span>
      
      <h3 className="text-xl font-bold font-display text-foreground mb-1">{item.name}</h3>
      
      <div className="flex items-end gap-2 mt-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase">Price</p>
          <p className="text-2xl font-bold text-primary">NPR {(item.sellingPrice / 100).toLocaleString()}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-muted-foreground uppercase">Cost</p>
          <p className="text-sm font-medium text-muted-foreground">NPR {(item.costPrice / 100).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function ItemDialog({ open, onOpenChange, initialData }: { open: boolean, onOpenChange: (v: boolean) => void, initialData: any }) {
  const { toast } = useToast();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  
  const isEditing = !!initialData?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      name: formData.get("name") as string,
      category: formData.get("category") as string,
      costPrice: Math.round(Number(formData.get("costPrice")) * 100), // Convert to cents
      sellingPrice: Math.round(Number(formData.get("sellingPrice")) * 100), // Convert to cents
      minStock: Number(formData.get("minStock")),
    };

    try {
      if (isEditing) {
        await updateItem.mutateAsync({ id: initialData.id, ...data });
        toast({ title: "Item Updated" });
      } else {
        await createItem.mutateAsync(data);
        toast({ title: "Item Created" });
      }
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isEditing ? "Edit Item" : "New Menu Item"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Item Name</label>
            <Input name="name" defaultValue={initialData?.name} required placeholder="e.g. Cappuccino" />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <Select name="category" defaultValue={initialData?.category || "Drinks"}>
              <option value="Drinks">Drinks</option>
              <option value="Snacks">Snacks</option>
              <option value="Main">Main Course</option>
              <option value="Dessert">Dessert</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cost (NPR)</label>
              <Input name="costPrice" type="number" step="0.01" defaultValue={initialData?.costPrice} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Selling Price</label>
              <Input name="sellingPrice" type="number" step="0.01" defaultValue={initialData?.sellingPrice} required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Min Stock Warning</label>
            <Input name="minStock" type="number" defaultValue={initialData?.minStock || 10} />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" isLoading={createItem.isPending || updateItem.isPending}>
              {isEditing ? "Save Changes" : "Create Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
