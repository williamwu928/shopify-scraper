import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, ExternalLink, Download, Shield, ArrowLeft, Loader } from 'lucide-react';
import { getApp } from '../api';

export default function AppDetail() {
  const { handle } = useParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getApp(handle)
      .then((data) => {
        if (data.error) {
          setError('App not found');
        } else {
          setApp(data);
        }
      })
      .catch(() => setError('Failed to load app'))
      .finally(() => setLoading(false));
  }, [handle]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-8 h-8 animate-spin text-shopify-600" />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg mb-4">{error || 'App not found'}</p>
        <Link
          to="/apps"
          className="inline-flex items-center gap-2 text-shopify-600 hover:text-shopify-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Apps
        </Link>
      </div>
    );
  }

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

    return (
      <div className="flex items-center gap-1">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
        ))}
        {hasHalf && <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} className="w-5 h-5 text-gray-300" />
        ))}
        <span className="ml-2 text-lg font-medium text-gray-700">{rating}</span>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        to="/apps"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-shopify-600 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Apps
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-gray-100">
          <div className="flex gap-6">
            <img
              src={app.icon_url}
              alt={app.name}
              className="w-24 h-24 rounded-xl object-cover bg-gray-50"
            />
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <h1 className="text-3xl font-bold text-gray-900">{app.name}</h1>
                <a
                  href={app.app_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-shopify-600 text-white font-medium rounded-lg hover:bg-shopify-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Visit App
                </a>
              </div>
              
              {app.rating && (
                <div className="mt-3">
                  {renderStars(parseFloat(app.rating))}
                  <span className="ml-3 text-gray-500">
                    {app.review_count?.toLocaleString()} reviews
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-4">
                {app.has_free_plan && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full">
                    <Download className="w-4 h-4" />
                    Free Plan Available
                  </span>
                )}
                {app.built_for_shopify && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-shopify-50 text-shopify-700 text-sm font-medium rounded-full">
                    <Shield className="w-4 h-4" />
                    Built for Shopify
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8">
          {/* Description */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
            <p className="text-gray-600 leading-relaxed">
              {app.short_description || 'No description available.'}
            </p>
          </div>

          {/* Pricing */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Pricing</h2>
            <p className="text-gray-600">
              {app.pricing_text || 'Pricing information not available.'}
            </p>
          </div>

          {/* Categories */}
          {app.categories?.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Categories</h2>
              <div className="flex flex-wrap gap-2">
                {app.categories.map((cat) => (
                  <Link
                    key={cat}
                    to={`/apps?category=${cat.toLowerCase().replace(/\s+/g, '-')}`}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
