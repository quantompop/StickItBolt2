import React, { useState } from 'react';
import { RecurrencePattern } from '../types';
import { X, Check } from 'lucide-react';

interface RecurrenceSelectorProps {
  value: RecurrencePattern | undefined;
  onChange: (pattern: RecurrencePattern | undefined) => void;
  onClose: () => void;
}

const RecurrenceSelector: React.FC<RecurrenceSelectorProps> = ({ value, onChange, onClose }) => {
  const [pattern, setPattern] = useState<RecurrencePattern>(
    value || { frequency: 'daily', interval: 1 }
  );

  const [hasEndDate, setHasEndDate] = useState<boolean>(!!value?.endDate);
  const [hasOccurrences, setHasOccurrences] = useState<boolean>(!!value?.occurrences);

  const handleFrequencyChange = (frequency: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    setPattern({ ...pattern, frequency });
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const interval = parseInt(e.target.value, 10) || 1;
    setPattern({ ...pattern, interval: Math.max(1, interval) });
  };

  const handleDayOfWeekToggle = (day: number) => {
    const currentDays = pattern.daysOfWeek || [];
    
    if (currentDays.includes(day)) {
      setPattern({
        ...pattern,
        daysOfWeek: currentDays.filter(d => d !== day)
      });
    } else {
      setPattern({
        ...pattern,
        daysOfWeek: [...currentDays, day]
      });
    }
  };

  const handleDayOfMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const day = parseInt(e.target.value, 10);
    setPattern({ ...pattern, dayOfMonth: day });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPattern({ ...pattern, endDate: e.target.value });
  };

  const handleOccurrencesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const occurrences = parseInt(e.target.value, 10) || 1;
    setPattern({ ...pattern, occurrences: Math.max(1, occurrences) });
  };

  const handleSave = () => {
    // Clean up the pattern before saving
    const finalPattern = { ...pattern };
    
    // Remove end properties if not using them
    if (!hasEndDate) delete finalPattern.endDate;
    if (!hasOccurrences) delete finalPattern.occurrences;
    
    // Remove days of week if not weekly
    if (pattern.frequency !== 'weekly') {
      delete finalPattern.daysOfWeek;
    } else if (!finalPattern.daysOfWeek || finalPattern.daysOfWeek.length === 0) {
      // Default to today if no days selected for weekly
      finalPattern.daysOfWeek = [new Date().getDay()];
    }
    
    // Remove day of month if not monthly
    if (pattern.frequency !== 'monthly') {
      delete finalPattern.dayOfMonth;
    } else if (!finalPattern.dayOfMonth) {
      // Default to today's date if no day selected for monthly
      finalPattern.dayOfMonth = new Date().getDate();
    }
    
    onChange(finalPattern);
    onClose();
  };

  const handleClear = () => {
    onChange(undefined);
    onClose();
  };

  // Days of week labels
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-72">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Task Recurrence</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Frequency Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Repeat</label>
          <div className="grid grid-cols-4 gap-1">
            <button
              className={`p-2 rounded text-sm ${
                pattern.frequency === 'daily'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => handleFrequencyChange('daily')}
              type="button"
            >
              Daily
            </button>
            
            <button
              className={`p-2 rounded text-sm ${
                pattern.frequency === 'weekly'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => handleFrequencyChange('weekly')}
              type="button"
            >
              Weekly
            </button>
            
            <button
              className={`p-2 rounded text-sm ${
                pattern.frequency === 'monthly'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => handleFrequencyChange('monthly')}
              type="button"
            >
              Monthly
            </button>
            
            <button
              className={`p-2 rounded text-sm ${
                pattern.frequency === 'yearly'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => handleFrequencyChange('yearly')}
              type="button"
            >
              Yearly
            </button>
          </div>
        </div>

        {/* Interval */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {pattern.frequency === 'daily' && 'Every X days:'}
            {pattern.frequency === 'weekly' && 'Every X weeks:'}
            {pattern.frequency === 'monthly' && 'Every X months:'}
            {pattern.frequency === 'yearly' && 'Every X years:'}
          </label>
          <input
            type="number"
            min="1"
            value={pattern.interval}
            onChange={handleIntervalChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Days of week (for weekly) */}
        {pattern.frequency === 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              On these days:
            </label>
            <div className="grid grid-cols-7 gap-1">
              {daysOfWeek.map((day, index) => (
                <button
                  key={day}
                  type="button"
                  className={`p-1 rounded-full text-xs ${
                    pattern.daysOfWeek?.includes(index)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => handleDayOfWeekToggle(index)}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Day of month (for monthly) */}
        {pattern.frequency === 'monthly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Day of month:
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={pattern.dayOfMonth || ''}
              onChange={handleDayOfMonthChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* End options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="radio"
                id="never"
                checked={!hasEndDate && !hasOccurrences}
                onChange={() => {
                  setHasEndDate(false);
                  setHasOccurrences(false);
                }}
                className="mr-2"
              />
              <label htmlFor="never" className="text-sm">Never</label>
            </div>
            
            <div className="flex items-center">
              <input
                type="radio"
                id="endDate"
                checked={hasEndDate}
                onChange={() => {
                  setHasEndDate(true);
                  setHasOccurrences(false);
                }}
                className="mr-2"
              />
              <label htmlFor="endDate" className="text-sm">On date:</label>
              {hasEndDate && (
                <input
                  type="date"
                  value={pattern.endDate || ''}
                  onChange={handleEndDateChange}
                  className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              )}
            </div>
            
            <div className="flex items-center">
              <input
                type="radio"
                id="occurrences"
                checked={hasOccurrences}
                onChange={() => {
                  setHasEndDate(false);
                  setHasOccurrences(true);
                }}
                className="mr-2"
              />
              <label htmlFor="occurrences" className="text-sm">After:</label>
              {hasOccurrences && (
                <div className="flex items-center ml-2">
                  <input
                    type="number"
                    min="1"
                    value={pattern.occurrences || 1}
                    onChange={handleOccurrencesChange}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="ml-2 text-sm">occurrences</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-2">
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded flex items-center text-sm"
          >
            <X size={14} className="mr-1" />
            No Recurrence
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center text-sm"
          >
            <Check size={14} className="mr-1" />
            Set Recurrence
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecurrenceSelector;