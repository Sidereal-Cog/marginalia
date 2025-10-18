import { useState } from 'react';
import { Plus, Trash2, Globe, Network, Server, FileText } from 'lucide-react';

export default function App() {
  const [tabValue, setTabValue] = useState(0);
  const [newNote, setNewNote] = useState('');
  
  const notes:any = {
    browser: ['Remember to check email daily', 'Shopping list ideas'],
    domain: ['Login credentials in password manager', 'API rate limits: 100/hour'],
    subdomain: ['Test account: test@example.com'],
    page: ['Fix button alignment on line 247', 'Update copy per feedback']
  };

  const tabs:any = [
    { label: 'Browser', scope: 'browser', icon: Globe },
    { label: 'Domain', scope: 'domain', icon: Network },
    { label: 'Subdomain', scope: 'subdomain', icon: Server },
    { label: 'Page', scope: 'page', icon: FileText }
  ];

  const getCurrentNotes = () => notes[tabs[tabValue].scope] || [];

  return (
    <div className="w-96 h-screen flex flex-col bg-gray-50">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 shadow-lg">
        <h1 className="text-xl font-semibold">Marginalia</h1>
        <p className="text-xs text-indigo-100 mt-1">Contextual notes</p>
      </div>
      
      <div className="flex bg-white border-b border-gray-200">
        {tabs.map((tab:any, idx:number) => {
          const Icon = tab.icon;
          return (
            <button
              key={idx}
              onClick={() => setTabValue(idx)}
              className={`flex-1 py-3 px-2 text-sm font-medium transition-colors flex flex-col items-center gap-1 ${
                tabValue === idx
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1">
              <p className="text-xs text-gray-500">
                Scope: {tabs[tabValue].label}
              </p>
              <p className="text-sm font-medium text-gray-700 mt-0.5">
                {tabs[tabValue].context}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          {getCurrentNotes().length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No notes yet. Add one above!
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {            getCurrentNotes().map((note: string, idx: number) => (
                <li key={idx} className="p-4 hover:bg-gray-50 flex items-start gap-3 group">
                  <p className="flex-1 text-sm text-gray-800">{note}</p>
                  <button className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-opacity">
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}