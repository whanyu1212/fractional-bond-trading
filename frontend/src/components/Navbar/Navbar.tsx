import { Link } from 'react-router-dom';

// components
import NavbarButton from './NavbarButton';

const Navbar: React.FC = () => (
  <nav className='navbar-inner no-select'>
    <div className='logo'>
      <Link to='/market'>
        <img
          draggable='false'
          alt='Crypto Exchange'
          src={`${process.env.PUBLIC_URL}/images/logo.png`}
        />
      </Link>
    </div>
    <h3>Main Menu</h3>
    <ul>
      <li>
        <NavbarButton url='/dashboard' icon='dashboard' title='Deposit & Withdraw' />
      </li>
      <li>
        <NavbarButton url='/wallet' icon='account_balance_wallet' title='My Wallet' />
      </li>
      <li>
        <NavbarButton url='/transactions' icon='sync' title='Transactions' />
      </li>
      <li>
        <NavbarButton url='/trading' icon='paid' title='Trading' />
      </li>
      <li>
        <NavbarButton url='/exchange' icon='account_balance' title='Exchange' />
      </li>
      <li>
        <NavbarButton url='/capital' icon='equalizer' title='Market' />
      </li>
    </ul>
    <h3>Others</h3>
    <ul>
      <li>
        <NavbarButton url='/members' icon='account_circle' title='Profile' />
      </li>
      <li>
        <NavbarButton url='/contacts' icon='contacts' title='Contacts' />
      </li>
      <li>
        <NavbarButton url='/messages' icon='chat' title='Messages' />
      </li>
      <li>
        <NavbarButton url='/settings' icon='settings' title='Settings' />
      </li>
    </ul>
    <div className='copyright'>
      <strong>Bond Trading</strong>
      <p>
        2025 &copy; FT5004
      </p>
    </div>
  </nav>
);

export default Navbar;
