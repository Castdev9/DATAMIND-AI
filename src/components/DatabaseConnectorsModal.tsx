import React, { useState } from 'react';
import { 
  Database, 
  Upload, 
  Layers, 
  FileSpreadsheet, 
  CheckCircle2, 
  X, 
  Sparkles,
  Server,
  Cloud,
  FileCode
} from 'lucide-react';
import Papa from 'papaparse';
import { Dataset } from '../types';
import { buildDataset } from '../data/sampleDatasets';

interface DatabaseConnectorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetCreated: (dataset: Dataset) => void;
}

export const DatabaseConnectorsModal: React.FC<DatabaseConnectorsModalProps> = ({
  isOpen,
  onClose,
  onDatasetCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'db' | 'sheets'>('upload');
  const [datasetName, setDatasetName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Database connector state
  const [dbType, setDbType] = useState<'postgresql' | 'mysql' | 'snowflake' | 'bigquery'>('postgresql');
  const [connHost, setConnHost] = useState('db.us-east-1.aws.snowflake.com');
  const [connDatabase, setConnDatabase] = useState('ANALYTICS_PROD');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const name = datasetName.trim() || file.name.replace(/\.[^/.]+$/, "");

    if (file.name.endsWith('.csv') || file.type.includes('csv')) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const ds = buildDataset(
              `ds-upload-${Date.now()}`,
              name,
              `Uploaded CSV dataset with ${results.data.length} records.`,
              'csv',
              results.data as Record<string, any>[]
            );
            onDatasetCreated(ds);
            setIsProcessing(false);
            onClose();
          }
        },
        error: (err) => {
          console.error("PapaParse error:", err);
          setIsProcessing(false);
        }
      });
    } else if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          const dataArr = Array.isArray(parsed) ? parsed : [parsed];
          const ds = buildDataset(
            `ds-upload-${Date.now()}`,
            name,
            `Uploaded JSON dataset.`,
            'json',
            dataArr
          );
          onDatasetCreated(ds);
          setIsProcessing(false);
          onClose();
        } catch (err) {
          console.error("JSON parse error:", err);
          setIsProcessing(false);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSimulateDBConnection = () => {
    setIsProcessing(true);
    setTimeout(() => {
      // Create a simulated connected dataset
      const simData = Array.from({ length: 50 }).map((_, i) => ({
        Order_ID: `ORD-${8000 + i}`,
        Transaction_Amount: Math.round(50 + Math.random() * 450),
        Status: i % 3 === 0 ? 'Completed' : i % 3 === 1 ? 'Pending' : 'Failed',
        User_Tier: i % 2 === 0 ? 'Enterprise' : 'SMB',
        Processing_Latency_ms: Math.round(20 + Math.random() * 120)
      }));

      const ds = buildDataset(
        `ds-db-${Date.now()}`,
        datasetName.trim() || `${dbType.toUpperCase()} Pipeline: ${connDatabase}`,
        `Live database sync from ${dbType} (${connHost}).`,
        dbType as any,
        simData
      );

      onDatasetCreated(ds);
      setIsProcessing(false);
      onClose();
    }, 800);
  };

  return (
    <div id="connector-modal-overlay" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl relative text-slate-100 animate-in fade-in zoom-in-95">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Connect Data Source or Pipeline</h3>
            <p className="text-xs text-slate-400">Upload CSV/JSON files or connect cloud databases & warehouses</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 mb-4">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'upload' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> CSV / JSON Upload
          </button>
          <button
            onClick={() => setActiveTab('db')}
            className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'db' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400'
            }`}
          >
            <Server className="w-3.5 h-3.5" /> Cloud SQL & Warehouse
          </button>
          <button
            onClick={() => setActiveTab('sheets')}
            className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'sheets' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Google Sheets
          </button>
        </div>

        {/* Dataset Name Input */}
        <div className="mb-4">
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Workspace Name (Optional)
          </label>
          <input
            type="text"
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            placeholder="e.g., Q3 Sales Pipeline, User Telemetry..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-3">
            <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-xl p-8 text-center bg-slate-950/50 transition-all">
              <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2 animate-bounce" />
              <div className="text-xs font-semibold text-white mb-1">Drag & Drop CSV or JSON files here</div>
              <p className="text-[11px] text-slate-500 mb-4">Supports PapaParse streaming parser up to 50MB</p>
              
              <label className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-all inline-block shadow">
                <span>Select File from Disk</span>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* DB Tab */}
        {activeTab === 'db' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'postgresql', name: 'PostgreSQL' },
                { id: 'snowflake', name: 'Snowflake' },
                { id: 'bigquery', name: 'Google BigQuery' },
                { id: 'mysql', name: 'MySQL' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setDbType(item.id as any)}
                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all ${
                    dbType === item.id
                      ? 'bg-indigo-600/30 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <span>{item.name}</span>
                  {dbType === item.id && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                </button>
              ))}
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Host / Connection String</label>
                <input
                  type="text"
                  value={connHost}
                  onChange={(e) => setConnHost(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Database Name / Schema</label>
                <input
                  type="text"
                  value={connDatabase}
                  onChange={(e) => setConnDatabase(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200"
                />
              </div>
            </div>

            <button
              onClick={handleSimulateDBConnection}
              disabled={isProcessing}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 rounded-lg transition-all mt-2"
            >
              {isProcessing ? 'Connecting & Syncing...' : 'Connect Warehouse Pipeline'}
            </button>
          </div>
        )}

        {/* Google Sheets Tab */}
        {activeTab === 'sheets' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Paste a public Google Sheets URL to import sheet data into DataMind AI.
            </p>
            <input
              type="text"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
            />
            <button
              onClick={handleSimulateDBConnection}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 rounded-lg transition-all"
            >
              Sync Google Sheet
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
