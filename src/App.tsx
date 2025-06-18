import React, { useState, useEffect } from 'react';
import './index.css';
import SearchBar from './components/SearchBar';
import Watchlist from './components/Watchlist';
import StockChart from './components/StockChart';
import Chatbot from './components/Chatbot';
import Portfolio, { PortfolioItem } from './components/Portfolio';
import AccountBalance from './components/AccountBalance';
import Settings, { AppSettings } from './components/Settings';
import { ChartAnnotation } from './components/StockChart';
import { FaCog } from 'react-icons/fa';

export interface Trade {
  type: 'buy' | 'sell';
  ticker: string;
  quantity: number;
  price: number;
  timestamp: Date;
  dailyPandL: number;
}

interface Watchlists {
  [key: string]: string[];
}

interface Account {
    balance: number;
    buyingPower: number;
    dailyPandL: number;
}

function App() {
  const [watchlists, setWatchlists] = useState<Watchlists>({
    'My First Watchlist': ['AAPL', 'GOOGL', 'MSFT'],
    'Tech Stocks': ['AMD', 'NVDA', 'TSLA'],
  });
  const [activeWatchlist, setActiveWatchlist] = useState('My First Watchlist');
  const [selectedStock, setSelectedStock] = useState('AAPL');
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);
  const [account, setAccount] = useState<Account>({
      balance: 100000,
      buyingPower: 100000,
      dailyPandL: 0 // Simplified for now
  });
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'light',
    autoRefresh: true,
    refreshInterval: 60,
    soundEnabled: false,
    compactView: false,
    showPercentageChanges: true,
    currency: 'USD',
    language: 'de'
  });

  // Chart Annotations State
  const [chartAnnotations, setChartAnnotations] = useState<ChartAnnotation[]>([]);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('finbot-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('finbot-settings', JSON.stringify(newSettings));
  };

  const handleCreateWatchlistWithStocks = (name: string, stocks: string[]) => {
    if (name && stocks.length > 0) {
        const upperCaseStocks = stocks.map(s => s.toUpperCase());
        
        // Falls Watchlist bereits existiert, überschreibe sie
        setWatchlists(prev => ({ ...prev, [name]: upperCaseStocks }));
        setActiveWatchlist(name);
        
        console.log(`Watchlist "${name}" created/updated with stocks:`, upperCaseStocks);
        return true;
    }
    return false;
  };

  // Chart Annotation Functions
  const handleAddAnnotation = (annotation: ChartAnnotation) => {
    setChartAnnotations(prev => [...prev, annotation]);
  };

  const handleRemoveAnnotation = (annotationId: string) => {
    setChartAnnotations(prev => prev.filter(ann => ann.id !== annotationId));
  };

  // Clear annotations when stock changes
  const handleStockChange = (stock: string) => {
    setSelectedStock(stock);
    setChartAnnotations([]); // Clear annotations for new stock
  };

  const handleBuy = (ticker: string, quantity: number, price: number): boolean => {
      const cost = quantity * price;
      if (cost > account.buyingPower) {
          // Here you could add a message to the chatbot instead of an alert
          alert("Nicht genügend Kaufkraft!");
          return false;
      }
      setAccount(prev => ({
          ...prev,
          buyingPower: prev.buyingPower - cost
      }));
      setPortfolio(prev => {
          const existingPosition = prev.find(p => p.ticker === ticker);
          if (existingPosition) {
              const totalQuantity = existingPosition.quantity + quantity;
              const totalCost = (existingPosition.avgPrice * existingPosition.quantity) + cost;
              const newAvgPrice = totalCost / totalQuantity;
              return prev.map(p => p.ticker === ticker ? { ...p, quantity: totalQuantity, avgPrice: newAvgPrice } : p);
          } else {
              return [...prev, { ticker, quantity, avgPrice: price }];
          }
      });
      setTradeHistory(prev => [{ type: 'buy', ticker, quantity, price, timestamp: new Date(), dailyPandL: account.dailyPandL }, ...prev]);
      return true;
  };

    const handleSell = (ticker: string, quantity: number, price: number): boolean => {
        const position = portfolio.find(p => p.ticker === ticker);
        if (!position || position.quantity < quantity) {
            alert("Nicht genügend Aktien zum Verkaufen!");
            return false;
        }

        const revenue = quantity * price;
        const oldCost = position.avgPrice * quantity;
        const profit = revenue - oldCost;

        setAccount(prev => ({
            ...prev,
            balance: prev.balance + profit,
            buyingPower: prev.buyingPower + revenue
        }));

        setPortfolio(prev => {
            const newQuantity = position.quantity - quantity;
            if (newQuantity > 0) {
                return prev.map(p => p.ticker === ticker ? { ...p, quantity: newQuantity } : p);
            } else {
                return prev.filter(p => p.ticker !== ticker);
            }
        });
        setTradeHistory(prev => [{ type: 'sell', ticker, quantity, price, timestamp: new Date(), dailyPandL: account.dailyPandL }, ...prev]);
        return true;
    };

  const addToWatchlist = (stock: string) => {
    if (stock && !watchlists[activeWatchlist].includes(stock.toUpperCase())) {
      const newWatchlists = { ...watchlists };
      newWatchlists[activeWatchlist] = [stock.toUpperCase(), ...newWatchlists[activeWatchlist]];
      setWatchlists(newWatchlists);
    }
  };

  const removeFromWatchlist = (stock: string) => {
    const newWatchlists = { ...watchlists };
    newWatchlists[activeWatchlist] = newWatchlists[activeWatchlist].filter(s => s !== stock);
    setWatchlists(newWatchlists);
  };
  
  const addWatchlist = (name: string) => {
    if (name && !watchlists[name]) {
        setWatchlists({ ...watchlists, [name]: [] });
        setActiveWatchlist(name);
    }
  };

  const SettingsIcon = FaCog as React.ElementType;

  return (
    <div className="app">
      <div className="top-bar">
        <h1>Finbot</h1>
        <div className="top-bar-right">
          <SearchBar onSearch={handleStockChange} />
          <AccountBalance balance={account.balance} buyingPower={account.buyingPower} dailyPandL={account.dailyPandL} />
          <div className="settings-icon" onClick={() => setIsSettingsOpen(true)}>
            <SettingsIcon />
          </div>
        </div>
      </div>
      <div className="content">
        <div className="card watchlist">
          <Watchlist
            watchlists={watchlists}
            activeWatchlist={activeWatchlist}
            setActiveWatchlist={setActiveWatchlist}
            addWatchlist={addWatchlist}
            stocks={watchlists[activeWatchlist]}
            setSelectedStock={handleStockChange}
            selectedStock={selectedStock}
            removeFromWatchlist={removeFromWatchlist}
            addToWatchlist={addToWatchlist}
          />
        </div>
        <div className="main-content">
          <div className="card stock-chart">
            <StockChart 
              selectedStock={selectedStock} 
              annotations={chartAnnotations}
              onAnnotationAdd={handleAddAnnotation}
              onAnnotationRemove={handleRemoveAnnotation}
            />
          </div>
          <div className="card positions">
             <Portfolio positions={portfolio} />
          </div>
        </div>
                <div className="card chatbot">
          <Chatbot 
            setSelectedStock={handleStockChange}
            handleBuy={handleBuy}
            handleSell={handleSell}
            account={account}
            portfolio={portfolio}
            tradeHistory={tradeHistory}
            handleCreateWatchlistWithStocks={handleCreateWatchlistWithStocks}
            onAddAnnotation={handleAddAnnotation}
            selectedStock={selectedStock}
          />
        </div>
      </div>
      
      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
}

export default App;
