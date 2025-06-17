const FINNHUB_API_KEY = "d129d1hr01qmhi3h8i2gd129d1hr01qmhi3h8i30";

export interface StockQuoteData {
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
}

class StockDataService {
  private cache: Map<string, { data: StockQuoteData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60000; // 1 Minute Cache

  async getStockQuote(symbol: string): Promise<StockQuoteData | null> {
    // Check cache first
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data && data.c && data.c > 0) {
        const quoteData: StockQuoteData = {
          price: data.c,
          change: data.d,
          changePercent: data.dp,
          open: data.o,
          high: data.h,
          low: data.l,
        };

        // Cache the result
        this.cache.set(symbol, {
          data: quoteData,
          timestamp: Date.now(),
        });

        return quoteData;
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<Map<string, StockQuoteData>> {
    const results = new Map<string, StockQuoteData>();
    
    // Process in parallel but with rate limiting
    const promises = symbols.map(async (symbol, index) => {
      // Stagger requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, index * 100));
      
      const quote = await this.getStockQuote(symbol);
      if (quote) {
        results.set(symbol, quote);
      }
    });

    await Promise.all(promises);
    return results;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const stockDataService = new StockDataService(); 