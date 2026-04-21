import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Store } from 'lucide-react';
import Home from './pages/Home';
import AppList from './pages/AppList';
import AppDetail from './pages/AppDetail';

function Navbar() {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-shopify-500 to-shopify-700 rounded-lg flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Shopify Apps</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              to="/apps"
              className="text-gray-600 hover:text-shopify-600 font-medium transition-colors"
            >
              Browse Apps
            </Link>
            <a
              href="https://apps.shopify.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-shopify-600 font-medium transition-colors"
            >
              App Store
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Store className="w-5 h-5" />
            <span>Shopify Apps Explorer</span>
          </div>
          <p className="text-gray-400 text-sm">
            Data sourced from Shopify App Store
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/apps" element={<AppList />} />
            <Route path="/apps/:handle" element={<AppDetail />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
