import React from 'react';

const ExampleCSVDownload: React.FC = () => {
    // CSV content with example data
    const generateCSVContent = () => {
        // Header row + 3 example rows
        return `word,translation
hello,hallo
goodbye,auf Wiedersehen
    `
    };

    const downloadExampleCSV = () => {
        const csvContent = generateCSVContent();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        // Create a link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'flashcards_template.csv');
        document.body.appendChild(link);
        link.click();

        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="mt-4 text-center">
            <p className="text-sm text-gray-500 mb-2">
                Not sure how to format your CSV? Download our example template:
            </p>
            <button
                onClick={downloadExampleCSV}
                type="button"
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Example CSV
            </button>
        </div>
    );
};

export default ExampleCSVDownload;
