'use client';

import React, { useState, useEffect } from 'react';
import { fetchSite, recordVisit, fetchHistory } from '@/lib/api';

interface VisitItem {
  _id: string;
  address: string;
  timestamp: string;
  navigationMethod: string;
}

export default function BrowserPage() {
  const [addressInput, setAddressInput] = useState('tidepool.zz');
  const [currentAddress, setCurrentAddress] = useState('tidepool.zz');
  const [siteData, setSiteData] = useState<{ title: string; body: string; author: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hardcoded default user (Alice) matching seeded MongoDB data
  const [userId] = useState('65a1b2c3d4e5f67890123456');

  // Navigation History Stack Management (In-memory pointer stack)
  const [historyStack, setHistoryStack] = useState<string[]>(['tidepool.zz']);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Database Visit History for the Sidebar
  const [dbHistory, setDbHistory] = useState<VisitItem[]>([]);

  // Load initial page and history
  useEffect(() => {
    loadPage('tidepool.zz', 'typed', false);
    loadUserHistory();
  }, []);

  const loadUserHistory = async () => {
    try {
      const historyData = await fetchHistory(userId);
      setDbHistory(historyData);
    } catch (err) {
      console.error('Failed to load history sidebar', err);
    }
  };

  // Core navigation function
  const loadPage = async (address: string, method: string = 'typed', updateStack: boolean = true) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSite(address);
      setSiteData(data);
      setCurrentAddress(address);
      setAddressInput(address);

      // Record visit to MongoDB Atlas backend
      await recordVisit(userId, address, method);
      await loadUserHistory(); // Refresh sidebar history

      // Update in-memory history stack for Back/Forward navigation
      if (updateStack) {
        // Truncate any "forward" history if navigating from the middle of the stack
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

  // Address bar submission
  const handleGo = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressInput.trim()) {
      loadPage(addressInput.trim().toLowerCase(), 'typed', true);
    }
  };

  // Back button handler
  const handleBack = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      loadPage(historyStack[newIdx], 'back', false);
    }
  };

  // Forward button handler
  const handleForward = () => {
    if (historyIndex < historyStack.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      loadPage(historyStack[newIdx], 'forward', false);
    }
  };

  // Listen for iframe link clicks via postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NAVIGATE') {
        loadPage(event.data.address, 'link', true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [historyStack, historyIndex]);

  // Inject link interceptor into HTML string before rendering in sandboxed iframe
  const getIframeContent = () => {
    if (!siteData) return '';
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
    <div className="flex h-screen bg-gray-900 text-gray-100 p-4 gap-4">
      
      {/* Main Browser Window */}
      <div className="flex flex-col flex-1 bg-gray-800 rounded-lg shadow-2xl overflow-hidden border border-gray-700">
        
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-3 bg-gray-900 border-b border-gray-700">
          <div className="flex gap-1">
            <button 
              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm disabled:opacity-40 transition"
              disabled={historyIndex <= 0}
              onClick={handleBack}
              title="Go Back"
            >
              ←
            </button>
            <button 
              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm disabled:opacity-40 transition"
              disabled={historyIndex >= historyStack.length - 1}
              onClick={handleForward}
              title="Go Forward"
            >
              →
            </button>
          </div>

          <form onSubmit={handleGo} className="flex-1 flex gap-2">
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Enter address (e.g. tidepool.zz)"
              className="flex-1 px-4 py-1.5 bg-gray-950 border border-gray-700 rounded text-sm focus:outline-none focus:border-blue-500"
            />
            <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition">
              Go
            </button>
          </form>
        </div>

        {/* Viewport */}
        <div className="flex-1 bg-white relative overflow-hidden flex flex-col">
          {loading && (
            <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center text-white z-10 font-medium">
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

      {/* History Sidebar Panel */}
      <div className="w-80 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 flex flex-col overflow-hidden">
        <div className="p-3 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
          <h2 className="font-semibold text-sm tracking-wide uppercase text-gray-300">Browsing History</h2>
          <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-400">{dbHistory.length} visits</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {dbHistory.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No history recorded yet.</p>
          ) : (
            dbHistory.map((visit) => (
              <div 
                key={visit._id}
                onClick={() => loadPage(visit.address, 'history-jump', true)}
                className="p-2.5 bg-gray-900/60 hover:bg-gray-700/60 border border-gray-700/50 rounded cursor-pointer transition group"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-blue-400 group-hover:underline text-sm truncate max-w-[180px]">
                    {visit.address}
                  </span>
                  <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                    {visit.navigationMethod}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500">
                  {new Date(visit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}