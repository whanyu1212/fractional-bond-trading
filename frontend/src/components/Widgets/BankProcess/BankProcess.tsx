import { useState, useEffect } from 'react';

// components
import Box from '../../Common/Box';

// interfaces
interface IBankDetails {
  id: number;
  name: string;
  iban: string;
  logo: string;
  branch: string;
}

// variables
const dataArray: IBankDetails[] = [
  {
    id: 1,
    name: 'A Bank',
    branch: 'A Branch',
    iban: 'TR01 0000 0000 0000 0000 0000 01',
    logo: 'https://mekaskablo.com/wp-content/uploads/2019/11/ziraat-bankas%C4%B1-logo.jpg',
  },
  {
    id: 2,
    name: 'B Bank',
    branch: 'B Branch',
    iban: 'TR02 0000 0000 0000 0000 0000 02',
    logo: 'https://upload.wikimedia.org/wikipedia/tr/7/75/Garanti_BBVA.png',
  },
  {
    id: 3,
    name: 'C Bank',
    branch: 'C Branch',
    iban: 'TR03 0000 0000 0000 0000 0000 03',
    logo: 'data:image/png;base64,...',
  },
];

const BankProcess: React.FC = () => {
  const [tab, setTab] = useState<number>(0);
  const [bankDetails, setBankDetails] = useState<IBankDetails[]>([]);
  const [selectedBank, setSelectedBank] = useState<IBankDetails | null>(null);

  useEffect(() => {
    setBankDetails(dataArray);
    setSelectedBank(dataArray[0]);
  }, []);

  /**
   * Handles the change event for the bank selection dropdown.
   * Prevents the default event behavior, extracts the value from the target element,
   * finds the corresponding bank details based on the value, and updates the selected bank state.
   *
   * @param {React.ChangeEvent<HTMLSelectElement>} e - The change event object.
   */
  const handleViewOnChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    e.preventDefault();
    const { value } = e.target;

    const findBank = bankDetails.find((item: IBankDetails) => item.id === +value);

    if (findBank) {
      setSelectedBank(findBank);
    }
  };

  return (
    <Box>
      <div className='box-title box-vertical-padding box-horizontal-padding no-select'>
        <div className='flex flex-center flex-space-between'>
          <div>
            <p>Deposit - Withdraw</p>
          </div>
          <ul>
            <li>
              <button
                type='button'
                onClick={() => setTab(0)}
                className={tab === 0 ? 'active' : 'passive'}
              >
                Deposit
              </button>
            </li>
            <li>
              <button
                type='button'
                onClick={() => setTab(1)}
                className={tab === 1 ? 'active' : 'passive'}
              >
                Withdraw
              </button>
            </li>
          </ul>
        </div>
      </div>

      {tab === 0 && (
        <div className='box-content box-horizontal-padding box-vertical-padding box-content-height-nobutton'>
          <form className='form' noValidate>
            <div className='form-elements'>
              <div className='form-line'>
                <div className='full-width'>
                  <label htmlFor='view'>View bank details</label>
                  <select name='view' id='view' onChange={handleViewOnChange}>
                    {bankDetails &&
                      bankDetails.map((item: IBankDetails) => (
                        <option key={item.id.toString()} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          </form>

          <div className='box-text flex flex-center flex-space-between'>
            {selectedBank && (
              <>
                <div className='bank-info box-horizontal-padding'>
                  <img height='35' src={selectedBank.logo} alt='Bank logo' draggable='false' />
                  <p>
                    <strong>
                      {selectedBank.name} - {selectedBank.branch}
                    </strong>
                    <br />
                    {selectedBank.iban}
                  </p>
                </div>
                <button type='button' className='pointer red no-select'>
                  <i className='material-icons'>content_copy</i>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className='box-content box-horizontal-padding box-vertical-padding box-content-height-nobutton'>
          <form className='form' noValidate>
            <div className='form-elements'>
              <div className='form-line'>
                <div className='full-width'>
                  <label htmlFor='iban'>Add IBAN</label>
                  <input type='text' name='iban' id='iban' placeholder='Enter IBAN number' />
                </div>
              </div>
            </div>
          </form>

          <form className='form' noValidate>
            <div className='form-elements'>
              <div className='form-line'>
                <div className='full-width'>
                  <label htmlFor='view'>My registered IBANs</label>
                  <select name='view' id='view'>
                    <option value='ZB'>Ziraat Bank</option>
                  </select>
                </div>
              </div>
            </div>
          </form>

          <div className='box-text box-horizontal-padding center'>
            <p>
              <strong>TR00 0000 0000 0000 0000 0000 00</strong>
            </p>
            <p>
              <span>Amount to withdraw: </span>
              <strong>2376.00 TL</strong>
            </p>
          </div>

          <button type='button' className='button button-purple button-medium button-block'>
            Withdraw Money
          </button>
        </div>
      )}
    </Box>
  );
};

export default BankProcess;
