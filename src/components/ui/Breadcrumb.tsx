'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Breadcrumb({ siteUrl, siteName }: { siteUrl: string; siteName: string }) {
  const pathname = usePathname();
  
  if (!pathname || pathname === '/') return null;
  
  const pathParts = pathname.split('/').filter(Boolean);
  const breadcrumbItems = pathParts.map((part, index) => {
    const url = `/${pathParts.slice(0, index + 1).join('/')}`;
    const name = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
    return { name, url };
  });

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": siteUrl
      },
      ...breadcrumbItems.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 2,
        "name": item.name,
        "item": `${siteUrl}${item.url}`
      }))
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <nav aria-label="Breadcrumb" className="w-full flex items-center text-sm text-gray-500 overflow-x-auto whitespace-nowrap py-2">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/" className="hover:text-gray-900 transition-colors">
              Home
            </Link>
          </li>
          {breadcrumbItems.map((item, index) => (
            <React.Fragment key={item.url}>
              <li className="select-none text-gray-400">/</li>
              <li>
                <Link 
                  href={item.url} 
                  className={`${index === breadcrumbItems.length - 1 ? 'font-medium text-gray-900 pointer-events-none' : 'hover:text-gray-900 transition-colors'}`}
                  aria-current={index === breadcrumbItems.length - 1 ? 'page' : undefined}
                >
                  {item.name}
                </Link>
              </li>
            </React.Fragment>
          ))}
        </ol>
      </nav>
    </>
  );
}
