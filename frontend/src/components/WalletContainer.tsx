import { useState, useEffect } from 'react';
import { Copy, Check, RefreshCw, ExternalLink, ShieldAlert, Coins } from 'lucide-react';

const API_BASE = '/api';

interface WalletContainerProps {
  telegramId: string;
}

interface BalanceDetail {
  native: number;
  usdc: number;
}

interface WalletData {
  addresses: {
    solana: string;
    evm: string;
  };
  explorers: {
    solana: string;
    ethereum: string;
    bsc: string;
    base: string;
    polygon: string;
    arbitrum: string;
  };
  balances: {
    solana: BalanceDetail;
    ethereum: BalanceDetail;
    bsc: BalanceDetail;
    base: BalanceDetail;
    polygon: BalanceDetail;
    arbitrum: BalanceDetail;
  };
}

export default function WalletContainer({ telegramId }: WalletContainerProps) {
  const [activeTab, setActiveTab] = useState<'svm' | 'evm'>('svm');
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWalletDetails = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/wallet/balances?telegramId=${telegramId}`);
      const data = await res.json();
      if (data && data.addresses) {
        setWalletData(data);
      }
    } catch (err) {
      console.error('Failed to load wallet details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletDetails();
  }, [telegramId]);

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getActiveAddress = () => {
    if (!walletData) return '';
    return activeTab === 'svm' ? walletData.addresses.solana : walletData.addresses.evm;
  };

  const getExplorerLink = (network: string, address: string) => {
    if (!walletData) return '#';
    const baseUrl = (walletData.explorers as any)[network] || '';
    if (!baseUrl) return '#';
    
    if (network === 'solana') {
      try {
        const url = new URL(baseUrl);
        url.pathname = `/account/${address}`;
        return url.toString();
      } catch (e) {
        if (baseUrl.includes('?')) {
          const [base, query] = baseUrl.split('?');
          const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
          return `${cleanBase}/account/${address}?${query}`;
        }
        const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        return `${cleanBase}/account/${address}`;
      }
    }
    
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBase}/address/${address}`;
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
  };

  if (loading) {
    return (
      <main className="main-content wallet-main">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '15px' }}>
          <div className="loading-spinner" />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Retrieving multichain balances...</span>
        </div>
      </main>
    );
  }

  const activeAddress = getActiveAddress();

  const isTestnet = walletData
    ? Object.values(walletData.explorers).some(
        url => url && (url.includes('devnet') || url.includes('sepolia') || url.includes('testnet') || url.includes('amoy'))
      )
    : true;

  const solanaNetworkLabel = isTestnet ? 'Solana Devnet' : 'Solana';

  const getEvmNetworkLabel = (netName: string) => {
    if (!isTestnet) return netName;
    if (netName === 'Polygon') return 'Polygon Amoy';
    if (netName === 'BNB Chain') return 'BSC Testnet';
    return `${netName} Sepolia`;
  };

  const evmNetworks = [
    { key: 'ethereum', name: 'Ethereum', symbol: 'ETH', logo: 'https://etherscan.io/images/svg/brands/ethereum-original.svg' },
    { key: 'bsc', name: 'BNB Chain', symbol: 'BNB', logo: 'https://bscscan.com/assets/bsc/images/svg/logos/token-light.svg?v=26.6.2.0' },
    { key: 'base', name: 'Base', symbol: 'ETH', logo: 'https://basescan.org/assets/base/images/svg/logos/chain-light.svg?v=' },
    { key: 'polygon', name: 'Polygon', symbol: 'POL', logo: 'https://polygonscan.com/assets/poly/images/svg/logos/token-light.svg?v=26.6.2.0' },
    { key: 'arbitrum', name: 'Arbitrum', symbol: 'ETH', logo: 'https://arbiscan.io/assets/arbitrum/images/svg/logos/token-secondary-light.svg?v=' },
  ];

  return (
    <main className="main-content wallet-main">
      {/* Wallet Type Tabs */}
      <div className="target-tabs">
        <button
          className={`tab-btn ${activeTab === 'svm' ? 'active' : ''}`}
          onClick={() => setActiveTab('svm')}
        >
          <Coins size={18} />
          Solana
        </button>
        <button
          className={`tab-btn ${activeTab === 'evm' ? 'active' : ''}`}
          onClick={() => setActiveTab('evm')}
        >
          <Coins size={18} />
          Multi-Chain EVM
        </button>
      </div>

      {/* Wallet Address Display Card */}
      <div className="candidate-info-card wallet-address-card" style={{ padding: '1.25rem', marginTop: '1rem', textAlign: 'left', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span className="candidate-title-label" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary-light)' }}>
            Your {activeTab === 'svm' ? 'Solana' : 'EVM'} Address
          </span>
          <button 
            className={`refresh-balances-action-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => fetchWalletDetails(true)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
            title="Refresh balances"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        
        {activeAddress ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.4)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
              <code style={{ fontSize: '0.9rem', color: '#fff', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {truncateAddress(activeAddress)}
              </code>
              <button
                onClick={() => handleCopy(activeAddress)}
                style={{
                  background: copied ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  transition: 'all 0.2s ease'
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            
            {activeTab === 'evm' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(242,169,0,0.05)', border: '1px solid rgba(242,169,0,0.15)', borderRadius: '8px', padding: '0.75rem 0.9rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                <ShieldAlert size={16} style={{ color: '#f2a900', flexShrink: 0 }} />
                <span>This address supports Ethereum, BNB Chain, Base, Polygon, and Arbitrum. Deposits on other chains will be lost.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,135,83,0.05)', border: '1px solid rgba(0,135,83,0.15)', borderRadius: '8px', padding: '0.75rem 0.9rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                <ShieldAlert size={16} style={{ color: '#008753', flexShrink: 0 }} />
                <span>This address only supports Solana assets (SOL and Solana SPL USDC). Do not send EVM assets here.</span>
              </div>
            )}
          </div>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No address generated. Please refresh.</span>
        )}
      </div>

      {/* Balances Section Header */}
      <h3 style={{ margin: '1.5rem 0 0.75rem', fontSize: '1.05rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>Network Assets</span>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '12px' }}>
          {isTestnet ? 'Testnet' : 'Mainnet'}
        </span>
      </h3>

      {/* SVM Network balance */}
      {activeTab === 'svm' && walletData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>
          <div className="wallet-network-card" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '1.15rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img 
                  src="https://solscan.io/_next/static/media/solana-sol-logo.ecf2bf3a.svg" 
                  alt="Solana Logo" 
                  style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'contain' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>{solanaNetworkLabel}</span>
              
                </div>
              </div>
              <a 
                href={getExplorerLink('solana', walletData.addresses.solana)} 
                target="_blank" 
                rel="noreferrer" 
                style={{ color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700 }}
              >
                Explorer <ExternalLink size={12} />
              </a>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Native Balance */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>SOL</span>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>
                  {walletData.balances.solana.native.toFixed(4)} SOL
                </span>
              </div>
              {/* USDC Balance */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>USDC</span>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary-light)' }}>
                  ${walletData.balances.solana.usdc.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EVM Networks list */}
      {activeTab === 'evm' && walletData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>
          {evmNetworks.map((net) => {
            const bal = (walletData.balances as any)[net.key] || { native: 0, usdc: 0 };
            return (
              <div 
                key={net.key} 
                className="wallet-network-card" 
                style={{ 
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', 
                  border: '1px solid var(--glass-border)', 
                  borderRadius: '14px', 
                  padding: '1.15rem' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img 
                      src={net.logo} 
                      alt={`${net.name} Logo`} 
                      style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'contain' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>{getEvmNetworkLabel(net.name)}</span>

                    </div>
                  </div>
                  <a 
                    href={getExplorerLink(net.key, walletData.addresses.evm)} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    Explorer <ExternalLink size={12} />
                  </a>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Native Balance */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{net.symbol}</span>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>
                      {bal.native.toFixed(4)} {net.symbol}
                    </span>
                  </div>
                  {/* USDC Balance */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>USDC</span>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary-light)' }}>
                      ${bal.usdc.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
