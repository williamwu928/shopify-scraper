import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Store, TrendingUp, Shield, Gift, Search, Star } from 'lucide-react';
import { getStats, getCategories } from '../api';
import AppCard from '../components/AppCard';

export default function Home() {
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getCategories()])
      .then(([statsData, categoriesData]) => {
        setStats(statsData);
        setCategories(categoriesData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-shopify-600 border-t-transparent"></div>
      </div>
    );
  }

  const statCards = [
    { icon: Store, label: 'Total Apps', value: stats?.total_apps?.toLocaleString() || 0, color: 'bg-blue-500' },
    { icon: Gift, label: 'Free Plans', value: stats?.apps_with_free_plan?.toLocaleString() || 0, color: 'bg-green-500' },
    { icon: Shield, label: 'Built for Shopify', value: stats?.built_for_shopify?.toLocaleString() || 0, color: 'bg-shopify-600' },
    { icon: TrendingUp, label: 'Avg Rating', value: stats?.avg_rating?.toFixed(1) || '0', color: 'bg-yellow-500' },
  ];

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Discover the Best <span className="text-shopify-600">Shopify Apps</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Browse through {stats?.total_apps?.toLocaleString() || 0}+ apps from the Shopify App Store, 
          find the perfect tools for your store.
        </p>
        <div className="mt-6">
          <Link
            to="/apps"
            className="inline-flex items-center gap-2 px-6 py-3 bg-shopify-600 text-white font-medium rounded-lg hover:bg-shopify-700 transition-colors"
          >
            <Search className="w-5 h-5" />
            Browse All Apps
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center mb-4`}>
              <card.icon className="w-6 h-6 text-white" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{card.value}</div>
            <div className="text-sm text-gray-500">{card.label}</div>
          </div>
        ))}
      </section>

      {/* Categories */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              to={`/apps?category=${cat.slug}`}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-shopify-200 transition-all group"
            >
              <div className="text-lg font-semibold text-gray-900 group-hover:text-shopify-600 transition-colors mb-1">
                {cat.name}
              </div>
              <div className="text-sm text-gray-500">{cat.app_count} apps</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Top Rated */}
      {stats?.top_rated_apps?.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            <h2 className="text-2xl font-bold text-gray-900">Top Rated Apps</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {stats.top_rated_apps.map((app) => (
              <AppCard key={app.handle} app={app} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
