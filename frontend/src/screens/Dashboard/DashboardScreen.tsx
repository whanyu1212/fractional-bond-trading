// components
import Box from '../../components/Common/Box';
import SiteLayout from '../../layouts/SiteLayout';
import Header from '../../components/Header/Header';
import BankProcess from '../../components/Widgets/BankProcess/BankProcess';
import RecentActivity from '../../components/Widgets/RecentActivity/RecentActivity';

const DashboardScreen: React.FC = () => (
  <SiteLayout>
    <Header icon='sort' title='Deposit-Withdraw' />
    <div className='flex flex-destroy flex-space-between'>
      <div className='flex-1 box-right-padding'>
        <BankProcess />
      </div>
      <div className='flex-1'>
        <Box>
          <div className='box-title box-vertical-padding box-horizontal-padding no-select'>
            <div className='flex flex-center flex-space-between'>
              <p>Important</p>
            </div>
          </div>
          <div className='box-content box-text box-horizontal-padding box-content-height-nobutton'>
            <p>
              &bull; For EFT transfers, the recipient/beneficiary field must be entered as Crypto Exchange.
            </p>
            <p>
              &bull; You can perform Wire/EFT transactions from all your personal, demand deposit, and Turkish Lira accounts opened in your name to the listed accounts. Transfers made from accounts belonging to different individuals will not be accepted.
            </p>
            <p>
              &bull; Transfers made using ATMs (with or without a card) will not be accepted, as sender information cannot be verified.
            </p>
            <p>
              &bull; The amount you send will be automatically reflected in your account after verification by the system, so there is no need for additional notification.
            </p>
            <p>
              &bull; Since you have completed your identity verification process, you do not need to enter a fixed deposit code in the description field.
            </p>
          </div>
        </Box>
      </div>
    </div>
    <div className='flex flex-destroy flex-space-between'>
      <div className='flex-1 box-right-padding'>
        <RecentActivity />
      </div>
      <div className='flex-1'>
        <Box>
          <div className='box-title box-vertical-padding box-horizontal-padding no-select'>
            <div className='flex flex-center flex-space-between'>
              <p>Important</p>
            </div>
          </div>
          <div className='box-content box-text box-horizontal-padding box-content-height-nobutton'>
            <p>
              &bull; You can withdraw funds to all your personal (demand deposit, TL) bank accounts opened in your name. Transfers to other individuals will not be processed.
            </p>
            <p>&bull; The minimum withdrawal amount is 10 TL.</p>
            <p>&bull; A transaction fee of 3 TL is charged for each withdrawal.</p>
            <p>
              &bull; When you place a withdrawal order, the amount will be deducted from your available balance.
            </p>
            <p>
              &bull; You can cancel withdrawal orders that have not yet been processed. In this case, the order amount will be added back to your available balance.
            </p>
            <p>
              &bull; Withdrawal orders placed outside of banking hours will be processed once banks resume operations.
            </p>
          </div>
        </Box>
      </div>
    </div>
  </SiteLayout>
);

export default DashboardScreen;
