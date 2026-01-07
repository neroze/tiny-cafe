import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  description?: string;
  target?: number;
  current?: number;
  colorClass?: string;
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp, 
  description,
  target,
  current,
  colorClass = "text-primary"
}: StatsCardProps) {
  
  const progress = target && current ? Math.min((current / target) * 100, 100) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-6 shadow-sm border border-border hover:shadow-lg transition-all duration-300 group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl bg-secondary/50 ${colorClass} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trendUp ? "text-green-600" : "text-red-500"}`}>
            {trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {trend}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <h3 className="text-3xl font-display font-bold text-foreground tracking-tight">{value}</h3>
      </div>

      {target !== undefined && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full ${progress >= 100 ? 'bg-green-500' : 'bg-primary'}`} 
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Target: {description}</p>
        </div>
      )}
    </motion.div>
  );
}
