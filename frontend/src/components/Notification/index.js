'use client';

import { useState } from 'react';

export default function Notification({ regionId }) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, region_id: regionId, notification_type: 'email' }),
      });
      setSubscribed(true);
    } catch (err) {
      console.error('Abonelik hatasi:', err);
    }
  };

  if (subscribed) {
    return (
      <div className="card bg-green-50 border-green-200">
        <p className="text-green-700 font-medium">Bildirim aboneligi basarili!</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-semibold mb-3">Bildirim Al</h3>
      <form onSubmit={handleSubscribe} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-posta adresiniz"
          className="input-field flex-1"
          required
        />
        <button type="submit" className="btn-primary whitespace-nowrap">
          Abone Ol
        </button>
      </form>
    </div>
  );
}
