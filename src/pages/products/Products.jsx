// pages/products/Products.jsx
import React, { useState, useEffect } from 'react';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import useThemeStore from '../../stores/useThemeStore';
import useProductStore from '../../stores/useProductStore';
import ProductStats from './ProductStats';
import ProductTable from './ProductTable';
import './Products.css';

const Products = () => {
  const [nav, setNav] = useState(false);
  const { theme } = useThemeStore();
  const { fetchStats, fetchCategoryOptions } = useProductStore();

  useEffect(() => {
    document.title = 'Otelex | Products';
    fetchStats();
    fetchCategoryOptions();
  }, []);

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle="Products"
          links={[
            { label: 'Dashboard', to: '/' },
            { label: 'Products', active: true },
          ]}
        />
        <div className="products-wrapper">
          <ProductStats />
          <ProductTable />
        </div>
      </div>
    </div>
  );
};

export default Products;
