import React, { useState, useEffect, useRef } from 'react';
import { FaRobot } from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import OrderConfirmation from './OrderConfirmation';
import InfoBlock from './InfoBlock';
import { PortfolioItem } from './Portfolio';
import { Trade } from '../App';
import { ChartAnnotation } from './StockChart';

const GEMINI_API_KEY = "AIzaSyC7PsWTuHu8Z4sNgNGICN5BtgUAsTtL1GI";
const FINNHUB_API_KEY = "d129d1hr01qmhi3h8i2gd129d1hr01qmhi3h8i30";

const staticSystemInstruction = `Du bist Finbot, der professionelle Finanz-Chatbot in einer Handelssimulations-Umgebung.
Du unterstützt Nutzer:innen bei allen Fragen rund um Aktien, Finanzmärkte und Handel.
Dein Stil ist klar, direkt, sachlich und professionell. Kein Smalltalk. Keine Empfehlungen. Keine Emotionen.

Verhaltensregeln:
- **Priorität 1: Antworte so kurz und direkt wie möglich.** Vermeide jegliche Füllwörter, Einleitungen oder zusätzliche Kommentare, die nicht explizit angefragt wurden.
- **Gib unter keinen Umständen Ratschläge, Warnungen oder Meinungen ab.** Das schließt auch allgemeine Hinweise zu Finanzrisiken oder Marktvolatilität aus.
- Antworte präzise auf die gestellte Frage.
- Bei direkten Handelsanfragen (z.B. "kaufe 10 Apple"), musst du das entsprechende Aktionsformat \`[(BuyStock:...)]\` oder \`[(SellStock:...)]\` verwenden. Der Limitpreis ist optional – lässt du ihn weg, wird eine Market-Order zum aktuellen Kurs simuliert. Lehne die Anfrage nicht ab oder verweise an einen Broker.
- Bleibe bei der genannten Aktie oder dem Thema, bis explizit gewechselt wird.
- Verwende ausschließlich die untenstehenden Aktionsformate.
- Du darfst mehrere Aktionsformate gleichzeitig verwenden.
- Du darfst eigenständig relevante Informationen abrufen, wenn sie zur Beantwortung der Frage nötig sind.
- Nutze bei Unsicherheit systematisch verfügbare Quellen (z.B. aktuelle Nachrichten oder Finanzkennzahlen).

Erlaubnis zur selbstständigen Informationsabfrage:
Wenn eine Nutzerfrage ungenau oder allgemein formuliert ist (z.B. "Was ist los mit Tesla?"), darfst du eigenständig Informationen abrufen, z.B.:
- aktuelle Nachrichten zur Aktie
- Finanzkennzahlen
- Analystenbewertungen
- Marktreaktionen oder Sektorentwicklungen
Verwende dabei ausschließlich die passenden Aktionsformate.

Aktionsformate:
[(Stockprice:Tickersymbol)]
[(Stockverlauf:Tickersymbol)]
[(BuyStock:Tickersymbol;Anzahl;Limitprice)]
[(SellStock:Tickersymbol;Anzahl;Limitprice)]
[(StockNews:Tickersymbol)]
[(StockMetrics:Tickersymbol)]
[(CompanyProfile:Tickersymbol)]
[(AnalystRatings:Tickersymbol)]
[(Dividends:Tickersymbol)]
[(ShowPortfolio)]
[(ShowOrders)]
[(CancelOrder:OrderID)]
[(MarketNews)]
[(MarketOverview)]
[(SectorTrends)]
[(TopMovers)]
[(CreateWatchlist:WatchlistName;TICKER1,TICKER2,TICKER3)]

**CHART-ANALYSE UND MARKIERUNGEN:**
Du kannst Charts analysieren und technische Markierungen hinzufügen:
[(AddTrendLine:TICKER;StartDatum;StartPreis;EndDatum;EndPreis)] - Trendlinie zeichnen
[(AddSupportLevel:TICKER;Preis)] - Support-Level markieren  
[(AddResistanceLevel:TICKER;Preis)] - Resistance-Level markieren
[(AddFibonacci:TICKER;LowPreis;HighPreis)] - Fibonacci-Retracements einzeichnen
[(AddTextMarker:TICKER;Datum;Preis;Text)] - Textmarkierung hinzufügen
[(HighlightPattern:TICKER;PatternName;StartDatum;EndDatum)] - Chart-Pattern hervorheben

PATTERN-ERKENNUNG:
Erkenne und markiere automatisch:
- Head and Shoulders, Double Top/Bottom
- Triangles (Ascending/Descending/Symmetrical)  
- Flags and Pennants, Cup and Handle
- Breakouts und Support/Resistance-Brüche

Wenn du Chart-Analyse durchführst, verwende diese Aktionsformate um relevante Levels einzuzeichnen.

Du erhältst unten eine Zusammenfassung des aktuellen Kontos und des Portfolios des Nutzers. Nutze diese Informationen, um personalisierte und kontextbezogene Antworten zu geben.

**Fähigkeit zur Recherche:**
Wenn du gebeten wirst, Aktien zu einem bestimmten Thema zu finden oder aufzulisten (z.B. "finde 3 vielversprechende Quantum-Aktien" oder "welche Firmen sind im Bereich KI-Chips führend?"), ist dies eine erlaubte Anfrage.
- Deine Aufgabe ist es, dein internes Wissen zu nutzen, um relevante Unternehmens-Ticker zu identifizieren.
- Die Antwort auf solche Anfragen **muss** primär das \`[(CreateWatchlist:WatchlistName;TICKER1,TICKER2,...)]\`-Format verwenden.
- Du kannst einen kurzen, neutralen Satz hinzufügen, der die Erstellung der Liste bestätigt. Gib aber keine detaillierten Begründungen oder Analysen ab, warum die Aktien "vielversprechend" sind, es sei denn, dies wird explizit gefordert.
`;

