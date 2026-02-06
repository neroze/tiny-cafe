import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { PageHeader, Button, Card, Input } from "@/components/ui-components";
import { useTables } from "@/hooks/use-tables";
import { useOrders, useCreateOrder, useAddItemToOrder, useRemoveItemFromOrder, useCloseOrder } from "@/hooks/use-orders";
import { useCustomers, useCreateCustomer } from "@/hooks/use-customers";
import { useItems } from "@/hooks/use-items";
import { useReceivables, useRecordReceivablePayment } from "@/hooks/use-receivables";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, ShoppingCart, CheckCircle, Trash2, Plus, Users, Utensils, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function SalesPage() {
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const { data: tables = [], isLoading: isLoadingTables } = useTables();

  const selectedTable = useMemo(() => 
    tables.find(t => t.id === selectedTableId), 
    [tables, selectedTableId]
  );

  return (
    <Layout>
      {selectedTable ? (
        <OrderView 
          table={selectedTable} 
          onBack={() => setSelectedTableId(null)} 
        />
      ) : (
        <div className="space-y-6">
          <Tabs defaultValue="orders">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="orders">Table Service</TabsTrigger>
              <TabsTrigger value="history">Sales History</TabsTrigger>
              <TabsTrigger value="credit">Credit Settlement</TabsTrigger>
            </TabsList>
            <TabsContent value="orders" className="mt-6">
              <PageHeader 
                title="Table Service" 
                description="Select a table to manage orders."
              />
              {isLoadingTables ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {tables.map(table => (
                    <TableCard 
                      key={table.id} 
                      table={table} 
                      onClick={() => setSelectedTableId(table.id)} 
                    />
                  ))}
                  {tables.length === 0 && (
                     <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-xl border border-dashed">
                       No tables configured. Go to <a href="/tables" className="text-primary hover:underline">Tables</a> to set them up.
                     </div>
                  )}
                </div>
              )}
            </TabsContent>
            <TabsContent value="history" className="mt-6">
              <SalesHistory />
            </TabsContent>
            <TabsContent value="credit" className="mt-6">
              <CreditSettlement />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </Layout>
  );
}

function TableCard({ table, onClick }: { table: any, onClick: () => void }) {
  const isOccupied = table.status === 'occupied';
  
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 hover:scale-105",
        isOccupied 
          ? "bg-orange-50/50 border-orange-200 hover:border-orange-300 dark:bg-orange-950/20 dark:border-orange-900" 
          : "bg-card border-border hover:border-primary/50"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center mb-3",
        isOccupied ? "bg-orange-100 text-orange-600" : "bg-secondary text-secondary-foreground"
      )}>
        <Utensils className="w-6 h-6" />
      </div>
      <div className="text-xl font-bold font-display">Table {table.number}</div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
        <Users className="w-3 h-3" />
        <span>Capacity: {table.capacity}</span>
      </div>
      <Badge 
        variant={isOccupied ? "default" : "outline"} 
        className={cn("mt-3", isOccupied ? "bg-orange-500 hover:bg-orange-600" : "")}
      >
        {isOccupied ? "Occupied" : "Empty"}
      </Badge>
    </button>
  );
}

