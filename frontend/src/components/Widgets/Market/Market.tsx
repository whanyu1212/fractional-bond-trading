import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// components
import Box from '../../Common/Box';
import MarketRow from './MarketRow';

// interfaces
interface ICrypto {
  id: number;
  name: string;
  icon: string;
  date: string;
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
    name: 'BTC/USD',
    icon: 'https://icons.iconarchive.com/icons/cjdowner/cryptocurrency-flat/256/Bitcoin-BTC-icon.png',
    date: 'September 2021',
    amount: '18,783.33',
    currency: 'TRY',
    change: '%45',
    lineChartData: [10, 15, 10, 15, 15, 18],
    status: 1,
  },
  {
    id: 2,
    name: 'ETH/USD',
    icon: 'https://icons.iconarchive.com/icons/cjdowner/cryptocurrency-flat/1024/Ethereum-ETH-icon.png',
    date: 'September 2021',
    amount: '3,125.25',
    currency: 'TRY',
    change: '-%30',
    lineChartData: [30, 20, 25, 35, 10, 8],
    status: 2,
  },
  {
    id: 3,
    name: 'USDT/USD',
    icon: 'https://icons.iconarchive.com/icons/cjdowner/cryptocurrency-flat/1024/Tether-USDT-icon.png',
    date: 'September 2021',
    amount: '125.12',
    currency: 'TRY',
    change: '%3',
    lineChartData: [30, 20, 25, 35, 30, 35],
    status: 1,
  },
  {
    id: 4,
    name: 'XRP/USD',
    icon: 'https://icons.iconarchive.com/icons/cjdowner/cryptocurrency-flat/1024/Ripple-XRP-icon.png',
    date: 'September 2021',
    amount: '10.05',
    currency: 'TRY',
    change: '%16',
    lineChartData: [30, 20, 25, 35, 30, 35],
    status: 1,
  },
  {
    id: 5,
    name: 'DOT/USD',
    icon: 'data:image/png;base64,...',
    date: 'September 2021',
    amount: '3.05',
    currency: 'TRY',
    change: '-%3',
    lineChartData: [30, 20, 25, 35, 20, 10],
    status: 2,
  },
  {
    id: 6,
    name: 'DOGE/USD',
    icon: 'https://www.kindpng.com/picc/m/202-2028344_dogecoin-doge-icon-metro-symbole-hd-png-download.png',
    date: 'September 2021',
    amount: '1.05',
    currency: 'TRY',
    change: '-%6',
    lineChartData: [30, 20, 25, 35, 25, 30],
    status: 2,
  },
  {
    id: 7,
    name: 'ADA/USD',
    icon: 'https://cdn4.iconfinder.com/data/icons/crypto-currency-and-coin-2/256/cardano_ada-512.png',
    date: 'September 2021',
    amount: '10.12',
    currency: 'TRY',
    change: '%6',
    lineChartData: [30, 20, 25, 35, 25, 30],
    status: 1,
  },
];

const Market: React.FC = () => {
  const [data, setData] = useState<ICrypto[]>([]);

  useEffect(() => {
    setData(dataArray);
  }, []);

  return (
    <Box>
      <div className='box-title box-vertical-padding box-horizontal-padding no-select'>
        Markets
      </div>
      <div className='box-content box-content-height'>
        {data && data.map((item) => <MarketRow key={item.id.toString()} item={item} />)}
      </div>
      <div className='box-button box-vertical-padding box-horizontal-padding'>
        <Link to='/capital' className='button button-purple button-medium button-block'>
          More
          <i className='material-icons button-icon-right'>chevron_right</i>
        </Link>
      </div>
    </Box>
  );
};

export default Market;
