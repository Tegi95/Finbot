import React from 'react';

interface AccountBalanceProps {
  balance: number;
  buyingPower: number;
  dailyPandL: number;
}

const AccountBalance: React.FC<AccountBalanceProps> = ({ balance, buyingPower, dailyPandL }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const isPositive = dailyPandL >= 0;

  return (
    <div className="account-balance">
      <div className="balance-item">
        <span className="balance-label">Balance</span>
        <span className="balance-value">{formatCurrency(balance)}</span>
      </div>
      <div className="balance-item">
        <span className="balance-label">Buying Power</span>
        <span className="balance-value">{formatCurrency(buyingPower)}</span>
      </div>
      <div className="balance-item">
        <span className="balance-label">Day P/L</span>
        <span className="balance-value" style={{ color: isPositive ? '#26a69a' : '#ef5350' }}>
          {isPositive ? '+' : ''}{formatCurrency(dailyPandL)}
        </span>
      </div>
    </div>
  );
};

export default AccountBalance; 