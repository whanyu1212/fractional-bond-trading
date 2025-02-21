// components
import Navbar from '../components/Navbar/Navbar';

// interfaces
interface IProps {
  children: React.ReactNode;
}

const SiteLayout: React.FC<IProps> = ({ children }) => (
  <div className='flex'>
    <div className='navbar full-height responsive-hide'>
      <Navbar />
    </div>
    <div className='content full-height flex-1'>{children}</div>
  </div>
);

export default SiteLayout;
