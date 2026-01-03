'use client';

import { useState, useRef } from 'react';
import { IBKRParser } from '@/utils/ibkr';
import { Trade } from '@/utils/store';

interface IBKRImportProps {
    onImport: (trades: Trade[]) => void;
}

export default function IBKRImport({ onImport }: IBKRImportProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);

        try {
            const text = await file.text();
            const trades = IBKRParser.parseCSV(text);

            if (trades.length === 0) {
                setError('No trades found in the CSV file. Please ensure it is a valid IBKR Flex Query export containing a "Trades" section.');
            } else {
                onImport(trades);
            }
        } catch (err) {
            console.error('Import failed:', err);
            setError('Failed to parse the file. Please check the format.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-2">Import Interactive Brokers Trades</h3>
            <p className="text-sm text-gray-400 mb-4">
                Upload your IBKR Flex Query CSV file to import trades.
                Ensure the report includes the "Trades" section.
            </p>

            <div className="flex items-center gap-4">
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    ref={fileInputRef}
                    id="ibkr-file-upload"
                />
                <label
                    htmlFor="ibkr-file-upload"
                    className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${isUploading
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                >
                    {isUploading ? 'Parsing...' : 'Upload CSV'}
                </label>

                {error && (
                    <span className="text-red-400 text-sm">{error}</span>
                )}
            </div>
        </div>
    );
}
