import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

function Options() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
            <h1 className="text-2xl font-semibold">Marginalia Options</h1>
            <p className="text-sm text-indigo-100 mt-1">Configure your note-taking experience</p>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">About Marginalia</h2>
              <p className="text-sm text-gray-600 mb-4">
                Marginalia is a context-aware note-taking extension that organizes your notes by URL scope. 
                Take notes that follow you as you browse, automatically organized by page, subdomain, domain, 
                or available everywhere.
              </p>
              <p className="text-sm text-gray-600">
                All notes sync automatically across your devices using Firebase.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Features</h2>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>Context-aware notes organized by page, subdomain, domain, or browser-wide</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>Real-time sync across all your devices</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>Offline support with automatic sync when reconnected</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>Clean side panel interface that follows your browsing</span>
                </li>
              </ul>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">How to Use</h2>
              <ol className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-indigo-600 font-bold">1.</span>
                  <span>Click the Marginalia icon in your browser toolbar to open the side panel</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-indigo-600 font-bold">2.</span>
                  <span>Switch between tabs to view notes at different scope levels</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-indigo-600 font-bold">3.</span>
                  <span>Type your note and press Enter to save (Shift+Enter for new line)</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-indigo-600 font-bold">4.</span>
                  <span>Use the three-dot menu on each note to edit or delete</span>
                </li>
              </ol>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Version</h2>
              <p className="text-sm text-gray-600">1.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>
);