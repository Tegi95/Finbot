import React, { useState, useEffect } from 'react';

const FINNHUB_API_KEY = "d129d1hr01qmhi3h8i2gd129d1hr01qmhi3h8i30";

interface StockQuoteProps {
  symbol: string;
}

interface QuoteData {
  open: string;
  high: string;
  low: string;
  price: string;
  volume: string;
  change: string;
  changePercent: string;
}

const StockQuote: React.FC<StockQuoteProps> = ({ symbol }) => {
  const [quote, setQuote] = useState<QuoteData | null>(null);

  useEffect(() => {
    if (!symbol) return;
    const fetchQuote = async () => {
      try {
        const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data && data.c) {
          setQuote({
            open: data.o.toFixed(2),
            high: data.h.toFixed(2),
            low: data.l.toFixed(2),
            price: data.c.toFixed(2),
            volume: 'N/A', // Finnhub does not provide volume in the /quote endpoint
            change: data.d.toFixed(2),
            changePercent: data.dp.toFixed(2),
          });
        } else {
          setQuote(null);
        }
      } catch (error) {
        console.error('Error fetching quote data:', error);
        setQuote(null);
      }
    };
    fetchQuote();
    const interval = setInterval(fetchQuote, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, [symbol]);

  if (!quote) return <div className="quote-container">Loading quote...</div>;

  const isPositive = parseFloat(quote.change) >= 0;

  return (
    <div className="quote-container">
      <div className="quote-price" style={{ color: isPositive ? '#26a69a' : '#ef5350' }}>
        {quote.price}
        <span className="quote-change" style={{ color: isPositive ? '#26a69a' : '#ef5350' }}>
            {isPositive ? '+' : ''}{quote.change} ({quote.changePercent}%)
        </span>
      </div>
      <div className="quote-details">
        <div><strong>Open:</strong> {quote.open}</div>
        <div><strong>High:</strong> {quote.high}</div>
        <div><strong>Low:</strong> {quote.low}</div>
        <div><strong>Volume:</strong> {quote.volume}</div>
      </div>
    </div>
  );
};

export default StockQuote; 