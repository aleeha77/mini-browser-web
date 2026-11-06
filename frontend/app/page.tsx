'use client';

import React, { useState, useEffect, useRef } from 'react';
import { fetchSite, recordVisit } from '@/lib/api';

export default function BrowserPage() {
  // Browser state
  const [addressInput, setAddressInput] = useState('tidepool.zz');
  const [currentAddress, setCurrentAddress] = useState('tidepool.zz');
  const [siteData, setSiteData] = useState<{ title: string; body: string; author: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hardcoded default user for now (Alice) matching your seeded database
  const [userId] = useState('65a1b2c3d4e5f67890123456'); // Will be tied to real user switcher in Phase 5

  // Navigation History Stack (for Phase 4 prep, basic state here)
  const [historyStack, setHistoryStack] = useState<string[]>(['tidepool.zz']);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Load initial page on mount
  useEffect(() => {
    loadPage('tidepool.zz', 'typed', false);
  }, []);

  // Function to load a site by address
  const loadPage = async (address: string, method: string = 'typed', updateStack: boolean = true) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSite(address);
      setSiteData(data);
      setCurrentAddress(address);
      setAddressInput(address);

      // Record visit to backend
      // await recordVisit(userId, address, method);

      if (updateStack) {
        const newStack = historyStack.slice(0, historyIndex + 1);
        newStack.push(address);
        setHistoryStack(newStack);
        setHistoryIndex(newStack.length - 1);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setSiteData(null);
      setCurrentAddress(address);
    } finally {
      setLoading(false);
    }
  };

  // Handle Address Bar Submit
  const handleGo = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressInput.trim()) {
      loadPage(addressInput.trim().toLowerCase(), 'typed');
    }
  };

  // Link Interception inside iframe via postMessage listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NAVIGATE') {
        const targetAddress = event.data.address;
        loadPage(targetAddress, 'link');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [historyStack, historyIndex]);

  // Generate HTML payload for iframe with click interceptor script injected
  const getIframeContent = () => {
    if (!siteData) return '';
    
    // Inject a tiny script to intercept anchor clicks and send them to the parent window
    const interceptorScript = `
      <script>
        document.addEventListener('click', function(e) {
          const anchor = e.target.closest('a');
          if (anchor && anchor.getAttribute('href')) {
            e.preventDefault();
            const href = anchor.getAttribute('href');
            window.parent.postMessage({ type: 'NAVIGATE', address: href }, '*');
          }
        });
      </script>
    `;
    return `<html><head><style>body { font-family: sans-serif; padding: 20px; color: #333; }</style></head><body>${siteData.body}${interceptorScript}</body></html>`;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 p-4">
      {/* Browser Window Frame */}
      <div className="flex flex-col flex-1 bg-gray-800 rounded-lg shadow-2xl overflow-hidden border border-gray-700">
        
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-3 bg-gray-900 border-b border-gray-700">
          {/* Back / Forward Buttons */}
          <div className="flex gap-1">
            <button 
              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm disabled:opacity-40"
              disabled={historyIndex <= 0}
              onClick={() => {
                const newIdx = historyIndex - 1;
                setHistoryIndex(newIdx);
                loadPage(historyStack[newIdx], 'back', false);
              }}
            >
              ←
            </button>
            <button 
              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm disabled:opacity-40"
              disabled={historyIndex >= historyStack.length - 1}
              onClick={() => {
                const newIdx = historyIndex + 1;
                setHistoryIndex(newIdx);
                loadPage(historyStack[newIdx], 'forward', false);
              }}
            >
              →
            </button>
          </div>

          {/* Address Bar */}
          <form onSubmit={handleGo} className="flex-1 flex gap-2">
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Enter address (e.g. tidepool.zz)"
              className="flex-1 px-4 py-1.5 bg-gray-950 border border-gray-700 rounded text-sm focus:outline-none focus:border-blue-500"
            />
            <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium">
              Go
            </button>
          </form>
        </div>

        {/* Viewport (Browser Canvas) */}
        <div className="flex-1 bg-white relative overflow-hidden flex flex-col">
          {loading && (
            <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center text-white z-10">
              Loading {currentAddress}...
            </div>
          )}

          {error ? (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-800 p-8 text-center">
              <h1 className="text-4xl font-bold mb-2">404</h1>
              <p className="text-lg text-gray-600 mb-4">{error}</p>
              <p className="text-sm text-gray-500">The address you typed doesn't exist on the small web.</p>
            </div>
          ) : (
            siteData && (
              <iframe
                srcDoc={getIframeContent()}
                sandbox="allow-scripts"
                className="w-full h-full border-0 bg-white"
                title={siteData.title}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}