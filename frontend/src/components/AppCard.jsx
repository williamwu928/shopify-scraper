import { Star, Download, Shield, ExternalLink } from 'lucide-react';

export default function AppCard({ app }) {
  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

    return (
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        ))}
        {hasHalf && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
        ))}
        <span className="ml-1 text-sm text-gray-600">{rating}</span>
      </div>
    );
  };

  return (
    <a
      href={app.app_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-shopify-200"
    >
      <div className="flex gap-4">
        <img
          src={app.icon_url}
          alt={app.name}
          className="w-14 h-14 rounded-lg object-cover bg-gray-50 flex-shrink-0"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div
          className="w-14 h-14 rounded-lg bg-gradient-to-br from-shopify-400 to-shopify-600 items-center justify-center text-white font-bold text-lg hidden"
        >
          {app.name.charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 group-hover:text-shopify-600 transition-colors truncate">
              {app.name}
            </h3>
            <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {app.short_description}
          </p>

          <div className="flex items-center gap-3 mt-3">
            {app.rating && renderStars(parseFloat(app.rating))}
            {app.review_count > 0 && (
              <span className="text-sm text-gray-500">
                ({app.review_count.toLocaleString()} reviews)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {app.has_free_plan && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                <Download className="w-3 h-3" />
                Free Plan
              </span>
            )}
            {app.built_for_shopify && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-shopify-50 text-shopify-700 text-xs font-medium rounded-full">
                <Shield className="w-3 h-3" />
                Built for Shopify
              </span>
            )}
            {app.pricing_text && !app.has_free_plan && (
              <span className="text-xs text-gray-500">{app.pricing_text}</span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}
