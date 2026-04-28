// pages/clients/Clients.jsx
import React, { useState, useEffect } from 'react';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import useThemeStore from '../../stores/useThemeStore';
import useClientStore from '../../stores/useClientStore';
import ClientStats from './ClientStats';
import ClientTable from './ClientTable';
import './Clients.css';

const Clients = () => {
  const [nav, setNav] = useState(false);
  const { theme }     = useThemeStore();
  const { fetchStats } = useClientStore();

  useEffect(() => {
    document.title = 'Otelex | Clients';
    fetchStats();
  }, []);

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle="Clients"
          links={[
            { label: 'Dashboard', to: '/' },
            { label: 'Clients', active: true },
          ]}
        />
        <div className="clients-wrapper">
          <ClientStats />
          <ClientTable />
        </div>
      </div>
    </div>
  );
};

export default Clients;
