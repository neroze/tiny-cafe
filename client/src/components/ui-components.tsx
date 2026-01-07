import { Loader2 } from "lucide-react";
import React from "react";

export function Button({ 
  children, 
  isLoading, 
  variant = "primary", 
  className = "", 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  isLoading?: boolean, 
  variant?: "primary" | "secondary" | "outline" | "danger" 
}) {
  const baseStyles = "inline-flex items-center justify-center px-6 py-2.5 rounded-xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border-2 border-border bg-transparent hover:bg-secondary/50 text-foreground",
    danger: "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25 hover:bg-destructive/90"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
}

export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input 
      className={`
        w-full px-4 py-3 rounded-xl bg-background border border-border 
        text-foreground placeholder:text-muted-foreground/70
        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
        transition-all duration-200
        ${className}
      `}
      {...props}
    />
  );
}

export function Select({ className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select 
        className={`
          w-full px-4 py-3 rounded-xl bg-background border border-border 
          text-foreground appearance-none cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
          transition-all duration-200
          ${className}
        `}
        {...props}
      />
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </div>
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-card rounded-2xl border border-border shadow-sm p-6 ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string, description?: string, action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}
