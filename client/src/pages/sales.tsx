import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { PageHeader, Button, Input, Select, Card } from "@/components/ui-components";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useItems } from "@/hooks/use-items";
import { useCreateSale, useSales, useUpdateSale } from "@/hooks/use-sales";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
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
  const [discount, setDiscount] = useState("0");
  const [labels, setLabels] = useState<string[]>([]);
  const [currentLabel, setCurrentLabel] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: availableLabels = [] } = useQuery({
    queryKey: [api.dashboard.labels.path],
  });

  const { data: configLabels = [] } = useQuery({
    queryKey: ["/api/config/labels"],
  });

  const allAvailableLabels = useMemo(() => {
    return Array.from(new Set([...(availableLabels as string[]), ...(configLabels as string[])]));
  }, [availableLabels, configLabels]);

  const filteredSuggestions = useMemo(() => {
    const search = currentLabel.toLowerCase().trim();
    if (!search) return [];
    return allAvailableLabels.filter((l: string) => 
      l.toLowerCase().includes(search) && !labels.includes(l)
    );
  }, [allAvailableLabels, currentLabel, labels]);

  // Queries
  const { data: items = [] } = useItems();
  const { data: todaysSales = [], isLoading: isLoadingSales } = useSales({ date, limit: "50" });
  const createSale = useCreateSale();
  const updateSale = useUpdateSale();

  // Derived
  const selectedItem = useMemo(() => 
    items.find(i => i.id === Number(itemId)), 
    [items, itemId]
  );
  
  // Update price when item changes
  const unitPrice = customPrice 
    ? Number(customPrice) 
    : (selectedItem ? selectedItem.sellingPrice : 0);

  const total = Math.max(0, (unitPrice * Number(quantity)) - Number(discount || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      await createSale.mutateAsync({
        date: new Date(date).toISOString(),
        itemId: selectedItem.id,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        total: Number(total),
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
      setDiscount("0");
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

      {/* Summary widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {(() => {
          const todayStr = format(new Date(), "yyyy-MM-dd");
          const weekFromStr = format(startOfWeek(new Date()), "yyyy-MM-dd");
          const weekToStr = format(endOfWeek(new Date()), "yyyy-MM-dd");
          const monthFromStr = format(startOfMonth(new Date()), "yyyy-MM-dd");
          const monthToStr = format(endOfMonth(new Date()), "yyyy-MM-dd");
          const { data: todayRange = [] } = useSales({ from: todayStr, to: todayStr, limit: "500" });
          const { data: weekRange = [] } = useSales({ from: weekFromStr, to: weekToStr, limit: "2000" });
          const { data: monthRange = [] } = useSales({ from: monthFromStr, to: monthToStr, limit: "5000" });
          const sum = (rows: any[]) => rows.reduce((s, r) => s + Number(r.total || 0), 0);
          return (
            <>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-sm text-muted-foreground">Today</div>
                <div className="text-2xl font-display">NPR {sum(todayRange).toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-sm text-muted-foreground">This Week</div>
                <div className="text-2xl font-display">NPR {sum(weekRange).toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-sm text-muted-foreground">This Month</div>
                <div className="text-2xl font-display">NPR {sum(monthRange).toLocaleString()}</div>
              </div>
            </>
          );
        })()}
      </div>

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
                    value={customPrice || (selectedItem ? selectedItem.sellingPrice : "")}
                    onChange={e => setCustomPrice(e.target.value)}
                    placeholder={selectedItem ? String(selectedItem.sellingPrice) : "0.00"}
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Discount (NPR)</label>
                <Input 
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  placeholder="0.00"
                />
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
                  <Card className="absolute z-50 w-full mt-1 p-1 max-h-40 overflow-y-auto shadow-lg border-border bg-white dark:bg-zinc-950">
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

            {/* Range filters and pagination */}
            <div className="flex flex-wrap gap-2 mb-4 px-4">
              {(() => {
                const todayStr = format(new Date(), "yyyy-MM-dd");
                const [from, setFrom] = useState<string>(todayStr);
                const [to, setTo] = useState<string>(todayStr);
                const [page, setPage] = useState(1);
                const [pageSize, setPageSize] = useState(10);
                const [editing, setEditing] = useState<any | null>(null);
                const [formEdit, setFormEdit] = useState({ itemId: 0, quantity: 1, unitPrice: 0, total: 0 });
                const [editDiscount, setEditDiscount] = useState(0);
                const { data: rangeSales = [] } = useSales({ from, to, limit: "5000" });
                const pageCount = Math.max(1, Math.ceil(rangeSales.length / pageSize));
                const startIndex = (page - 1) * pageSize;
                const visible = rangeSales.slice(startIndex, startIndex + pageSize);
                const openEdit = (sale: any) => {
                  setEditing(sale);
                  setFormEdit({
                    itemId: sale.itemId,
                    quantity: sale.quantity,
                    unitPrice: Number(sale.unitPrice || 0),
                    total: Number(sale.total || 0),
                  });
                  const impliedDiscount = Math.max(
                    0,
                    (Number(sale.unitPrice || 0) * Number(sale.quantity || 0)) - Number(sale.total || 0)
                  );
                  setEditDiscount(impliedDiscount);
                };
                const saveEdit = async () => {
                  if (!editing) return;
                  const computedTotal = Math.max(0, (Number(formEdit.quantity) * Number(formEdit.unitPrice)) - Number(editDiscount || 0));
                  await updateSale.mutateAsync({
                    id: editing.id,
                    itemId: Number(formEdit.itemId),
                    quantity: Number(formEdit.quantity),
                    unitPrice: Number(formEdit.unitPrice),
                    total: Number(computedTotal),
                    date: new Date(editing.date).toISOString(),
                  });
                  setEditing(null);
                };
                return (
                  <>
                    <Input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} />
                    <Input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} />
                    <Select value={String(pageSize)} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                      <option value="10">10 / page</option>
                      <option value="20">20 / page</option>
                      <option value="50">50 / page</option>
                    </Select>
                    <div className="ml-auto flex items-center gap-2">
                      <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
                      <span className="text-sm text-muted-foreground">Page {page} of {pageCount}</span>
                      <Button variant="outline" onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page >= pageCount}>Next</Button>
                    </div>
                    <div className="overflow-hidden w-full">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="pb-3 text-sm font-medium text-muted-foreground pl-4">Time</th>
                            <th className="pb-3 text-sm font-medium text-muted-foreground">Item</th>
                            <th className="pb-3 text-sm font-medium text-muted-foreground text-center">Qty</th>
                            <th className="pb-3 text-sm font-medium text-muted-foreground text-right pr-4">Total</th>
                            <th className="pb-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {visible.map((sale: any) => (
                            <tr key={sale.id} className="group hover:bg-muted/50 transition-colors">
                              <td className="py-3 text-sm text-muted-foreground pl-4">
                                {format(new Date(sale.date || sale.createdAt || new Date()), "LLL dd, y hh:mm a")}
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
                                NPR {Number(sale.total).toLocaleString()}
                              </td>
                              <td className="py-3 text-right pr-4">
                                <Button variant="outline" onClick={() => openEdit(sale)}>Edit</Button>
                              </td>
                            </tr>
                          ))}
                          {visible.length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-12 text-center text-muted-foreground">
                                No sales recorded for this range.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
                        <DialogContent className="bg-background sm:max-w-[520px]">
                          <DialogHeader>
                            <DialogTitle className="font-display text-2xl">Edit Sale</DialogTitle>
                          </DialogHeader>
                          <div className="grid grid-cols-1 gap-4 mt-2">
                            <div>
                              <label className="block text-sm mb-1 text-muted-foreground">Item</label>
                              <Select value={String(formEdit.itemId)} onChange={e => setFormEdit({ ...formEdit, itemId: Number(e.target.value) })}>
                                <option value="">Select Item...</option>
                                {items.map((item) => (
                                  <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                              </Select>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                              <div>
                                <label className="block text-sm mb-1 text-muted-foreground">Quantity</label>
                                <Input type="number" min={1} value={formEdit.quantity} onChange={e => setFormEdit({ ...formEdit, quantity: Number(e.target.value) })} />
                              </div>
                              <div>
                                <label className="block text-sm mb-1 text-muted-foreground">Unit Price (NPR)</label>
                                <Input type="number" step="0.01" value={formEdit.unitPrice} onChange={e => setFormEdit({ ...formEdit, unitPrice: Number(e.target.value) })} />
                              </div>
                              <div>
                                <label className="block text-sm mb-1 text-muted-foreground">Discount (NPR)</label>
                                <Input type="number" step="0.01" value={editDiscount} onChange={e => setEditDiscount(Number(e.target.value))} />
                              </div>
                              <div>
                                <label className="block text-sm mb-1 text-muted-foreground">Total (auto)</label>
                                <Input type="number" value={Math.max(0, (Number(formEdit.unitPrice) * Number(formEdit.quantity)) - Number(editDiscount || 0)).toString()} readOnly />
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                            <Button onClick={saveEdit} isLoading={updateSale.isPending}>Save</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Single unified list above; removed duplicate today's list */}
          </Card>
        </div>
      </div>
    </Layout>
  );
}