const generateDynamicSystemInstruction = (
  account: { balance: number; buyingPower: number; },
  portfolio: PortfolioItem[],
  tradeHistory: Trade[],
  handleCreateWatchlistWithStocks: (name: string, stocks: string[]) => boolean
): string => {
    let dynamicPrompt = staticSystemInstruction;

    dynamicPrompt += `\n\n--- AKTUELLE KONTEXTDATEN ---\n`;
    dynamicPrompt += `**Konto:**\n`;
    dynamicPrompt += `- Guthaben: $${account.balance.toFixed(2)}\n`;
    dynamicPrompt += `- Kaufkraft: $${account.buyingPower.toFixed(2)}\n`;

    if (portfolio.length > 0) {
        dynamicPrompt += `\n**Portfolio:**\n`;
        portfolio.forEach(pos => {
            dynamicPrompt += `- ${pos.quantity}x ${pos.ticker} @ $${pos.avgPrice.toFixed(2)}\n`;
        });
    } else {
        dynamicPrompt += `\n**Portfolio:** Leer\n`;
    }

    if (tradeHistory.length > 0) {
        dynamicPrompt += `\n**Letzte 5 Transaktionen:**\n`;
        tradeHistory.slice(0, 5).forEach(trade => {
            const type = trade.type === 'buy' ? 'Kauf' : 'Verkauf';
            dynamicPrompt += `- ${type}: ${trade.quantity}x ${trade.ticker} für $${trade.price.toFixed(2)} am ${trade.timestamp.toLocaleDateString()}\n`;
        });
    } else {
        dynamicPrompt += `\n**Transaktionsverlauf:** Leer\n`;
    }
     dynamicPrompt += `--- ENDE KONTEXTDATEN ---\n`;

    return dynamicPrompt;
}

interface Account {
    balance: number;
    buyingPower: number;
}

interface OrderDetails {
  ticker: string;
  quantity: string;
  orderType: 'Limit' | 'Market';
  priceString: string;
}

interface Message {
  id: number;
  role: 'user' | 'model';
  text?: string;
  infoBlock?: string;
  order?: { 
    type: 'buy' | 'sell'; 
    details: OrderDetails;
    onConfirm: () => boolean;
  };
}

interface ChatbotProps {
  setSelectedStock: (stock: string) => void;
  handleBuy: (ticker: string, quantity: number, price: number) => boolean;
  handleSell: (ticker: string, quantity: number, price: number) => boolean;
  account: Account;
  portfolio: PortfolioItem[];
  tradeHistory: Trade[];
  handleCreateWatchlistWithStocks: (name: string, stocks: string[]) => boolean;
  onAddAnnotation?: (annotation: ChartAnnotation) => void;
  selectedStock?: string;
}

