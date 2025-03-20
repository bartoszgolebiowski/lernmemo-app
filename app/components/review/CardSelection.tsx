import React from 'react';

export const CardSelection = () => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-3">Cards Per Review</h3>
      <p className="text-sm text-gray-600 mb-4">
        Select how many flashcards will be included in your review session.
      </p>
      <div className="flex flex-wrap gap-3">
        {[10, 20, 30, 2137].map((value) => (
          <label key={`cards-${value}`} className="relative cursor-pointer" aria-label={`Select ${value} cards`}>
            <input
              type="radio"
              className="sr-only peer"
              name="cards"
              value={value}
              defaultChecked={value === 10}
            />
            <div className="w-16 h-16 flex items-center justify-center rounded-lg 
                          bg-white border-2 border-gray-200 text-gray-500
                          peer-checked:bg-green-50 peer-checked:border-green-500 peer-checked:text-green-700
                          hover:bg-gray-50 transition-all duration-200">
              <span className="text-lg font-medium">{value === 2137 ? "All" : value}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};
