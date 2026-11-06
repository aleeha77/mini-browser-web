'use client';

import React, { useState, useEffect } from 'react';
import { fetchSite, recordVisit, fetchHistory, searchSites, publishSite } from '@/lib/api';

interface VisitItem {
  _id: string;
  address: string;
  timestamp: string;
  navigationMethod: string;
}

interface SearchResult {
  address: string;
  title: string;
  author: string;
}

export default function BrowserPage() {
  const [addressInput, setAddressInput] = useState('tidepool.zz');
  const [currentAddress, setCurrentAddress] = useState('tidepool.zz');
  const [siteData, setSiteData] = useState<{ title: string; body: string; author: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User Switcher State (Pre-seeded users)
  const [userId, setUserId] = useState('65a1b2c3d4e5f67890123456');
  const [userName, setUserName] = useState('Alice');

  // Navigation History Stack
  const [historyStack, setHistoryStack] = useState<string[]>(['tidepool.zz']);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Database Visit History for Sidebar
  const [dbHistory, setDbHistory] = useState<VisitItem[]>([]);

  // Search Modal State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Publish Modal State
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [publishError, setPublishError] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    loadPage('tidepool.zz', 'typed', false);
    loadUserHistory(userId);
  }, [userId]);

  const loadUserHistory = async (targetUserId: string) => {
    try {
      const historyData = await fetchHistory(targetUserId);
      setDbHistory(historyData);
    } catch (err) {
      console.error('Failed to load history sidebar', err);
    }
  };

  const loadPage = async (address: string, method: string = 'typed', updateStack: boolean = true) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSite(address);
      setSiteData(data);
      setCurrentAddress(address);
      setAddressInput(address);

      await recordVisit(userId, address, method);
      await loadUserHistory(userId);

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

  const handleGo = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressInput.trim()) {
      loadPage(addressInput.trim().toLowerCase(), 'typed', true);
    }
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      loadPage(historyStack[newIdx], 'back', false);
    }
  };

  const handleForward = () => {
    if (historyIndex < historyStack.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      loadPage(historyStack[newIdx], 'forward', false);
    }
  };

  // Search handler
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const results = await searchSites(searchQuery.trim());
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed', err);
    }
  };

  // Publish handler
  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishError(null);
    try {
      await publishSite({
        address: newAddress.trim().toLowerCase(),
        title: newTitle.trim(),
        body: newBody,
        author: userName,
      });
      setIsPublishOpen(false);
      setNewAddress('');
      setNewTitle('');
      setNewBody('');
      loadPage(newAddress.trim().toLowerCase(), 'published', true);
    } catch (err: any) {
      setPublishError(err.message || 'Failed to publish site.');
    }
  };

  // Listen for iframe link clicks
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NAVIGATE') {
        loadPage(event.data.address, 'link', true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [historyStack, historyIndex, userId]);

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
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 p-4 gap-4">
      
      {/* Top Header & User Switcher / Action Bar */}
      <div className="flex justify-between items-center bg-gray-800 px-4 py-2.5 rounded-lg border border-gray-700 shadow">
        <div className="flex items-center gap-3">
          <span className="font-bold tracking-wider text-blue-400">NETMIRROR</span>
          <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">Small Web Browser</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition"
          >
            🔍 Search Web
          </button>
          <button
            onClick={() => setIsPublishOpen(true)}
            className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-xs font-medium transition"
          >
            + Publish Site
          </button>
          
          <div className="flex items-center gap-2 border-l border-gray-700 pl-3">
            <span className="text-xs text-gray-400">Browsing as:</span>
            <select
              value={userId}
              onChange={(e) => {
                const val = e.target.value;
                setUserId(val);
                setUserName(val === '65a1b2c3d4e5f67890123456' ? 'Alice' : 'Bob');
              }}
              className="bg-gray-900 border border-gray-700 text-xs rounded px-2 py-1 focus:outline-none focus:border-blue-500"
            >
              <option value="65a1b2c3d4e5f67890123456">Alice (Active Explorer)</option>
              <option value="65a1b2c3d4e5f67890123457">Bob (Frequent Reader)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        
        {/* Browser Window */}
        <div className="flex flex-col flex-1 bg-gray-800 rounded-lg shadow-2xl overflow-hidden border border-gray-700">
          
          {/* Toolbar */}
          <div className="flex items-center gap-2 p-3 bg-gray-900 border-b border-gray-700">
            <div className="flex gap-1">
              <button 
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm disabled:opacity-40 transition"
                disabled={historyIndex <= 0}
                onClick={handleBack}
              >
                ←
              </button>
              <button 
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm disabled:opacity-40 transition"
                disabled={historyIndex >= historyStack.length - 1}
                onClick={handleForward}
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

        {/* History Sidebar */}
        <div className="w-80 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 flex flex-col overflow-hidden">
          <div className="p-3 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
            <h2 className="font-semibold text-sm tracking-wide uppercase text-gray-300">{userName}'s History</h2>
            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-400">{dbHistory.length}</span>
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

      {/* SEARCH MODAL */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Search the Small Web</h3>
              <button onClick={() => setIsSearchOpen(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
            </div>
            <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search page contents or titles..."
                className="flex-1 px-4 py-2 bg-gray-950 border border-gray-700 rounded text-sm focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium">Search</button>
            </form>
            <div className="flex-1 overflow-y-auto space-y-2">
              {searchResults.map((res: any) => (
                <div
                  key={res.address}
                  onClick={() => {
                    setIsSearchOpen(false);
                    loadPage(res.address, 'search-jump', true);
                  }}
                  className="p-3 bg-gray-900 hover:bg-gray-700 border border-gray-700 rounded cursor-pointer transition"
                >
                  <div className="flex justify-between">
                    <span className="font-semibold text-blue-400 text-sm">{res.title}</span>
                    <span className="text-xs text-gray-400 font-mono">{res.address}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Author: {res.author}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PUBLISH MODAL */}
      {isPublishOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg max-w-xl w-full p-6 shadow-2xl flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Publish a New Site</h3>
              <button onClick={() => setIsPublishOpen(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
            </div>
            {publishError && <div className="mb-4 p-2 bg-red-900/50 border border-red-700 rounded text-xs text-red-200">{publishError}</div>}
            <form onSubmit={handlePublishSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Address (e.g. myblog.zz)</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="myblog.zz"
                  required
                  className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Page Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="My First Small Web Page"
                  required
                  className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">HTML Body Content (with links like &lt;a href=&quot;tidepool.zz&quot;&gt;)</label>
                <textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="<h1>Hello World</h1><p>Welcome to my corner of the small web.</p>"
                  required
                  rows={5}
                  className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded text-sm font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsPublishOpen(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-sm font-medium">Publish Site</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}