const fetchStockPriceNumber = async (ticker: string): Promise<number | null> => {
    const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data && data.c) {
            return data.c;
        } else {
            console.warn(`Could not fetch price for ${ticker} from Finnhub.`, data);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching price for ${ticker}:`, error);
        return null;
    }
};

const fetchStockPrice = async (ticker: string): Promise<string> => {
    const price = await fetchStockPriceNumber(ticker);
    if (price !== null) {
        return `${ticker}: $${price.toFixed(2)}`;
    }
    return `${ticker}: Price not found`;
};

const processStockPriceTags = async (text: string): Promise<string> => {
    const regex = /\[\(Stockprice:(.*?)\)\]/g;
    const matches = Array.from(text.matchAll(regex));
    let processedText = text;

    for (const match of matches) {
        const fullTag = match[0];
        const ticker = match[1];
        if (ticker && ticker !== 'Tickersymbol') {
            const replacement = await fetchStockPrice(ticker);
            processedText = processedText.replace(fullTag, replacement);
        }
    }
    return processedText;
};

const processStockChartTags = (text: string, setSelectedStock: (stock: string) => void): string => {
    const regex = /\[\(Stockverlauf:(.*?)\)\]/g;
    let processedText = text;
    const matches = Array.from(text.matchAll(regex));

    for (const match of matches) {
        const fullTag = match[0];
        const ticker = match[1];
        if (ticker && ticker !== 'Tickersymbol') {
            setSelectedStock(ticker.toUpperCase());
            processedText = processedText.replace(fullTag, '').trim();
        }
    }
    return processedText;
};

const processShowPortfolioTag = (text: string, portfolio: PortfolioItem[]): { remainingText: string, infoBlock: string | null } => {
    const regex = /\[\(ShowPortfolio\)\]/g;
    if (regex.test(text)) {
        let portfolioString = "**Aktuelles Portfolio:**\n--------------------------\n";
        if (portfolio.length > 0) {
            portfolio.forEach(pos => {
                portfolioString += `${pos.quantity}x ${pos.ticker} @ ø $${pos.avgPrice.toFixed(2)}\n`;
            });
        } else {
            portfolioString += "Ihr Portfolio ist leer.\n";
        }
        portfolioString += "--------------------------";
        return { remainingText: text.replace(regex, ""), infoBlock: portfolioString };
    }
    return { remainingText: text, infoBlock: null };
};

const metricNameMapping: { [key: string]: { key: string, label: string } } = {
    'kgv': { key: 'peNormalizedAnnual', label: 'KGV (annual)' },
    'kgv-ttm': { key: 'peTTM', label: 'KGV (TTM)' },
    'marktkapitalisierung': { key: 'marketCapitalization', label: 'Marktkapitalisierung (Mio.)' },
    'beta': { key: 'beta', label: 'Beta' },
    'eps': { key: 'epsNormalizedAnnual', label: 'EPS (annual)' },
    'rendite': { key: 'dividendYieldIndicatedAnnual', label: 'Dividendenrendite (%)' },
    'dividende': { key: 'dividendPerShareAnnual', label: 'Dividende p. Aktie (jährl.)' },
    '52-wochen-hoch': { key: '52WeekHigh', label: '52-Wochen-Hoch' },
    '52-wochen-tief': { key: '52WeekLow', label: '52-Wochen-Tief' },
};

const processSingleStockMetricTag = async (text: string): Promise<{ remainingText: string, infoBlocks: string[] }> => {
    const regex = /\[\(StockMetric:(.*?),(.*?)\)\]/g;
    let processedText = text;
    const infoBlocks: string[] = [];
    const matches = Array.from(text.matchAll(regex));

    for (const match of matches) {
        const fullTag = match[0];
        const ticker = match[1].toUpperCase();
        const metricKey = match[2].toLowerCase().trim();

        const metricInfo = metricNameMapping[metricKey];

        if (ticker && ticker !== 'TICKERSYMBOL' && metricInfo) {
            try {
                const response = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${FINNHUB_API_KEY}`);
                const data = await response.json();

                if (data && data.metric && data.metric[metricInfo.key] !== undefined) {
                    let value = data.metric[metricInfo.key];
                    if (metricInfo.key === 'marketCapitalization') {
                         value = `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    } else if (typeof value === 'number') {
                        value = value.toFixed(2);
                    }
                    const resultString = `${metricInfo.label} für ${ticker}:\n${value}`;
                    infoBlocks.push(resultString);
                    processedText = processedText.replace(fullTag, "");
                } else {
                    infoBlocks.push(`Der Wert für '${metricInfo.label}' konnte für ${ticker} nicht gefunden werden.`);
                    processedText = processedText.replace(fullTag, "");
                }
            } catch (error) {
                console.error(`Error fetching single metric for ${ticker}:`, error);
                infoBlocks.push(`Fehler beim Abrufen von '${metricInfo.label}' für ${ticker}.`);
                processedText = processedText.replace(fullTag, "");
            }
        } else {
             if (metricInfo) {
                processedText = processedText.replace(fullTag, "");
             } else {
                infoBlocks.push(`Unbekannte Kennzahl angefordert: ${metricKey}`);
                processedText = processedText.replace(fullTag, "");
             }
        }
    }
    return { remainingText: processedText.trim(), infoBlocks };
};

const processStockMetricsTag = async (text: string): Promise<{ remainingText: string, infoBlocks: string[] }> => {
    const regex = /\[\(StockMetrics:(.*?)\)\]/g;
    let processedText = text;
    const infoBlocks: string[] = [];
    const matches = Array.from(text.matchAll(regex));

    for (const match of matches) {
        const fullTag = match[0];
        const ticker = match[1].toUpperCase();

        if (ticker && ticker !== 'TICKERSYMBOL') {
            try {
                const url = `https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${FINNHUB_API_KEY}`;
                const response = await fetch(url);
                const data = await response.json();

                if (data && data.metric) {
                    const m = data.metric;
                    const marketCap = m.marketCapitalization ? `${(m.marketCapitalization / 1000).toFixed(2)}B` : 'N/A';
                    const peRatio = m.peInclExtraTTM ? m.peInclExtraTTM.toFixed(2) : 'N/A';
                    const dividendYield = m.dividendYieldIndicatedAnnual ? `${m.dividendYieldIndicatedAnnual.toFixed(2)}%` : 'N/A';
                    const weekHigh52 = m['52WeekHigh'] ? m['52WeekHigh'].toFixed(2) : 'N/A';
                    const weekLow52 = m['52WeekLow'] ? m['52WeekLow'].toFixed(2) : 'N/A';

                    let metricsString = `**Finanzkennzahlen für ${ticker}:**\n--------------------------\n`;
                    metricsString += `Marktkapitalisierung: ${marketCap}\n`;
                    metricsString += `KGV (TTM): ${peRatio}\n`;
                    metricsString += `Dividendenrendite: ${dividendYield}\n`;
                    metricsString += `52-Wochen-Hoch: $${weekHigh52}\n`;
                    metricsString += `52-Wochen-Tief: $${weekLow52}\n`;
                    metricsString += "--------------------------";
                    infoBlocks.push(metricsString);
                    processedText = processedText.replace(fullTag, "");
                } else {
                    infoBlocks.push(`Keine Kennzahlen für ${ticker} gefunden.`);
                    processedText = processedText.replace(fullTag, "");
                }
            } catch (error) {
                console.error(`Error fetching metrics for ${ticker}:`, error);
                infoBlocks.push(`Fehler beim Abrufen der Kennzahlen für ${ticker}.`);
                processedText = processedText.replace(fullTag, "");
            }
        }
    }
    return { remainingText: processedText.trim(), infoBlocks };
};

const processCreateWatchlistTag = (text: string, handleCreate: (name: string, stocks: string[]) => boolean): string => {
    const regex = /\[\(CreateWatchlist:(.*?);(.*?)\)\]/g;
    let processedText = text;
    const matches = Array.from(text.matchAll(regex));

    for (const match of matches) {
        const fullTag = match[0];
        const watchlistName = match[1];
        const tickersString = match[2];
        const tickers = tickersString.split(',').map(t => t.trim().toUpperCase()).filter(t => t);

        if (watchlistName && tickers.length > 0) {
            const success = handleCreate(watchlistName, tickers);
            if (success) {
                const confirmation = `Watchlist "${watchlistName}" wurde mit ${tickers.length} Aktien erstellt: ${tickers.join(', ')}.`;
                processedText = processedText.replace(fullTag, confirmation);
            } else {
                const error = `Fehler beim Erstellen der Watchlist "${watchlistName}".`;
                processedText = processedText.replace(fullTag, error);
            }
        } else {
            const error = `Ungültige Watchlist-Parameter: Name="${watchlistName}", Aktien="${tickersString}".`;
            processedText = processedText.replace(fullTag, error);
        }
    }
    return processedText;
};

// Chart Annotation Processing Functions
const processChartAnnotationTags = (
    text: string,
    selectedStock: string,
    onAddAnnotation?: (annotation: ChartAnnotation) => void
): string => {
    if (!onAddAnnotation) return text;
    
    let processedText = text;
    
    // Process AddTrendLine tags
    const trendlineRegex = /\[\(AddTrendLine:(.*?);(.*?);(.*?);(.*?);(.*?)\)\]/g;
    const trendlineMatches = Array.from(text.matchAll(trendlineRegex));
    
    for (const match of trendlineMatches) {
        const [fullTag, ticker, startDate, startPrice, endDate, endPrice] = match;
        
        if (ticker.toUpperCase() === selectedStock.toUpperCase()) {
            const annotation: ChartAnnotation = {
                id: `trendline-${Date.now()}-${Math.random()}`,
                type: 'trendline',
                data: {
                    startTime: (new Date(startDate).getTime() / 1000) as any,
                    endTime: (new Date(endDate).getTime() / 1000) as any,
                    startPrice: parseFloat(startPrice),
                    endPrice: parseFloat(endPrice),
                    color: '#ff6b6b'
                },
                createdBy: 'bot'
            };
            
            onAddAnnotation(annotation);
            processedText = processedText.replace(fullTag, `📈 Trendlinie zu ${ticker} hinzugefügt (${startPrice}$ → ${endPrice}$)`);
        }
    }
    
    // Process AddSupportLevel tags
    const supportRegex = /\[\(AddSupportLevel:(.*?);(.*?)\)\]/g;
    const supportMatches = Array.from(text.matchAll(supportRegex));
    
    for (const match of supportMatches) {
        const [fullTag, ticker, price] = match;
        
        if (ticker.toUpperCase() === selectedStock.toUpperCase()) {
            const annotation: ChartAnnotation = {
                id: `support-${Date.now()}-${Math.random()}`,
                type: 'horizontal',
                data: {
                    price: parseFloat(price),
                    color: '#4ecdc4',
                    text: `Support: $${price}`
                },
                createdBy: 'bot'
            };
            
            onAddAnnotation(annotation);
            processedText = processedText.replace(fullTag, `🟢 Support-Level bei $${price} markiert`);
        }
    }
    
    // Process AddResistanceLevel tags
    const resistanceRegex = /\[\(AddResistanceLevel:(.*?);(.*?)\)\]/g;
    const resistanceMatches = Array.from(text.matchAll(resistanceRegex));
    
    for (const match of resistanceMatches) {
        const [fullTag, ticker, price] = match;
        
        if (ticker.toUpperCase() === selectedStock.toUpperCase()) {
            const annotation: ChartAnnotation = {
                id: `resistance-${Date.now()}-${Math.random()}`,
                type: 'horizontal',
                data: {
                    price: parseFloat(price),
                    color: '#ff6b6b',
                    text: `Resistance: $${price}`
                },
                createdBy: 'bot'
            };
            
            onAddAnnotation(annotation);
            processedText = processedText.replace(fullTag, `🔴 Resistance-Level bei $${price} markiert`);
        }
    }
    
    // Process AddFibonacci tags
    const fibonacciRegex = /\[\(AddFibonacci:(.*?);(.*?);(.*?)\)\]/g;
    const fibonacciMatches = Array.from(text.matchAll(fibonacciRegex));
    
    for (const match of fibonacciMatches) {
        const [fullTag, ticker, lowPrice, highPrice] = match;
        
        if (ticker.toUpperCase() === selectedStock.toUpperCase()) {
            const low = parseFloat(lowPrice);
            const high = parseFloat(highPrice);
            const range = high - low;
            
            const fibLevels = [
                { level: 0, price: high },
                { level: 23.6, price: high - (range * 0.236) },
                { level: 38.2, price: high - (range * 0.382) },
                { level: 50, price: high - (range * 0.5) },
                { level: 61.8, price: high - (range * 0.618) },
                { level: 100, price: low }
            ];
            
            const annotation: ChartAnnotation = {
                id: `fibonacci-${Date.now()}-${Math.random()}`,
                type: 'fibonacci',
                data: {
                    fibLevels,
                    color: '#9b59b6'
                },
                createdBy: 'bot'
            };
            
            onAddAnnotation(annotation);
            processedText = processedText.replace(fullTag, `📊 Fibonacci-Retracements hinzugefügt (${lowPrice}$ - ${highPrice}$)`);
        }
    }
    
    // Process AddTextMarker tags
    const textMarkerRegex = /\[\(AddTextMarker:(.*?);(.*?);(.*?);(.*?)\)\]/g;
    const textMarkerMatches = Array.from(text.matchAll(textMarkerRegex));
    
    for (const match of textMarkerMatches) {
        const [fullTag, ticker, date, price, text] = match;
        
        if (ticker.toUpperCase() === selectedStock.toUpperCase()) {
            const annotation: ChartAnnotation = {
                id: `text-${Date.now()}-${Math.random()}`,
                type: 'text',
                data: {
                    startTime: (new Date(date).getTime() / 1000) as any,
                    startPrice: parseFloat(price),
                    text: text,
                    color: '#2196F3'
                },
                createdBy: 'bot'
            };
            
            onAddAnnotation(annotation);
            processedText = processedText.replace(fullTag, `📝 Textmarkierung "${text}" hinzugefügt`);
        }
    }
    
    return processedText;
};

const processBuyStockTags = async (text: string, handleBuy: (ticker: string, quantity: number, price: number) => boolean): Promise<{ text: string, orders: Array<Message['order']> }> => {
    const regex = /\[\(BuyStock:(.*?);(.*?)(?:;(.*?))?\)\]/g;
    let processedText = text;
    const orders: Array<Message['order']> = [];
    const matches = Array.from(text.matchAll(regex));

    for (const match of matches) {
        const fullTag = match[0];
        const ticker = match[1].toUpperCase();
        const quantity = parseFloat(match[2]);
        const limitPriceStr = match[3];

        if (ticker && quantity) {
            let orderType: 'Limit' | 'Market';
            let price: number | null;
            let priceString: string;

            if (limitPriceStr && limitPriceStr.trim() !== '') {
                orderType = 'Limit';
                price = parseFloat(limitPriceStr);
                priceString = `$${price.toFixed(2)}`;
            } else {
                orderType = 'Market';
                price = await fetchStockPriceNumber(ticker);
                priceString = price !== null ? `~ $${price.toFixed(2)} (Market)` : 'N/A';
            }
            
            if (price !== null) {
                orders.push({
                    type: 'buy',
                    details: { ticker, quantity: String(quantity), orderType, priceString },
                    onConfirm: () => handleBuy(ticker, quantity, price as number)
                });
            }
            processedText = processedText.replace(fullTag, '');
        }
    }
    return { text: processedText.trim(), orders };
};

const processSellStockTags = async (text: string, handleSell: (ticker: string, quantity: number, price: number) => boolean): Promise<{ text: string, orders: Array<Message['order']> }> => {
    const regex = /\[\(SellStock:(.*?);(.*?)(?:;(.*?))?\)\]/g;
    let processedText = text;
    const orders: Array<Message['order']> = [];
    const matches = Array.from(text.matchAll(regex));

    for (const match of matches) {
        const fullTag = match[0];
        const ticker = match[1].toUpperCase();
        const quantity = parseFloat(match[2]);
        const limitPriceStr = match[3];

        if (ticker && quantity) {
            let orderType: 'Limit' | 'Market';
            let price: number | null;
            let priceString: string;

            if (limitPriceStr && limitPriceStr.trim() !== '') {
                orderType = 'Limit';
                price = parseFloat(limitPriceStr);
                priceString = `$${price.toFixed(2)}`;
            } else {
                orderType = 'Market';
                price = await fetchStockPriceNumber(ticker);
                priceString = price !== null ? `~ $${price.toFixed(2)} (Market)` : 'N/A';
            }
            
            if (price !== null) {
                orders.push({
                    type: 'sell',
                    details: { ticker, quantity: String(quantity), orderType, priceString },
                    onConfirm: () => handleSell(ticker, quantity, price as number)
                });
            }
            processedText = processedText.replace(fullTag, '');
        }
    }
    return { text: processedText.trim(), orders };
};

// This function parses the model's response and separates text from action tags.
const parseMessage = (text: string) => {
  const parts = [];
  let lastIndex = 0;
  const regex = /\[\((.*?)\)\]/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text part before the match
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    // Add the action tag part
    parts.push({ type: 'action', content: match[1] });
    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text after the last match
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }

  return parts;
};

const Chatbot: React.FC<ChatbotProps> = ({ setSelectedStock, handleBuy, handleSell, account, portfolio, tradeHistory, handleCreateWatchlistWithStocks, onAddAnnotation, selectedStock }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageId, setMessageId] = useState(0);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const Icon = FaRobot as React.ElementType;
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (msg: Omit<Message, 'id'>) => {
    setMessages(prev => [...prev, { ...msg, id: messageId }]);
    setMessageId(prev => prev + 1);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessageText = input;
    addMessage({ role: 'user', text: userMessageText });
    setInput('');
    setIsLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash-latest",
        systemInstruction: generateDynamicSystemInstruction(account, portfolio, tradeHistory, handleCreateWatchlistWithStocks),
      });
      
      const chatHistory = messages
        .filter(m => m.text) // only use text messages for history
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text! }]
        }));

      const chat = model.startChat({ history: chatHistory });

      const result = await chat.sendMessage(userMessageText);
      const response = result.response;
      const rawText = response.text();

      let processedText = rawText;
      processedText = await processStockPriceTags(processedText);
      processedText = processStockChartTags(processedText, setSelectedStock);
      
      const { remainingText: textAfterPortfolio, infoBlock: portfolioInfo } = processShowPortfolioTag(processedText, portfolio);
      processedText = textAfterPortfolio;
      
      const { remainingText: textAfterMetrics, infoBlocks: metricsInfo } = await processStockMetricsTag(processedText);
      processedText = textAfterMetrics;

      const { remainingText: textAfterSingleMetric, infoBlocks: singleMetricInfo } = await processSingleStockMetricTag(processedText);
      processedText = textAfterSingleMetric;
      
      processedText = processCreateWatchlistTag(processedText, handleCreateWatchlistWithStocks);

      // Process chart annotations
      if (selectedStock && onAddAnnotation) {
        processedText = processChartAnnotationTags(processedText, selectedStock, onAddAnnotation);
      }

      const { text: textAfterBuy, orders: buyOrders } = await processBuyStockTags(processedText, handleBuy);
      const { text: textAfterSell, orders: sellOrders } = await processSellStockTags(textAfterBuy, handleSell);
      processedText = textAfterSell;

      if (processedText.trim()) {
        addMessage({ role: 'model', text: processedText });
      }

      if (portfolioInfo) {
        addMessage({ role: 'model', infoBlock: portfolioInfo });
      }

      metricsInfo.forEach(info => addMessage({ role: 'model', infoBlock: info }));
      singleMetricInfo.forEach(info => addMessage({ role: 'model', infoBlock: info }));
      
      buyOrders.forEach(order => addMessage({ role: 'model', order }));
      sellOrders.forEach(order => addMessage({ role: 'model', order }));

    } catch (error) {
      console.error("Error sending message to AI:", error);
      addMessage({ role: 'model', text: 'Sorry, I encountered an error. Please try again.'});
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h2><Icon /> Finbot</h2>
      <div className="chat-messages" ref={chatMessagesRef}>
        <div className="message model">
          <p>Hello! I am your financial assistant. How can I help you today?</p>
        </div>
        {messages.map((msg) => {
          if (msg.order) {
            return <OrderConfirmation key={msg.id} type={msg.order.type} details={msg.order.details} onConfirm={msg.order.onConfirm} />
          }
          if (msg.infoBlock) {
            return <InfoBlock key={msg.id} content={msg.infoBlock} />
          }
          if (msg.text) {
             return (
              <div key={msg.id} className={`message ${msg.role}`}>
                {parseMessage(msg.text).map((part, i) =>
                    part.type === 'text' ? (
                      <span key={`${msg.id}-text-${i}`}>{part.content}</span>
                    ) : (
                      <div key={`${msg.id}-action-${i}`} className="action-tag">
                        {part.content}
                      </div>
                    )
                  )}
              </div>
            )
          }
          return null;
        })}
        {isLoading && <div className="message model"><p>Thinking...</p></div>}
      </div>
      <div className="chat-input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
        />
        <button className="send-btn" onClick={handleSend} disabled={isLoading}>
          Send
        </button>
      </div>
    </>
  );
};

export default Chatbot; 