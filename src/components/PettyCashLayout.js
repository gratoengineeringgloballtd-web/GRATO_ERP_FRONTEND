import React from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import NavBar from './Navbar';
import SupportSessionBanner from './SupportSessionBanner';

const { Content } = Layout;

const PettyCashLayout = () => (
  <Layout style={{ minHeight: '100vh' }}>
    <SupportSessionBanner />
    <NavBar />
    <Content style={{ padding: '24px' }}>
      <Outlet />
    </Content>
  </Layout>
);

export default PettyCashLayout;
