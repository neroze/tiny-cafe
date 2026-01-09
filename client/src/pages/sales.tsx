import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { PageHeader, Button, Input, Select, Card } from "@/components/ui-components";
import { useItems } from "@/hooks/use-items";
import { useCreateSale, useSales } from "@/hooks/use-sales";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Coffee, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export default function SalesEntry() {
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");
  
  // State for form
  const [date, setDate] = useState(today);
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [customPrice, setCustomPrice] = useState(""); // Optional custom price overrides
  const [labels, setLabels] = useState<string[]>([]);
  const [currentLabel, setCurrentLabel] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: availableLabels = [] } = useQuery({
    queryKey: [api.dashboard.labels.path],
  });

  const filteredSuggestions = useMemo(() => {
    const search = currentLabel.toLowerCase().trim();
    if (!search) return [];
    return (availableLabels as string[]).filter((l: string) => 
      l.toLowerCase().includes(search) && !labels.includes(l)
    );
  }, [availableLabels, currentLabel, labels]);

  // Queries
  const { data: items = [] } = useItems();
  const { data: todaysSales = [], isLoading: isLoadingSales } = useSales({ date, limit: "50" });
  const createSale = useCreateSale();

  // Derived
  const selectedItem = useMemo(() => 
    items.find(i => i.id === Number(itemId)), 
    [items, itemId]
  );
  
  // Update price when item changes
  const unitPrice = customPrice 
    ? Number(customPrice) 
    : (selectedItem ? selectedItem.sellingPrice / 100 : 0);

  const total = unitPrice * Number(quantity);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      await createSale.mutateAsync({
        date: new Date(date).toISOString(),
        itemId: selectedItem.id,
        quantity: Number(quantity),
        unitPrice: Math.round(unitPrice * 100), // Convert back to cents
        total: Math.round(total * 100),
        labels: labels
      });
      
      toast({
        title: "Sale Recorded",
        description: `Sold ${quantity}x ${selectedItem.name}`,
      });
      
      // Reset sensitive fields only
      setQuantity("1");
      setItemId("");
      setCustomPrice("");
      setLabels([]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  return (
    <Layout>
      <PageHeader 
        title="Sales Entry" 
        description="Record daily transactions quickly."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Entry Form */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <h2 className="text-xl font-bold font-display mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> New Sale
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Date</label>
                <Input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)}
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Item</label>
                <Select 
                  value={itemId} 
                  onChange={e => {
                    setItemId(e.target.value);
                    setCustomPrice(""); // Reset custom price on item change
                  }}
                  required
                >
                  <option value="">Select Item...</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Quantity</label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={quantity} 
                    onChange={e => setQuantity(e.target.value)}
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Price (NPR)</label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={customPrice || (selectedItem ? selectedItem.sellingPrice / 100 : "")}
                    onChange={e => setCustomPrice(e.target.value)}
                    placeholder={selectedItem ? String(selectedItem.sellingPrice / 100) : "0.00"}
                    required 
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-muted-foreground mb-1">Labels (Press Enter to add)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {labels.map((label, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1 px-2 py-1">
                      {label}
                      <button
                        type="button"
                        onClick={() => setLabels(labels.filter((_, i) => i !== idx))}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="Add label..."
                  value={currentLabel}
                  onChange={(e) => {
                    setCurrentLabel(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = currentLabel.trim();
                      if (val && !labels.includes(val)) {
                        setLabels([...labels, val]);
                        setCurrentLabel("");
                        setShowSuggestions(false);
                      }
                    }
                  }}
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <Card className="absolute z-50 w-full mt-1 p-1 max-h-40 overflow-y-auto shadow-lg border-border">
                    <div className="flex flex-col">
                      {filteredSuggestions.map((suggestion: string) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors"
                          onClick={() => {
                            setLabels([...labels, suggestion]);
                            setCurrentLabel("");
                            setShowSuggestions(false);
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              <div className="pt-4 border-t border-border mt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-2xl font-display font-bold text-primary">
                    NPR {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  isLoading={createSale.isPending}
                  disabled={!itemId}
                >
                  Confirm Sale
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Recent Sales List */}
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-xl font-bold font-display mb-6 flex items-center gap-2">
              <Coffee className="w-5 h-5 text-primary" /> Today's Transactions
            </h2>

            <div className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 text-sm font-medium text-muted-foreground pl-4">Time</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground">Item</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground text-center">Qty</th>
                    <th className="pb-3 text-sm font-medium text-muted-foreground text-right pr-4">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {todaysSales.map((sale) => (
                    <tr key={sale.id} className="group hover:bg-muted/50 transition-colors">
                      <td className="py-3 text-sm text-muted-foreground pl-4">
                        {format(new Date(sale.createdAt || new Date()), "hh:mm a")}
                      </td>
                      <td className="py-3 font-medium text-foreground">
                        <div>{sale.item?.name}</div>
                        {sale.labels && sale.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {sale.labels.map((label: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[10px] px-1 py-0 h-4 uppercase">
                                {label}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-center text-muted-foreground">
                        <span className="inline-flex items-center justify-center bg-secondary w-8 h-8 rounded-full text-xs font-bold">
                          {sale.quantity}
                        </span>
                      </td>
                      <td className="py-3 text-right font-bold text-primary pr-4">
                        NPR {(sale.total / 100).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {todaysSales.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-muted-foreground">
                        No sales recorded for this date.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
