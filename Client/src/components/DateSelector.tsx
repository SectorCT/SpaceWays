import { useState, useEffect } from 'react';
import './DateSelector.css';

interface DateSelectorProps {
  currentDate: Date;
  onSetDate: (date: Date) => void;
  onClose: () => void;
}

export function DateSelector({ currentDate, onSetDate, onClose }: DateSelectorProps) {
  // Create a new date object to avoid modifying the original
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(currentDate));
  
  // Initialize the form values from the current date
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [month, setMonth] = useState<number>(currentDate.getMonth() + 1); // JavaScript months are 0-indexed
  const [day, setDay] = useState<number>(currentDate.getDate());
  const [hour, setHour] = useState<number>(currentDate.getHours());
  const [minute, setMinute] = useState<number>(currentDate.getMinutes());
  const [second, setSecond] = useState<number>(currentDate.getSeconds());
  
  // Update the selectedDate whenever any of the date components change
  useEffect(() => {
    const newDate = new Date(year, month - 1, day, hour, minute, second);
    setSelectedDate(newDate);
  }, [year, month, day, hour, minute, second]);
  
  // Handle the form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSetDate(selectedDate);
  };
  
  // Generate options for days based on selected month and year
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };
  
  const daysInCurrentMonth = getDaysInMonth(year, month);
  
  // Predefined date options for quick selection
  const quickDates = [
    { label: 'Today', date: new Date() },
    { label: '1 Week Ago', date: new Date(new Date().setDate(new Date().getDate() - 7)) },
    { label: '1 Month Ago', date: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
    { label: '1 Year Ago', date: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) },
    { label: 'Next Week', date: new Date(new Date().setDate(new Date().getDate() + 7)) },
    { label: 'Next Month', date: new Date(new Date().setMonth(new Date().getMonth() + 1)) },
    { label: 'Next Year', date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) },
  ];
  
  // Set date from a quick option
  const handleQuickSelect = (date: Date) => {
    setYear(date.getFullYear());
    setMonth(date.getMonth() + 1);
    setDay(date.getDate());
    setHour(date.getHours());
    setMinute(date.getMinutes());
    setSecond(date.getSeconds());
  };
  
  return (
    <div className="date-selector">
      <div className="date-selector-header">
        <h3>Set Simulation Date & Time</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="date-selector-body">
          <div className="form-row">
            <div className="form-group">
              <label>Year</label>
              <input 
                type="number" 
                value={year} 
                onChange={(e) => setYear(parseInt(e.target.value))}
                min="1900"
                max="2100"
              />
            </div>
            
            <div className="form-group">
              <label>Month</label>
              <select 
                value={month} 
                onChange={(e) => setMonth(parseInt(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Day</label>
              <select 
                value={day} 
                onChange={(e) => setDay(parseInt(e.target.value))}
              >
                {Array.from({ length: daysInCurrentMonth }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Hour</label>
              <select 
                value={hour} 
                onChange={(e) => setHour(parseInt(e.target.value))}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Minute</label>
              <select 
                value={minute} 
                onChange={(e) => setMinute(parseInt(e.target.value))}
              >
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Second</label>
              <select 
                value={second} 
                onChange={(e) => setSecond(parseInt(e.target.value))}
              >
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="date-preview">
            Selected: {selectedDate.toLocaleString()}
          </div>
          
          <div className="quick-dates">
            <h4>Quick Options</h4>
            <div className="quick-dates-grid">
              {quickDates.map((option, index) => (
                <button 
                  key={index}
                  type="button"
                  className="quick-date-button"
                  onClick={() => handleQuickSelect(option.date)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button type="button" className="cancel-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="apply-button">Apply Date</button>
        </div>
      </form>
    </div>
  );
} 
