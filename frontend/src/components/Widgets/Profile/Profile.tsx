import { useRef, useState } from 'react';

import { Link } from 'react-router-dom';

// hooks
import useClickOutside from '../../../hooks/useClickOutside';

// components
import Box from '../../Common/Box';

const Profile: React.FC = () => {
  const ref = useRef<any>(null);

  const [menuOpened, setMenuOpened] = useState<boolean>(false);

  useClickOutside(ref, () => setMenuOpened(false));

  /**
   * Toggles the state of the menu to open or close.
   */
  const handleMenuOpen = (): void => {
    setMenuOpened(!menuOpened);
  };

  return (
    <Box>
      <div className='box-title box-vertical-padding box-horizontal-padding no-select'>
        <div ref={ref} className='flex flex-center flex-space-between'>
          <p>My Profile</p>
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
      <div className='widget-profile box-content box-content-height-nobutton'>
        <div className='center'>
          <form className='upload no-select' noValidate>
            <input type='file' name='file' id='file' accept='.jpg, .jpeg' />
            <label htmlFor='file'>
              <div
                className='icon cover pointer'
                style={{
                  backgroundImage: `url('https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.istockphoto.com%2Fphotos%2Fuser-profile-image&psig=AOvVaw052iU_ssLhCBKYqJxNkLoK&ust=1740149994193000&source=images&cd=vfe&opi=89978449&ved=0CBEQjRxqFwoTCMiGsoTC0osDFQAAAAAdAAAAABAV')')`,
                }}
              />
              <div className='edit pointer'>
                <i className='material-icons'>edit</i>
              </div>
            </label>
          </form>
        </div>
        <div className='box-horizontal-padding'>
          <div className='center'>
            <h3>User Name</h3>
            <strong>Niki</strong>
            <p>Phone: +65 1111 1111</p>
            <Link to='/members/application'>Apply for Level 2</Link>
          </div>
        </div>
      </div>
    </Box>
  );
};

export default Profile;