function OrderView({ table, onBack }: { table: any, onBack: () => void }) {
  const { toast } = useToast();
  const { data: openOrders = [], isLoading: isLoadingOrders } = useOrders("OPEN");
  const createOrder = useCreateOrder();
  const closeOrder = useCloseOrder();
  const { data: customers = [] } = useCustomers();
  const createCustomer = useCreateCustomer();

  const [paymentType, setPaymentType] = useState<'CASH'|'CARD'|'CREDIT'>('CASH');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  
  const activeOrder = useMemo(() => 
    openOrders.find((o: any) => o.tableId === table.id),
    [openOrders, table.id]
  );

  const handleStartOrder = async () => {
    try {
      await createOrder.mutateAsync({
        tableId: table.id,
        status: "OPEN"
      });
      toast({ title: "Order Started", description: `Order started for Table ${table.number}` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleCloseOrder = async () => {
    if (!activeOrder) return;
    try {
      if (paymentType === 'CREDIT') {
        if (!selectedCustomerId) throw new Error("Select customer for credit sale");
        await closeOrder.mutateAsync({ orderId: activeOrder.id, paymentType, customerId: selectedCustomerId });
      } else {
        await closeOrder.mutateAsync({ orderId: activeOrder.id, paymentType });
      }
      toast({ title: "Order Closed", description: `Order for Table ${table.number} has been finalized.` });
      onBack();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  if (isLoadingOrders) {
    return (
      <div className="h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-display">Table {table.number}</h1>
            <p className="text-sm text-muted-foreground">
              {activeOrder ? `Order #${activeOrder.id} • Started ${activeOrder.createdAt ? format(new Date(activeOrder.createdAt), 'h:mm a') : ''}` : 'No Active Order'}
            </p>
          </div>
        </div>
        
        {activeOrder && (
          <div className="flex items-center gap-3">
            <div className="text-right mr-4">
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="text-2xl font-bold font-display text-primary">
                NPR {Number(activeOrder.total).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={paymentType} onValueChange={(v: any) => setPaymentType(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="CREDIT">Credit</SelectItem>
                </SelectContent>
              </Select>
              {paymentType === 'CREDIT' && (
                <div className="flex items-center gap-2">
                  <Select value={selectedCustomerId ? String(selectedCustomerId) : undefined} onValueChange={(v: any) => setSelectedCustomerId(Number(v))}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Input placeholder="New customer" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} className="w-[160px]" />
                    <Button variant="outline" onClick={async () => {
                      if (!newCustomerName.trim()) return;
                      try {
                        const created = await createCustomer.mutateAsync({ name: newCustomerName });
                        setSelectedCustomerId((created as any).id);
                        setNewCustomerName("");
                        toast({ title: "Customer added" });
                      } catch (err: any) {
                        toast({ variant: "destructive", title: "Error", description: err.message });
                      }
                    }}>Add</Button>
                  </div>
                </div>
              )}
            </div>
            <Button 
              onClick={handleCloseOrder}
              isLoading={closeOrder.isPending}
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Close & Pay
            </Button>
          </div>
        )}
      </div>

      {!activeOrder ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-card rounded-xl border border-dashed border-border p-12">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
            <Utensils className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold mb-2">Table is Empty</h3>
          <p className="text-muted-foreground mb-6">Start a new order to begin adding items.</p>
          <Button onClick={handleStartOrder} isLoading={createOrder.isPending}>
            Start Order
          </Button>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
          {/* Order Items List (Left) */}
          <div className="lg:col-span-1 flex flex-col bg-card rounded-xl border border-border overflow-hidden h-full">
            <div className="p-4 border-b border-border bg-muted/30 font-medium">
              Order Items
            </div>
            <ScrollArea className="flex-1 p-4">
              {activeOrder.items && activeOrder.items.length > 0 ? (
                <div className="space-y-3">
                  {activeOrder.items.map((sale: any) => (
                    <OrderItemRow key={sale.id} sale={sale} orderId={activeOrder.id} />
                  ))}
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-muted-foreground text-sm italic">
                  No items added yet.
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Menu Selection (Right) */}
          <div className="lg:col-span-2 flex flex-col bg-card rounded-xl border border-border overflow-hidden h-full">
            <MenuSelection orderId={activeOrder.id} />
          </div>
        </div>
      )}
    </div>
  );
}

function OrderItemRow({ sale, orderId }: { sale: any, orderId: number }) {
  const removeItem = useRemoveItemFromOrder();
  const { toast } = useToast();

  const handleRemove = async () => {
    try {
      await removeItem.mutateAsync({ orderId, itemId: sale.id });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  return (
    <div className="flex items-start justify-between p-3 rounded-lg border border-border bg-background hover:bg-accent/50 transition-colors">
      <div className="flex-1">
        <div className="font-medium">{sale.item?.name}</div>
        <div className="text-sm text-muted-foreground">
          {sale.quantity} x NPR {Number(sale.unitPrice).toLocaleString()}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="font-bold text-right">
          NPR {Number(sale.total).toLocaleString()}
        </div>
        <Button 
          variant="outline" 
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleRemove}
          isLoading={removeItem.isPending}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function MenuSelection({ orderId }: { orderId: number }) {
  const { data: items = [] } = useItems();
  const addItem = useAddItemToOrder();
  const { toast } = useToast();
  
  // Filter out ingredients
  const menuItems = useMemo(() => items.filter(i => !i.isIngredient), [items]);
  
  // Group by category (if available, otherwise "All")
  // For now, let's just use a search/filter approach
  const [search, setSearch] = useState("");
  
  const filteredItems = useMemo(() => {
    if (!search) return menuItems;
    return menuItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  }, [menuItems, search]);

  const handleAddItem = async (item: any) => {
    try {
      await addItem.mutateAsync({
        orderId,
        item: {
          itemId: item.id,
          quantity: 1,
          unitPrice: Number(item.sellingPrice),
          total: Number(item.sellingPrice)
        }
      });
      // Optional: Toast or sound
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border gap-4 flex">
        <div className="relative flex-1">
          <Input 
            placeholder="Search menu items..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleAddItem(item)}
              disabled={addItem.isPending}
              className="flex flex-col items-start p-4 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-accent/50 transition-all text-left group"
            >
              <div className="font-bold mb-1 group-hover:text-primary transition-colors line-clamp-2">
                {item.name}
              </div>
              <div className="mt-auto text-sm font-medium text-muted-foreground">
                NPR {Number(item.sellingPrice).toLocaleString()}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function SalesHistory() {
  const { toast } = useToast();
  const updateSale = useUpdateSale();
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<{ quantity: number; unitPrice: number; labels: string }>({ quantity: 1, unitPrice: 0, labels: "" });

  const [preset, setPreset] = useState<'today'|'yesterday'|'week'|'month'|'custom'>('week');
  const [from, setFrom] = useState<string>(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [to, setTo] = useState<string>(() => new Date().toISOString().split("T")[0]);

  const salesParams = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (preset === 'today') return { date: todayStr, limit: "200" };
    if (preset === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return { date: d.toISOString().split("T")[0], limit: "200" };
    }
    if (preset === 'week') {
      const d = new Date();
      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return { from: start.toISOString().split("T")[0], to: todayStr, limit: "500" };
    }
    if (preset === 'month') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: start.toISOString().split("T")[0], to: todayStr, limit: "1000" };
    }
    return { from, to, limit: "1000" };
  }, [preset, from, to]);

  const { data: sales = [], isLoading } = useSales(salesParams);

  const openEdit = (sale: any) => {
    setEditing(sale);
    setForm({ quantity: Number(sale.quantity), unitPrice: Number(sale.unitPrice), labels: (sale.labels || []).join(", ") });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      const quantity = Number(form.quantity);
      const unitPrice = Number(form.unitPrice);
      const total = quantity * unitPrice;
      const labels = form.labels.split(",").map(s => s.trim()).filter(Boolean);
      await updateSale.mutateAsync({ id: editing.id, quantity, unitPrice, total, labels });
      setEditing(null);
      toast({ title: "Sale updated" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  // Avoid conditional returns before hooks to keep hook order stable

  // Group by date then by table
  const grouped = useMemo(() => {
    const byDate: Record<string, any[]> = {};
    sales.forEach((s: any) => {
      const d = new Date(s.date);
      const key = d.toISOString().split("T")[0];
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(s);
    });
    const result = Object.entries(byDate)
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([dateStr, rows]) => {
        const byTable: Record<string, any[]> = {};
        rows.forEach((r: any) => {
          const tableLabel = r.table?.number ? `Table ${r.table.number}` : "No Table";
          if (!byTable[tableLabel]) byTable[tableLabel] = [];
          byTable[tableLabel].push(r);
        });
        return { dateStr, tables: Object.entries(byTable) };
      });
    return result;
  }, [sales]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-sm">Preset</label>
          <Select value={preset} onValueChange={(v: any) => setPreset(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {preset === 'custom' && (
          <>
            <div>
              <label className="text-sm">From</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" />
            </div>
            <div>
              <label className="text-sm">To</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" />
            </div>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Item</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Unit Price</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2">Payment</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(group => (
                <>
                  <tr key={`date-${group.dateStr}`} className="bg-muted/40">
                    <td colSpan={6} className="py-2 px-2 font-medium">{format(new Date(group.dateStr), 'MMM d, yyyy')}</td>
                  </tr>
                  {group.tables.map(([tableLabel, rows]) => (
                    <>
                      <tr key={`table-${group.dateStr}-${tableLabel}`} className="bg-muted/20">
                        <td colSpan={6} className="py-2 px-2 text-muted-foreground">{tableLabel}</td>
                      </tr>
                      {rows.map((s: any) => (
                        <tr key={s.id} className="border-b">
                          <td className="py-2">{s.item?.name}</td>
                          <td className="py-2 text-right">{s.quantity}</td>
                          <td className="py-2 text-right">{`NPR ${Number(s.unitPrice).toLocaleString()}`}</td>
                          <td className="py-2 text-right">{`NPR ${Number(s.total).toLocaleString()}`}</td>
                          <td className="py-2">{s.orderPaymentType || 'CASH'}</td>
                          <td className="py-2 text-right">
                            <Button variant="outline" onClick={() => openEdit(s)}>
                              <Edit2 className="w-4 h-4 mr-2" /> Edit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </>
              ))}
              {grouped.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-foreground">No sales in selected range</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

  <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sale</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Quantity</label>
              <Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} required />
            </div>
            <div>
              <label className="block text-sm mb-1">Unit Price</label>
              <Input type="number" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: Number(e.target.value) })} required />
            </div>
            <div>
              <label className="block text-sm mb-1">Labels (comma-separated)</label>
              <Input value={form.labels} onChange={e => setForm({ ...form, labels: e.target.value })} />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" isLoading={updateSale.isPending}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreditSettlement() {
  const { toast } = useToast();
  const { data: receivables = [], isLoading } = useReceivables('OPEN');
  const recordPayment = useRecordReceivablePayment();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Credit Settlement" 
        description="Receive payments for open credit receivables."
      />

      {receivables.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground bg-card rounded-xl border border-dashed">
          No open receivables.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {receivables.map((r: any) => (
            <ReceivableRow key={r.id} receivable={r} onPaid={() => toast({ title: "Payment recorded" })} isSubmitting={recordPayment.isPending} onSubmit={async (amount: number, method: 'CASH'|'CARD') => {
              try {
                await recordPayment.mutateAsync({ id: r.id, amount, method });
              } catch (err: any) {
                toast({ variant: "destructive", title: "Error", description: err.message });
              }
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReceivableRow({ receivable, onPaid, isSubmitting, onSubmit }: { receivable: any; onPaid: () => void; isSubmitting: boolean; onSubmit: (amount: number, method: 'CASH'|'CARD') => Promise<void> }) {
  const [amount, setAmount] = useState<number>(Number(receivable.outstanding));
  const [method, setMethod] = useState<'CASH'|'CARD'>('CASH');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;
    await onSubmit(amount, method);
    onPaid();
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-bold">{receivable.customer?.name}</div>
          <div className="text-sm text-muted-foreground">Receivable #{receivable.id}</div>
          <div className="text-xs text-muted-foreground">Created {receivable.createdAt ? format(new Date(receivable.createdAt), 'MMM d, h:mm a') : ''}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Original</div>
          <div className="font-bold">NPR {Number(receivable.amount).toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">Outstanding</div>
          <div className="text-emerald-600 font-bold">NPR {Number(receivable.outstanding).toLocaleString()}</div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input 
          type="number" 
          value={amount} 
          onChange={e => setAmount(Number(e.target.value))} 
          min={1}
          max={Number(receivable.outstanding)}
          placeholder="Amount"
          className="w-[140px]"
          required
        />
        <Select value={method} onValueChange={(v: any) => setMethod(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CASH">Cash</SelectItem>
            <SelectItem value="CARD">Card</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" isLoading={isSubmitting}>
          <CheckCircle className="w-4 h-4 mr-2" /> Receive
        </Button>
      </form>
    </div>
  );
}
import { useSales, useUpdateSale } from "@/hooks/use-sales";
