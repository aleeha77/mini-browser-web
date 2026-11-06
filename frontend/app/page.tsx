'use client';

import React, { useState, useEffect, useRef } from 'react';
import { fetchSite, recordVisit, fetchHistory, searchSites, publishSite, fetchUsers, User } from '@/lib/api';

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

interface PageEntry {
  address: string;
  scrollTop: number;
  siteData: { title: string; body: string; author: string } | null;
}

type NavigateFunction = (address: string, method: string, mode: 'new' | 'back' | 'forward' | 'replace', targetUserId?: string) => Promise<void>;

export default function BrowserPage() {
  const [addressInput, setAddressInput] = useState('tidepool.zz');
  const [currentAddress, setCurrentAddress] = useState('tidepool.zz');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visitWarning, setVisitWarning] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState('');
  const userName = users.find((user) => user._id === userId)?.name ?? '';

  // Entries retain the rendered page and viewport position for instant restoration.
  const [historyStack, setHistoryStack] = useState<PageEntry[]>([
    { address: 'tidepool.zz', scrollTop: 0, siteData: null },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyRef = useRef(historyStack);
  const historyIndexRef = useRef(0);
  const scrollPositionRef = useRef(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initialLoadRef = useRef(false);
  const navigateRef = useRef<NavigateFunction>(() => Promise.resolve());

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
  const currentEntry = historyStack[historyIndex];

  useEffect(() => {
    historyRef.current = historyStack;
    historyIndexRef.current = historyIndex;
  }, [historyStack, historyIndex]);

  const loadUserHistory = async (targetUserId: string) => {
    try {
      const historyData = await fetchHistory(targetUserId);
      setDbHistory(historyData);
    } catch (err) {
      console.error('Failed to load history sidebar', err);
    }
  };

  const updateEntryScroll = (scrollTop: number) => {
    scrollPositionRef.current = scrollTop;
    setHistoryStack((currentStack) => currentStack.map((entry, index) => (
      index === historyIndexRef.current ? { ...entry, scrollTop } : entry
    )));
  };

  const restoreScroll = (scrollTop: number) => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'RESTORE_SCROLL', scrollTop }, '*');
  };

  const navigate = async (
    address: string,
    method: string,
    mode: 'new' | 'back' | 'forward' | 'replace',
    targetUserId = userId,
  ) => {
    const normalizedAddress = address.trim().toLowerCase();
    const currentIndex = historyIndexRef.current;
    const currentStack = historyRef.current.map((historyEntry, index) => (
      index === currentIndex ? { ...historyEntry, scrollTop: scrollPositionRef.current } : historyEntry
    ));
    historyRef.current = currentStack;
    setLoading(true);
    setError(null);
    setVisitWarning(null);
    try {
      let entry: PageEntry;
      if (mode === 'back' || mode === 'forward') {
        entry = currentStack[currentIndex + (mode === 'back' ? -1 : 1)];
      } else {
        const data = await fetchSite(normalizedAddress);
        entry = { address: normalizedAddress, scrollTop: 0, siteData: data };
      }

      const nextIndex = mode === 'back'
        ? currentIndex - 1
        : mode === 'forward'
          ? currentIndex + 1
          : mode === 'replace'
            ? currentIndex
            : currentIndex + 1;
      const nextStack = mode === 'new'
        ? [...currentStack.slice(0, currentIndex + 1), entry]
        : mode === 'replace'
          ? currentStack.map((item, index) => index === currentIndex ? entry : item)
          : currentStack;

      setHistoryStack(nextStack);
      setHistoryIndex(nextIndex);
      historyRef.current = nextStack;
      historyIndexRef.current = nextIndex;
      scrollPositionRef.current = entry.scrollTop;
      setCurrentAddress(entry.address);
      setAddressInput(entry.address);
      setError(null);
      try {
        await recordVisit(targetUserId, entry.address, method);
        await loadUserHistory(targetUserId);
      } catch (visitError: unknown) {
        setVisitWarning(visitError instanceof Error ? visitError.message : 'Visit history could not be saved.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    fetchUsers()
      .then((availableUsers) => {
        setUsers(availableUsers);
        const firstUser = availableUsers[0];
        if (firstUser) {
          setUserId(firstUser._id);
          loadUserHistory(firstUser._id);
          if (!initialLoadRef.current) {
            initialLoadRef.current = true;
            navigateRef.current('tidepool.zz', 'typed', 'replace', firstUser._id);
          }
        }
      })
      .catch((err) => setError(err.message || 'Failed to load users.'));
  }, []);


  const handleGo = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressInput.trim()) {
      navigate(addressInput, 'typed', 'new');
    }
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      navigate(historyStack[historyIndex - 1].address, 'back', 'back');
    }
  };

  const handleForward = () => {
    if (historyIndex < historyStack.length - 1) {
      navigate(historyStack[historyIndex + 1].address, 'forward', 'forward');
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
      navigate(newAddress, 'published', 'new');
    } catch (err: unknown) {
      setPublishError(err instanceof Error ? err.message : 'Failed to publish site.');
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || !event.data || typeof event.data !== 'object') return;
      const message = event.data as { type?: unknown; address?: unknown; scrollTop?: unknown };
      if (message.type === 'FRAME_READY') {
        restoreScroll(historyRef.current[historyIndexRef.current]?.scrollTop ?? 0);
        return;
      }
      if (message.type === 'PAGE_SCROLL' && typeof message.scrollTop === 'number' && Number.isFinite(message.scrollTop)) {
        updateEntryScroll(Math.max(0, message.scrollTop));
      }
      if (message.type === 'NAVIGATE' && typeof message.address === 'string' && /^[a-z0-9-]+\.zz$/.test(message.address)) {
        navigateRef.current(message.address, 'link', 'new');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const getIframeContent = (siteData: PageEntry['siteData']) => {
    if (!siteData) return '';
    const safeBody = siteData.body.replace(/<\/script/gi, '<\\/script');
    const contentDocument = `<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'"><style>body { font-family: sans-serif; padding: 20px; color: #333; }</style></head><body>${safeBody}<script>
      document.addEventListener('click', function(e) {
        const anchor = e.target.closest('a');
        const href = anchor && anchor.getAttribute('href');
        if (href && /^[a-z0-9-]+\\.zz$/.test(href)) {
          e.preventDefault();
          parent.postMessage({ type: 'NAVIGATE', address: href }, '*');
        }
      });
      window.addEventListener('scroll', function() {
        parent.postMessage({ type: 'PAGE_SCROLL', scrollTop: window.scrollY }, '*');
      });
      window.addEventListener('message', function(event) {
        if (event.source === parent && event.data && event.data.type === 'RESTORE_SCROLL' &&
            typeof event.data.scrollTop === 'number' && Number.isFinite(event.data.scrollTop)) {
          window.scrollTo(0, event.data.scrollTop);
        }
      });
      parent.postMessage({ type: 'FRAME_READY' }, '*');
    </script></body></html>`;
    // Escape '<' so untrusted markup cannot terminate the outer bridge script.
    const escapedContent = JSON.stringify(contentDocument).replace(/</g, '\\u003c');
    return `<html><body style="margin:0"><iframe id="published-content" sandbox="allow-scripts" style="width:100%;height:100vh;border:0"></iframe><script>
      const contentFrame = document.getElementById('published-content');
      contentFrame.srcdoc = ${escapedContent};
      window.addEventListener('message', function(event) {
        if (event.source === contentFrame.contentWindow && event.data &&
          typeof event.data === 'object' &&
          (event.data.type === 'NAVIGATE' || event.data.type === 'PAGE_SCROLL' || event.data.type === 'FRAME_READY')) {
          parent.postMessage(event.data, '*');
        }
      });
      window.addEventListener('message', function(event) {
        if (event.source === parent && event.data && event.data.type === 'RESTORE_SCROLL' &&
            typeof event.data.scrollTop === 'number' && Number.isFinite(event.data.scrollTop)) {
          contentFrame.contentWindow.postMessage(event.data, '*');
        }
      });
    </script></body></html>`;
    /*
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
    */
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
                const nextUserId = e.target.value;
                setUserId(nextUserId);
                loadUserHistory(nextUserId);
              }}
              className="bg-gray-900 border border-gray-700 text-xs rounded px-2 py-1 focus:outline-none focus:border-blue-500"
            >
              {users.map((user) => <option key={user._id} value={user._id}>{user.name}</option>)}
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

            {visitWarning && !error && (
              <div className="absolute top-3 left-3 right-3 z-10 rounded border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-900 shadow">
                {visitWarning}
              </div>
            )}

            {error ? (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-800 p-8 text-center">
                <h1 className="text-4xl font-bold mb-2">404</h1>
                <p className="text-lg text-gray-600 mb-4">{error}</p>
                <p className="text-sm text-gray-500">The address you typed does not exist on the small web.</p>
              </div>
            ) : (
              currentEntry.siteData && (
                <iframe
                  ref={iframeRef}
                  srcDoc={getIframeContent(currentEntry.siteData)}
                  sandbox="allow-scripts"
                  className="w-full h-full border-0 bg-white"
                  title={currentEntry.siteData.title}
                  onLoad={() => restoreScroll(currentEntry.scrollTop)}
                />
              )
            )}
          </div>
        </div>

        {/* History Sidebar */}
        <div className="w-80 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 flex flex-col overflow-hidden">
          <div className="p-3 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
            <h2 className="font-semibold text-sm tracking-wide uppercase text-gray-300">{userName}&apos;s History</h2>
            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-400">{dbHistory.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {dbHistory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No history recorded yet.</p>
            ) : (
              dbHistory.map((visit) => (
                <div 
                  key={visit._id}
                  onClick={() => navigate(visit.address, 'history-jump', 'new')}
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
              {searchResults.map((res) => (
                <div
                  key={res.address}
                  onClick={() => {
                    setIsSearchOpen(false);
                    navigate(res.address, 'search-jump', 'new');
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