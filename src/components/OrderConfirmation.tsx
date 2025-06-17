import React, { useState } from 'react';
import { FaCheckCircle, FaTimesCircle, FaHourglassHalf } from 'react-icons/fa';

interface OrderDetails {
  ticker: string;
  quantity: string;
  orderType: 'Limit' | 'Market';
  priceString: string;
}

interface OrderConfirmationProps {
  type: 'buy' | 'sell';
  details: OrderDetails;
  onConfirm: () => boolean;
}

const OrderConfirmation: React.FC<OrderConfirmationProps> = ({ type, details, onConfirm }) => {
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'cancelled' | 'failed'>('pending');

  const handleConfirm = () => {
    const success = onConfirm();
    if (success) {
      setStatus('confirmed');
    } else {
      setStatus('failed');
    }
  }
  const handleCancel = () => setStatus('cancelled');

  const isBuy = type === 'buy';
  const title = isBuy ? 'KAUFORDER (DEMO)' : 'VERKAUFORDER (DEMO)';
  const className = `order-confirmation ${isBuy ? 'buy' : 'sell'} ${status}`;

  const Icon = FaCheckCircle as React.ElementType;
  const IconCancel = FaTimesCircle as React.ElementType;
  const IconPending = FaHourglassHalf as React.ElementType;

  return (
    <div className={className}>
      <div className="order-header">
        <h4>{title}</h4>
        <div className="order-status-icon">
            {status === 'pending' && <IconPending />}
            {status === 'confirmed' && <Icon />}
            {status === 'cancelled' && <IconCancel />}
        </div>
      </div>
      <div className="order-details">
        <div><span>Aktie:</span> <strong>{details.ticker}</strong></div>
        <div><span>Menge:</span> <strong>{details.quantity}</strong></div>
        <div><span>Typ:</span> <strong>{details.orderType}</strong></div>
        <div><span>Preis:</span> <strong>{details.priceString}</strong></div>
      </div>
      {status === 'pending' && (
        <div className="order-actions">
          <button className="cancel-btn" onClick={handleCancel}>Abbrechen</button>
          <button className="confirm-btn" onClick={handleConfirm}>Bestätigen</button>
        </div>
      )}
       {status === 'confirmed' && <div className="status-banner confirmed">Order Bestätigt</div>}
       {status === 'cancelled' && <div className="status-banner cancelled">Order Abgebrochen</div>}
       {status === 'failed' && <div className="status-banner failed">Order Fehlgeschlagen</div>}
    </div>
  );
};

export default OrderConfirmation; 