import React, { useState, useEffect } from 'react';
import { FaBoxOpen } from 'react-icons/fa';

const FINNHUB_API_KEY = "d129d1hr01qmhi3h8i2gd129d1hr01qmhi3h8i30";

export interface PortfolioItem {
  ticker: string;
  quantity: number;
  avgPrice: number;
}

interface EnrichedPortfolioItem extends PortfolioItem {
  currentPrice: number;
  changePercent: number;
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
}

interface PortfolioProps {
  positions: PortfolioItem[];
}

const Portfolio: React.FC<PortfolioProps> = ({ positions }) => {
  const [enrichedPositions, setEnrichedPositions] = useState<EnrichedPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentPrices = async () => {
      if (positions.length === 0) {
        setEnrichedPositions([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const enrichedData = await Promise.all(
          positions.map(async (pos) => {
            const url = `https://finnhub.io/api/v1/quote?symbol=${pos.ticker}&token=${FINNHUB_API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();
            
            const currentPrice = data.c || pos.avgPrice;
            const totalValue = currentPrice * pos.quantity;
            const totalCost = pos.avgPrice * pos.quantity;
            const totalGainLoss = totalValue - totalCost;
            const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
            const changePercent = data.dp || 0;

            return {
              ...pos,
              currentPrice,
              changePercent,
              totalValue,
              totalGainLoss,
              totalGainLossPercent,
            };
          })
        );
        setEnrichedPositions(enrichedData);
      } catch (error) {
        console.error("Error fetching portfolio prices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentPrices();
  }, [positions]);

  const Icon = FaBoxOpen as React.ElementType;

  return (
    <>
      <h2><Icon /> Portfolio</h2>
      <div className="portfolio-container">
        <div className="portfolio-header">
          <span>Ticker</span>
          <span>Menge</span>
          <span>Wert</span>
          <span>G/V (%)</span>
        </div>
        {loading ? (
          <p>Loading portfolio...</p>
        ) : enrichedPositions.length === 0 ? (
          <p className="empty-portfolio">Ihr Portfolio ist leer.</p>
        ) : (
          <div className="portfolio-items">
            {enrichedPositions.map((pos) => {
              const isPositive = pos.totalGainLoss >= 0;
              return (
                <div key={pos.ticker} className="portfolio-item">
                  <span className="ticker">{pos.ticker}</span>
                  <span>{pos.quantity}</span>
                  <span>${pos.totalValue.toFixed(2)}</span>
                  <span style={{ color: isPositive ? '#26a69a' : '#ef5350' }}>
                    {pos.totalGainLossPercent.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default Portfolio; 