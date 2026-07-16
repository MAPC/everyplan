'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import SearchBar from './SearchBar';

const NAV_LINKS = [
  { href: '/map', label: 'Map' },
  { href: '/plans/types', label: 'Plan Types' },
  { href: '/plans', label: 'Plans' },
  { href: '/recommendations', label: 'Recommendations' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/about', label: 'About' },
] as const;

function EveryPlanLogo() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="flex-shrink-0"
    >
      {/* Five overlapping colored rectangles representing plan layers */}
      <rect x="2" y="4" width="12" height="16" rx="1.5" fill="#2E9E78" opacity="0.85" />
      <rect x="5" y="6" width="12" height="16" rx="1.5" fill="#2E75B6" opacity="0.8" />
      <rect x="8" y="3" width="12" height="16" rx="1.5" fill="#D85A30" opacity="0.75" />
      <rect x="11" y="5" width="12" height="16" rx="1.5" fill="#BA7517" opacity="0.8" />
      <rect x="14" y="7" width="12" height="16" rx="1.5" fill="#534AB7" opacity="0.75" />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = useCallback(
    (query: string) => {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setMobileMenuOpen(false);
    },
    [router]
  );

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/plans') return pathname === '/plans' || (pathname.startsWith('/plans/') && !pathname.startsWith('/plans/types'));
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 flex-shrink-0 group"
          >
            <EveryPlanLogo />
            <span className="text-lg font-bold text-navy group-hover:text-blue transition-colors">
              EveryPlan
            </span>
          </Link>

          {/* Desktop: search + nav links */}
          <div className="hidden md:flex items-center gap-6 flex-1 justify-end">
            {/* Compact search */}
            <div className="w-48 lg:w-56">
              <SearchBar onSearch={handleSearch} compact />
            </div>

            {/* Nav links */}
            <div className="flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isActive(link.href)
                      ? 'text-blue bg-blue/5'
                      : 'text-ep-secondary hover:text-navy hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden p-2 text-ep-secondary hover:text-navy rounded-md"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-14 bg-black/20 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div className="fixed top-14 right-0 bottom-0 w-72 bg-white border-l border-gray-200 shadow-xl z-50 md:hidden overflow-y-auto">
            <div className="p-4">
              {/* Mobile search */}
              <div className="mb-4">
                <SearchBar
                  onSearch={handleSearch}
                  placeholder="Search..."
                  compact
                />
              </div>

              {/* Mobile nav links */}
              <div className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                      isActive(link.href)
                        ? 'text-blue bg-blue/5'
                        : 'text-ep-secondary hover:text-navy hover:bg-gray-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
