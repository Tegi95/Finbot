import React, { useState, useEffect } from 'react';
import { FaStar, FaTimes, FaPlus } from 'react-icons/fa';
import { stockDataService, StockQuoteData } from '../services/stockDataService';

interface Watchlists {
  [key: string]: string[];
}

interface WatchlistProps {
  watchlists: Watchlists;
  activeWatchlist: string;
  setActiveWatchlist: (name: string) => void;
  addWatchlist: (name: string) => void;
  stocks: string[];
  setSelectedStock: (stock: string) => void;
  selectedStock: string;
  removeFromWatchlist: (stock: string) => void;
  addToWatchlist: (stock: string) => void;
}

const Watchlist: React.FC<WatchlistProps> = ({
  watchlists,
  activeWatchlist,
  setActiveWatchlist,
  addWatchlist,
  stocks,
  setSelectedStock,
  selectedStock,
  removeFromWatchlist,
  addToWatchlist
}) => {
  const [newStock, setNewStock] = useState('');
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [showAddWatchlist, setShowAddWatchlist] = useState(false);
  const [stockQuotes, setStockQuotes] = useState<Map<string, StockQuoteData>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());

  // Einzelne Aktie laden
  const fetchStockQuote = async (symbol: string) => {
    if (loading.has(symbol)) return;

    setLoading(prev => new Set(prev).add(symbol));

    try {
      const quote = await stockDataService.getStockQuote(symbol);
      if (quote) {
        setStockQuotes(prev => new Map(prev).set(symbol, quote));
      }
    } finally {
      setLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(symbol);
        return newSet;
      });
    }
  };

  // Alle Aktien der Watchlist laden
  const fetchAllQuotes = async () => {
    if (stocks.length === 0) return;

    const quotes = await stockDataService.getMultipleQuotes(stocks);
    setStockQuotes(quotes);
  };

  // Lade Kurse wenn sich die Watchlist ändert
  useEffect(() => {
    if (stocks.length > 0) {
      fetchAllQuotes();
    }
  }, [stocks]);

  // Regelmäßige Updates alle 60 Sekunden
  useEffect(() => {
    const interval = setInterval(() => {
      if (stocks.length > 0) {
        fetchAllQuotes();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [stocks]);

  const handleAddStock = () => {
    if (newStock) {
      addToWatchlist(newStock);
      setNewStock('');
      // Lade Kurs für neue Aktie
      fetchStockQuote(newStock);
    }
  };
  
  const handleAddWatchlist = () => {
    if (newWatchlistName) {
      addWatchlist(newWatchlistName);
      setNewWatchlistName('');
      setShowAddWatchlist(false);
    }
  }

  const getStockData = (symbol: string): { price: number; change: number; changePercent: number; isLoading: boolean } => {
    const quote = stockQuotes.get(symbol);
    const isLoading = loading.has(symbol);
    
    if (quote) {
      return {
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        isLoading: false
      };
    }
    
    return {
      price: 0,
      change: 0,
      changePercent: 0,
      isLoading
    };
  };

  const Icon = FaStar as React.ElementType;
  const RemoveIcon = FaTimes as React.ElementType;
  const AddIcon = FaPlus as React.ElementType;

  return (
    <>
      <div className="watchlist-header">
        <select onChange={(e) => setActiveWatchlist(e.target.value)} value={activeWatchlist}>
          {Object.keys(watchlists).map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <button className="add-watchlist-btn" onClick={() => setShowAddWatchlist(!showAddWatchlist)}>
            <AddIcon />
        </button>
      </div>

      {showAddWatchlist && (
          <div className="add-watchlist-container">
            <input
                type="text"
                value={newWatchlistName}
                onChange={(e) => setNewWatchlistName(e.target.value)}
                placeholder="New watchlist name..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddWatchlist()}
                autoFocus
            />
            <button className="add-btn" onClick={handleAddWatchlist}>Add</button>
          </div>
      )}
      
      <ul className="watchlist-items">
        {stocks.map(stock => {
          const { price, change, changePercent, isLoading } = getStockData(stock);
          const isPositive = change >= 0;
          
          return (
            <li
              key={stock}
              className={stock === selectedStock ? 'active' : ''}
              onClick={() => setSelectedStock(stock)}
            >
              <div className="stock-info">
                <span className="stock-ticker">{stock}</span>
                <div className="stock-price-info">
                  <span className="stock-price">
                    {isLoading ? '...' : price > 0 ? `$${price.toFixed(2)}` : '--'}
                  </span>
                  <span className={`stock-change ${isPositive ? 'positive' : 'negative'}`}>
                    {isLoading ? '...' : price > 0 ? 
                      `${isPositive ? '+' : ''}${change.toFixed(2)} (${isPositive ? '+' : ''}${changePercent.toFixed(2)}%)` : 
                      '--'
                    }
                  </span>
                </div>
              </div>
              <button className="remove-stock-btn" onClick={(e) => { e.stopPropagation(); removeFromWatchlist(stock); }}>
                <RemoveIcon />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="add-stock-container">
        <input 
          type="text" 
          value={newStock} 
          onChange={(e) => setNewStock(e.target.value.toUpperCase())}
          placeholder="Add stock..."
          onKeyDown={(e) => e.key === 'Enter' && handleAddStock()}
        />
        <button className="add-btn" onClick={handleAddStock}><AddIcon /></button>
      </div>
    </>
  );
};

export default Watchlist; 