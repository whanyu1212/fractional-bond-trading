import { useState, useEffect } from 'react';

// components
import SiteLayout from '../../layouts/SiteLayout';
import Header from '../../components/Header/Header';
import TopBar from '../../components/Tables/TopBar/TopBar';
import CapitalRow from '../../components/Tables/Capital/CapitalRow';

// interfaces
interface ICrypto {
  id: number;
  name: string;
  icon: string;
  symbol: string;
  weight: string;
  amount: string;
  change: string;
  status: number;
  currency: string;
  lineChartData: number[];
}

// variables
const dataArray: ICrypto[] = [
  {
    id: 1,
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: 'https://icons.iconarchive.com/icons/cjdowner/cryptocurrency-flat/256/Bitcoin-BTC-icon.png',
    amount: '18,783.33',
    currency: 'TRY',
    change: '%45',
    weight: '$220,080,878,451',
    lineChartData: [5, 10, 5, 20, 8, 15, 22, 8, 12, 8, 32, 16, 29, 20, 16, 30, 42, 45],
    status: 1,
  },
  {
    id: 2,
    name: 'Ethereum',
    symbol: 'ETH',
    icon: 'https://icons.iconarchive.com/icons/cjdowner/cryptocurrency-flat/1024/Ethereum-ETH-icon.png',
    amount: '3,125.25',
    currency: 'TRY',
    change: '-%30',
    weight: '$220,080,878',
    lineChartData: [5, 10, 5, 20, 8, 15, 22, 8, 12, 8, 32, 16, 29, 20, 16, 30, 42, 10],
    status: 2,
  },
  {
    id: 3,
    name: 'Tether',
    symbol: 'USDT',
    icon: 'https://icons.iconarchive.com/icons/cjdowner/cryptocurrency-flat/1024/Tether-USDT-icon.png',
    amount: '125.12',
    currency: 'TRY',
    change: '%3',
    weight: '$220,080',
    lineChartData: [5, 10, 5, 20, 8, 15, 22, 8, 12, 8, 32, 16, 29, 20, 16, 30, 42, 43],
    status: 1,
  },
  {
    id: 4,
    name: 'Ripple',
    symbol: 'XRP',
    icon: 'https://icons.iconarchive.com/icons/cjdowner/cryptocurrency-flat/1024/Ripple-XRP-icon.png',
    amount: '10.05',
    currency: 'TRY',
    change: '%16',
    weight: '$220,080,878',
    lineChartData: [5, 10, 5, 20, 8, 15, 22, 8, 12, 8, 32, 16, 29, 20, 16, 30, 42, 44],
    status: 1,
  },
  {
    id: 5,
    name: 'Polkadot',
    symbol: 'DOT',
    icon: 'data:image/png;base64,...',
    amount: '3.05',
    currency: 'TRY',
    change: '-%3',
    weight: '$220,080',
    lineChartData: [5, 10, 5, 20, 8, 15, 22, 8, 12, 8, 32, 16, 29, 20, 16, 30, 42, 30],
    status: 2,
  },
  {
    id: 6,
    name: 'Dogecoin',
    symbol: 'DOGE',
    icon: 'https://www.kindpng.com/picc/m/202-2028344_dogecoin-doge-icon-metro-symbole-hd-png-download.png',
    amount: '1.05',
    currency: 'TRY',
    change: '-%6',
    weight: '$220,080,878',
    lineChartData: [5, 10, 5, 20, 8, 15, 22, 8, 12, 8, 32, 16, 29, 20, 16, 30, 42, 40],
    status: 2,
  },
  {
    id: 7,
    name: 'Cardano',
    symbol: 'ADA',
    icon: 'https://cdn4.iconfinder.com/data/icons/crypto-currency-and-coin-2/256/cardano_ada-512.png',
    amount: '10.12',
    currency: 'TRY',
    change: '%6',
    weight: '$220,080',
    lineChartData: [5, 10, 5, 20, 8, 15, 22, 8, 12, 8, 32, 16, 29, 20, 16, 30, 42, 40],
    status: 1,
  },
];

const CapitalScreen: React.FC = () => {
  const [data, setData] = useState<ICrypto[]>([]);
  const [keyword, setKeyword] = useState<string>('');

  useEffect(() => {
    setData(dataArray);
  }, []);

  /**
   * Handles the search input value change.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e - The input change event.
   * @returns {void}
   */
  const handleSearchValue = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { value } = e.target;
    setKeyword(value);
  };

  /**
   * Handles the search form submission.
   *
   * @param {React.FormEvent} e - The form submission event.
   * @returns {void}
   */
  const handleSearchSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
  };

  return (
    <SiteLayout>
      <Header icon='sort' title='Market' />
      <TopBar
        searchValue={keyword}
        searchSubmit={handleSearchSubmit}
        searchOnChange={handleSearchValue}
      />

      {data && data.length > 0 && (
        <table className='data-table'>
          <thead>
            <tr>
              <th className='left'>Rank</th>
              <th className='left'>Coin</th>
              <th className='center'>Last Price</th>
              <th className='center'>Change (24h)</th>
              <th className='center responsive-hide2'>Volume (24h)</th>
              <th className='left responsive-hide'>Chart</th>
              <th aria-label='empty' className='right'>
                &nbsp;
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item: ICrypto, index: number) => (
              <CapitalRow key={item.id.toString()} item={item} index={index + 1} />
            ))}
          </tbody>
        </table>
      )}
    </SiteLayout>
  );
};

export default CapitalScreen;
