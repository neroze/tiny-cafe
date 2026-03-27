import { useState } from "react";
import { Layout } from "@/components/layout";
import { PageHeader, Button, Input, Select, Card } from "@/components/ui-components";
import { useItems, useCreateItem, useUpdateItem, useDeleteItem } from "@/hooks/use-items";
import { useRecipe, useUpsertRecipe } from "@/hooks/use-recipes";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, X, Search, Settings as SettingsIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import type { InsertItem } from "@shared/schema";

export default function MenuItems() {
  const { data: items = [], isLoading } = useItems();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoriesDialogOpen, setIsCategoriesDialogOpen] = useState(false);
  const [newConfigCategory, setNewConfigCategory] = useState("");
  const [editingItem, setEditingItem] = useState<InsertItem & { id?: number } | null>(null);

  const { data: configCategories = [] } = useQuery<string[]>({
    queryKey: ["/api/config/categories"],
  });

  const addCategoryMutation = useMutation({
    mutationFn: async (category: string) => {
      await apiRequest("POST", "/api/config/categories", { category });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config/categories"] });
      setNewConfigCategory("");
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (category: string) => {
      await apiRequest("DELETE", "/api/config/categories", { category });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config/categories"] });
    }
  });

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  return (
    <Layout>
      <PageHeader 
        title="Menu Management" 
        description="Manage your items, prices, and categories."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCategoriesDialogOpen(true)}>
              <SettingsIcon className="w-4 h-4 mr-2" /> Categories
            </Button>
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </Button>
          </div>
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

      <Dialog open={isCategoriesDialogOpen} onOpenChange={setIsCategoriesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Menu Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input 
                placeholder="New category name..." 
                value={newConfigCategory}
                onChange={(e) => setNewConfigCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newConfigCategory.trim()) {
                    addCategoryMutation.mutate(newConfigCategory.trim());
                  }
                }}
              />
              <Button 
                onClick={() => newConfigCategory.trim() && addCategoryMutation.mutate(newConfigCategory.trim())}
                disabled={addCategoryMutation.isPending}
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-1">
              {configCategories.map((cat: string) => (
                <Badge key={cat} variant="secondary" className="gap-1 px-2 py-1">
                  {cat}
                  <button 
                    className="hover:text-destructive"
                    onClick={() => deleteCategoryMutation.mutate(cat)}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {configCategories.length === 0 && (
                <p className="text-sm text-muted-foreground w-full text-center py-4">No configured categories yet.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function ItemCard({ item, onEdit }: { item: any, onEdit: () => void }) {
  const { toast } = useToast();
  const deleteItem = useDeleteItem();
  const [recipeOpen, setRecipeOpen] = useState(false);

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
        {!item.isIngredient && (
          <button onClick={() => setRecipeOpen(true)} className="p-2 bg-secondary rounded-lg hover:bg-primary hover:text-white transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      <span className="inline-block px-3 py-1 bg-secondary text-xs font-bold uppercase tracking-wider rounded-full mb-3 text-muted-foreground">
        {item.category}
      </span>
      
      <h3 className="text-xl font-bold font-display text-foreground mb-1">{item.name}</h3>
      
      <div className="flex items-end gap-2 mt-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase">Price</p>
          <p className="text-2xl font-bold text-primary">NPR {Number(item.sellingPrice).toLocaleString()}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-muted-foreground uppercase">Cost</p>
          <p className="text-sm font-medium text-muted-foreground">NPR {Number(item.costPrice).toLocaleString()}</p>
        </div>
      </div>
      {!item.isIngredient && recipeOpen && (
        <RecipeDialog open={recipeOpen} onOpenChange={setRecipeOpen} menuItem={item} />
      )}
    </div>
  );
}

function ItemDialog({ open, onOpenChange, initialData }: { open: boolean, onOpenChange: (v: boolean) => void, initialData: any }) {
  const { toast } = useToast();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  
  const isEditing = !!initialData?.id;

  const { data: configCategories = [] } = useQuery<string[]>({
    queryKey: ["/api/config/categories"],
  });

  const [isCatConfigOpen, setIsCatConfigOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      name: formData.get("name") as string,
      category: formData.get("category") as string,
      costPrice: Number(formData.get("costPrice")),
      sellingPrice: Number(formData.get("sellingPrice")),
      minStock: Number(formData.get("minStock")),
      isIngredient: formData.get("isIngredient") === "on",
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

  const categories: string[] = (configCategories as string[]).length > 0 ? (configCategories as string[]) : ["Drinks", "Snacks", "Main", "Dessert"];

  const queryClient = useQueryClient();
  const [newConfigCategory, setNewConfigCategory] = useState("");
  const addCategoryMutation = useMutation({
    mutationFn: async (category: string) => {
      await apiRequest("POST", "/api/config/categories", { category });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config/categories"] });
      setNewConfigCategory("");
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (category: string) => {
      await apiRequest("DELETE", "/api/config/categories", { category });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config/categories"] });
    }
  });

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
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium">Category</label>
              <button 
                type="button"
                onClick={() => setIsCatConfigOpen(!isCatConfigOpen)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <SettingsIcon className="w-3 h-3" /> Manage
              </button>
            </div>

            {isCatConfigOpen && (
              <div className="mb-3 p-3 bg-secondary/30 rounded-xl border border-border space-y-3">
                <div className="flex gap-2">
                  <Input 
                    placeholder="New..." 
                    value={newConfigCategory}
                    className="h-9 text-sm"
                    onChange={(e) => setNewConfigCategory(e.target.value)}
                  />
                  <Button 
                    type="button"
                    className="px-3 py-1 h-9 text-sm"
                    onClick={() => newConfigCategory.trim() && addCategoryMutation.mutate(newConfigCategory.trim())}
                    disabled={addCategoryMutation.isPending}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {configCategories.map((cat: string) => (
                    <Badge key={cat} variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
                      {cat}
                      <button 
                        type="button"
                        className="hover:text-destructive"
                        onClick={() => deleteCategoryMutation.mutate(cat)}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Select name="category" defaultValue={initialData?.category || categories[0]}>
              {categories.map((cat: string) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cost (Calculated)</label>
              <Input type="number" step="0.01" value={initialData?.costPrice || 0} disabled className="bg-muted" />
              <input type="hidden" name="costPrice" value={initialData?.costPrice || 0} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Selling Price</label>
              <Input name="sellingPrice" type="number" step="0.01" defaultValue={initialData?.sellingPrice} required />
            </div>
          </div>

          <input type="hidden" name="isIngredient" value="false" />
          <input type="hidden" name="minStock" value="0" />

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

function RecipeDialog({ open, onOpenChange, menuItem }: { open: boolean; onOpenChange: (v: boolean) => void; menuItem: any }) {
  const { data: items = [] } = useItems();
  const { data: recipe } = useRecipe(menuItem.id);
  const saveRecipe = useUpsertRecipe();
  const { toast } = useToast();
  const inventoryItems = items.filter(i => i.isIngredient);
  const [rows, setRows] = useState<{ ingredientId: number; quantity: number; unit: string }[]>(
    recipe?.ingredients?.map((i: any) => ({ ingredientId: i.ingredientId, quantity: Number(i.quantity), unit: i.unit })) || []
  );
  const missingItems = items.filter(i => rows.some(r => r.ingredientId === i.id) && !i.isIngredient);
  const ingredientOptions = [...inventoryItems, ...missingItems];
  
  const canAdd = inventoryItems.length > 0;

  useEffect(() => {
    if (recipe?.ingredients) {
      setRows(recipe.ingredients.map((i: any) => ({
        ingredientId: i.ingredientId,
        quantity: Number(i.quantity),
        unit: i.unit,
      })));
    }
  }, [recipe]);
  const addRow = () => {
    if (!canAdd) return;
    const selectedIds = new Set(rows.map(r => r.ingredientId));
    // Prefer inventory items
    const baseOptions = inventoryItems;
    const firstAvailable = baseOptions.find(i => !selectedIds.has(i.id)) || baseOptions[0];
    
    if (!firstAvailable) return;

    setRows([...rows, { ingredientId: firstAvailable.id, quantity: 1, unit: firstAvailable.unit || "pcs" }]);
  };
  const updateRow = (idx: number, patch: Partial<{ ingredientId: number; quantity: number; unit: string }>) => {
    const next = [...rows];
    next[idx] = { ...next[idx], ...patch };
    setRows(next);
  };
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));
  const costPreview = rows.reduce((sum, r) => {
    const ing = inventoryItems.find(i => i.id === r.ingredientId);
    const costPerUnit = ing ? Number(ing.costPrice) : 0;
    return sum + (Number(r.quantity) * costPerUnit);
  }, 0);
  const warn = costPreview > Number(menuItem.sellingPrice);
  const handleSave = async () => {
    try {
      await saveRecipe.mutateAsync({ menuItemId: menuItem.id, ingredients: rows });
      toast({ title: "Recipe saved" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Recipe for {menuItem.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {rows.map((r, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                <label className="block text-xs mb-1">Ingredient</label>
                <Select value={String(r.ingredientId)} onChange={e => updateRow(idx, { ingredientId: Number(e.target.value), unit: ingredientOptions.find(i => i.id === Number(e.target.value))?.unit || "pcs" })}>
                  {ingredientOptions.map(i => (
                    <option key={i.id} value={i.id} disabled={!i.isIngredient}>
                      {i.name} ({i.unit || "pcs"}){!i.isIngredient ? " • not inventory" : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="col-span-3">
                <label className="block text-xs mb-1">Quantity per unit</label>
                <Input type="number" step="0.001" value={r.quantity} onChange={e => updateRow(idx, { quantity: Number(e.target.value) })} />
              </div>
              <div className="col-span-3">
                <label className="block text-xs mb-1">Unit</label>
                <Select value={r.unit} onChange={e => updateRow(idx, { unit: e.target.value })}>
                  {["ml","g","pcs"].map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </Select>
              </div>
              <div className="col-span-1">
                <button onClick={() => removeRow(idx)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={addRow} disabled={!canAdd}><Plus className="w-4 h-4 mr-2" /> Add Ingredient</Button>
            <div className={`text-sm ${warn ? "text-red-500" : "text-muted-foreground"}`}>
              Cost per unit: NPR {costPreview.toLocaleString()} {warn ? "(> selling price!)" : ""}
            </div>
          </div>
          {!canAdd && rows.length === 0 && (
            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
              No inventory items found. Please create items marked as "Ingredient" first.
            </div>
          )}
        </div>
        <div className="pt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} isLoading={saveRecipe.isPending}>Save Recipe</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
