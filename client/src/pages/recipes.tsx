import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { PageHeader, Button, Input, Select } from "@/components/ui-components";
import { useItems } from "@/hooks/use-items";
import { useRecipe, useUpsertRecipe } from "@/hooks/use-recipes";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, X, Search } from "lucide-react";

export default function RecipesPage() {
  const { data: items = [], isLoading } = useItems();
  const [search, setSearch] = useState("");

  const filteredItems = items
    .filter(item => !item.isIngredient)
    .filter(item => 
      item.name.toLowerCase().includes(search.toLowerCase()) || 
      item.category.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <Layout>
      <PageHeader 
        title="Recipes (Bill of Materials)" 
        description="Define ingredient usage per menu item with unit awareness and cost preview."
      />

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input 
          placeholder="Search menu items..." 
          className="pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => (
          <RecipeCard key={item.id} item={item} />
        ))}
        {filteredItems.length === 0 && !isLoading && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-2xl border border-dashed border-border">
            No menu items found. Add menu items first in Menu.
          </div>
        )}
      </div>
    </Layout>
  );
}

function RecipeCard({ item }: { item: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-card rounded-2xl p-6 border border-border">
      <div className="flex items-start justify-between">
        <div>
          <span className="inline-block px-3 py-1 bg-secondary text-xs font-bold uppercase tracking-wider rounded-full mb-3 text-muted-foreground">
            {item.category}
          </span>
          <h3 className="text-xl font-bold font-display text-foreground mb-1">{item.name}</h3>
          <p className="text-sm text-muted-foreground">Selling: NPR {Number(item.sellingPrice).toLocaleString()} • Cost: NPR {Number(item.costPrice).toLocaleString()}</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Manage Recipe
        </Button>
      </div>
      {open && <RecipeDialog open={open} onOpenChange={setOpen} menuItem={item} />}
    </div>
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
    // Prefer inventory items, but if none available (which shouldn't happen due to canAdd check) fallback safely
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
              No inventory items found. Please go to Menu and create items marked as "Ingredient" first.
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
