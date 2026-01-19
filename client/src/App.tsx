import * as React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import SalesEntry from "@/pages/sales";
import MenuItems from "@/pages/menu";
import StockManagement from "@/pages/stock";
import ExpensesPage from "@/pages/expenses";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/sales" component={SalesEntry} />
      <Route path="/menu" component={MenuItems} />
      <Route path="/stock" component={StockManagement} />
      <Route path="/expenses" component={ExpensesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

export default App;
