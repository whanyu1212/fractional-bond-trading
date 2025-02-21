import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// hooks
import useClickOutside from '../../../hooks/useClickOutside';

// components
import Box from '../../Common/Box';
import MyAssetsRow from './MyAssetsRow';

// interfaces
interface ICrypto {
  id: number;
  name: string;
  icon: string;
  symbol: string;
  amount: string;
  change: string;
  status: number;
  currency: string;
  changePeriod: string;
  barChartData: number[];
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
    changePeriod: 'This week',
    barChartData: [30, 20, 25, 35, 30],
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
    changePeriod: 'This week',
    barChartData: [30, 20, 25, 35, 10],
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
    changePeriod: 'This week',
    barChartData: [30, 20, 25, 35, 30],
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
    changePeriod: 'This week',
    barChartData: [30, 20, 25, 35, 30],
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
    changePeriod: 'This week',
    barChartData: [30, 20, 25, 35, 20],
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
    changePeriod: 'This week',
    barChartData: [30, 20, 25, 35, 25],
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
    changePeriod: 'This week',
    barChartData: [30, 20, 25, 35, 25],
    lineChartData: [5, 10, 5, 20, 8, 15, 22, 8, 12, 8, 32, 16, 29, 20, 16, 30, 42, 40],
    status: 1,
  },
];

const MyAssets: React.FC = () => {
  const ref = useRef<any>(null);
  const [data, setData] = useState<ICrypto[]>([]);
  const [menuOpened, setMenuOpened] = useState<boolean>(false);

  useClickOutside(ref, () => setMenuOpened(false));

  useEffect(() => {
    setData(dataArray);
  }, []);

  /**
   * Toggles the state of the menu to open or close.
   */
  const handleMenuOpen = (): void => {
    setMenuOpened(!menuOpened);
  };

  return (
    <Box>
      <div className='box-title box-vertical-padding box-horizontal-padding no-select'>
        <div className='flex flex-center flex-space-between'>
          <p>For Crypto Investors</p>
          <div ref={ref}>
            <Link to='/' type='button' className='button button-purple button-small'>
              CLICK
            </Link>
            <button type='button' className='box-icon pointer' onClick={() => handleMenuOpen()}>
              <i className='material-icons'>more_vert</i>
            </button>

            {menuOpened && (
              <div className='box-dropdown'>
                <ul>
                  <li>
                    <button type='button'>
                      <i className='material-icons'>settings</i>
                      Button 1
                    </button>
                  </li>
                  <li>
                    <button type='button'>
                      <i className='material-icons'>favorite</i>
                      Button 2
                    </button>
                  </li>
                  <li>
                    <button type='button'>
                      <i className='material-icons'>info</i>
                      Button 3
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className='box-content box-content-height-nobutton'>
        {data && data.map((item) => <MyAssetsRow key={item.id.toString()} item={item} />)}
      </div>
    </Box>
  );
};

export default MyAssets;
