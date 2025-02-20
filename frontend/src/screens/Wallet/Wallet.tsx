import { useState, useEffect } from 'react';

// components
import SiteLayout from '../../layouts/SiteLayout';
import Header from '../../components/Header/Header';
import TopBar from '../../components/Tables/TopBar/TopBar';
import TransactionRow from '../../components/Tables/Transactions/TransactionRow';
import { ConnectButton } from '@rainbow-me/rainbowkit'
import{config} from '../../config'

const Wallet: React.FC = () => {
  

  useEffect(() => {

  }, []);

  return (
    <SiteLayout>
      <Header icon='sort' title='Transactions' />
      
        <h1>Wallet</h1>
        <ConnectButton />
    </SiteLayout>
  );
};

export default Wallet;
