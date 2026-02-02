import { useState } from "react";
import { Layout } from "@/components/layout";
import { PageHeader, Button, Input, Card } from "@/components/ui-components";
import { useTables, useCreateTable, useUpdateTable, useDeleteTable } from "@/hooks/use-tables";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { InsertTable } from "@shared/schema";

export default function TablesPage() {
  const { data: tables = [], isLoading } = useTables();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<InsertTable & { id?: number } | null>(null);

  const openCreate = () => {
    setEditingTable(null);
    setIsDialogOpen(true);
  };

  const openEdit = (table: any) => {
    setEditingTable(table);
    setIsDialogOpen(true);
  };

  return (
    <Layout>
      <PageHeader 
        title="Table Management" 
        description="Configure your restaurant tables."
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Table
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {tables.map(table => (
          <TableCard key={table.id} table={table} onEdit={() => openEdit(table)} />
        ))}
        {tables.length === 0 && !isLoading && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-2xl border border-dashed border-border">
            No tables configured. Add one to get started!
          </div>
        )}
      </div>

      <TableDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        initialData={editingTable} 
      />
    </Layout>
  );
}

function TableCard({ table, onEdit }: { table: any, onEdit: () => void }) {
  const { toast } = useToast();
  const deleteTable = useDeleteTable();

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete Table ${table.number}?`)) {
      try {
        await deleteTable.mutateAsync(table.id);
        toast({ title: "Table deleted" });
      } catch (err) {
        toast({ variant: "destructive", title: "Failed to delete" });
      }
    }
  };

  return (
    <div className="bg-card rounded-2xl p-6 border border-border hover:shadow-lg transition-all duration-300 group relative flex flex-col items-center justify-center min-h-[150px]">
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-2 bg-secondary rounded-lg hover:bg-primary hover:text-white transition-colors">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={handleDelete} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="text-4xl font-display font-bold mb-2 text-primary">
        {table.number}
      </div>
      <div className="text-sm text-muted-foreground">
        Capacity: {table.capacity}
      </div>
      <div className={`mt-4 px-3 py-1 rounded-full text-xs font-medium ${table.status === 'occupied' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
        {table.status.toUpperCase()}
      </div>
    </div>
  );
}

function TableDialog({ open, onOpenChange, initialData }: { open: boolean, onOpenChange: (open: boolean) => void, initialData: InsertTable & { id?: number } | null }) {
  const { toast } = useToast();
  const createTable = useCreateTable();
  const updateTable = useUpdateTable();
  
  const [formData, setFormData] = useState<InsertTable>({
    number: 0,
    capacity: 4,
    status: "empty"
  });

  // Reset form when opening
  if (open && initialData && formData.number !== initialData.number && initialData.number !== undefined) {
      setFormData({
          number: initialData.number,
          capacity: initialData.capacity || 4,
          status: initialData.status || "empty"
      });
  } else if (open && !initialData && formData.number !== 0) {
      // If opening create mode but form has data, reset (basic logic, can be improved)
      // Actually best to use useEffect
  }
  
  // Better approach with key or effect
  // Using simple effect for now
  useState(() => {
      if (initialData) {
          setFormData({
            number: initialData.number,
            capacity: initialData.capacity || 4,
            status: initialData.status || "empty"
          });
      } else {
          setFormData({ number: 0, capacity: 4, status: "empty" });
      }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (initialData?.id) {
        await updateTable.mutateAsync({ id: initialData.id, ...formData });
        toast({ title: "Table updated" });
      } else {
        await createTable.mutateAsync(formData);
        toast({ title: "Table created" });
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Table" : "Add New Table"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="number">Table Number</Label>
            <Input 
              id="number" 
              type="number" 
              required 
              value={formData.number || ''} 
              onChange={e => setFormData({ ...formData, number: Number(e.target.value) })} 
            />
          </div>
          <div>
            <Label htmlFor="capacity">Capacity</Label>
            <Input 
              id="capacity" 
              type="number" 
              required 
              value={formData.capacity || ''} 
              onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })} 
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{initialData ? "Save Changes" : "Create Table"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
