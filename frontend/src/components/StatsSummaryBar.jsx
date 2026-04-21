import { Store, Gift, Shield, Star, TrendingUp, DollarSign, Award } from 'lucide-react';

export default function StatsSummaryBar({ stats }) {
  if (!stats) return null;

  const statCards = [
    { 
      icon: Store, 
      label: 'Total Apps', 
      value: stats.total_apps?.toLocaleString() || 0, 
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    { 
      icon: Gift, 
      label: 'Free Plans', 
      value: stats.apps_with_free_plan?.toLocaleString() || 0, 
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    { 
      icon: Shield, 
      label: 'Built for Shopify', 
      value: stats.built_for_shopify?.toLocaleString() || 0, 
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600'
    },
    { 
      icon: Star, 
      label: 'Avg Rating', 
      value: stats.avg_rating?.toFixed(2) || '0.00', 
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    },
    { 
      icon: TrendingUp, 
      label: 'Total Reviews', 
      value: stats.total_reviews?.toLocaleString() || 0, 
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    },
    { 
      icon: DollarSign, 
      label: 'Paid Apps', 
      value: (stats.total_apps - stats.apps_with_free_plan)?.toLocaleString() || 0, 
      color: 'bg-orange-500',
      textColor: 'text-orange-600'
    },
  ];

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg p-4 shadow-md">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className={`text-xl font-bold text-white`}>
                {stat.value}
              </div>
              <div className="text-xs text-slate-300">
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
