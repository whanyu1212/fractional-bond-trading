import { Link, useLocation } from 'react-router-dom';

const HeaderRight: React.FC = () => {
  const location = useLocation();

  return (
    <div className='header-right no-select'>
      <div className='flex flex-center'>
        <ul className='header-menu nowrap'>
          <li>
            <Link
              to='/market'
              className={location.pathname.toLowerCase().includes('/market') ? 'active' : 'passive'}
            >
              Market
            </Link>
          </li>
          <li>
            <Link
              to='/trading'
              className={location.pathname.toLowerCase().includes('/trading') ? 'active' : 'passive'}
            >
              Trading
            </Link>
          </li>
          <li>
            <Link
              to='/members'
              className={location.pathname.toLowerCase().includes('/members') ? 'active' : 'passive'}
            >
              My Account
            </Link>
          </li>
          {/* <li>
            <Link
              to='/api'
              className={location.pathname.toLowerCase().includes('/api') ? 'active' : 'passive'}
            >
              API
            </Link>
          </li> */}
        </ul>
        {/* <ul className='header-icons nowrap'>
          <li>
            <Link to='/search'>
              <i className='material-icons'>search</i>
            </Link>
          </li>
          <li>
            <Link to='/members/notifications'>
              <span className='notification-badge'>23</span>
              <i className='material-icons'>notifications</i>
            </Link>
          </li>
        </ul> */}
        <ul className='header-user nowrap'>
          <li>
            <Link to='/members'>
              <span>User Name</span>
              <span>@niki</span>
            </Link>
          </li>
          <li>
            <Link to='/members'>
              <div
                className='profile-picture cover'
                style={{
                  backgroundImage: `url('https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.istockphoto.com%2Fphotos%2Fuser-profile-image&psig=AOvVaw052iU_ssLhCBKYqJxNkLoK&ust=1740149994193000&source=images&cd=vfe&opi=89978449&ved=0CBEQjRxqFwoTCMiGsoTC0osDFQAAAAAdAAAAABAV')')`,
                }}
              />
            </Link>
          </li>
          <li className='responsive-hide'>
            <Link to='/members/signout' className='signout'>
              <i className='material-icons'>power_settings_new</i>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default HeaderRight;
